#!/usr/bin/env node
/**
 * Build css/m3-tokens.css from design-tokens/ (Tokens Studio / W3C format).
 * Designers edit JSON via Figma Tokens Studio export — do not hand-edit the CSS output.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TOKENS_DIR = join(ROOT, "design-tokens");
const OUT_FILE = join(ROOT, "css", "m3-tokens.css");

/** @type {Map<string, { value: string, type?: string, description?: string, group: string }>} */
const registry = new Map();

function walkJson(obj, pathParts = []) {
  if (obj && typeof obj === "object" && "$value" in obj) {
    const cssName = pathParts.join("-");
    registry.set(pathParts.join("."), {
      value: String(obj.$value),
      type: obj.$type,
      description: obj.$description,
      group: pathParts[0] || "other",
      cssName,
    });
    return;
  }
  if (!obj || typeof obj !== "object") return;
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith("$")) continue;
    walkJson(val, [...pathParts, key]);
  }
}

function collectTokenFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectTokenFiles(full));
    } else if (entry.endsWith(".json") && entry !== "$metadata.json" && !entry.startsWith("._")) {
      files.push(full);
    }
  }
  return files;
}

function resolveValue(raw, depth = 0) {
  if (depth > 20) throw new Error("Token alias depth exceeded: " + raw);
  const refMatch = raw.match(/^\{(.+)\}$/);
  if (!refMatch) return raw;

  const refPath = refMatch[1];
  const entry = registry.get(refPath);
  if (!entry) throw new Error("Unknown token reference: {" + refPath + "}");
  return resolveValue(entry.value, depth + 1);
}

function cssVarValue(resolved, refPath) {
  const entry = registry.get(refPath);
  if (!entry) return resolved;

  const refMatch = entry.value.match(/^\{(.+)\}$/);
  if (refMatch) {
    const aliasName = refMatch[1].split(".").join("-");
    return "var(--" + aliasName + ")";
  }
  return resolved;
}

function groupComment(group) {
  const labels = {
    fandor: "FANDOR raw palette (oklch)",
    "md-sys": "MD3 sys tokens",
    md: "Layout",
  };
  if (group === "fandor") return labels.fandor;
  if (group.startsWith("md-sys")) return labels["md-sys"];
  return labels[group] || group;
}

function buildCss() {
  const groups = {
    fandor: [],
    "md-sys-color": [],
    "md-sys-shape": [],
    "md-sys-typography": [],
    "md-sys-motion": [],
    md: [],
  };

  for (const [path, entry] of registry.entries()) {
    const resolved = resolveValue(entry.value);
    const cssName = entry.cssName;
    let cssValue = resolved;

    if (entry.value.match(/^\{.+\}$/)) {
      cssValue = cssVarValue(resolved, path);
    }

    const line = "  --" + cssName + ": " + cssValue + ";";
    const item = { line, cssName, description: entry.description };

    if (cssName.startsWith("fandor-")) groups.fandor.push(item);
    else if (cssName.startsWith("md-sys-color-")) groups["md-sys-color"].push(item);
    else if (cssName.startsWith("md-sys-shape-")) groups["md-sys-shape"].push(item);
    else if (cssName.startsWith("md-sys-typescale-")) groups["md-sys-typography"].push(item);
    else if (cssName.startsWith("md-sys-motion-")) groups["md-sys-motion"].push(item);
    else groups.md.push(item);
  }

  const sections = [];

  sections.push("  /* " + groupComment("fandor") + " */");
  sections.push(...groups.fandor.map((i) => i.line));

  sections.push("");
  sections.push("  /* MD3 sys color roles */");
  sections.push(...groups["md-sys-color"].map((i) => i.line));

  sections.push("");
  sections.push("  /* MD3 shape */");
  sections.push(...groups["md-sys-shape"].map((i) => i.line));

  sections.push("");
  sections.push("  /* MD3 typography — Noto Sans TC (FANDOR brand font) */");
  sections.push(...groups["md-sys-typography"].map((i) => i.line));

  sections.push("");
  sections.push("  /* MD3 motion */");
  sections.push(...groups["md-sys-motion"].map((i) => i.line));

  sections.push("");
  sections.push("  /* Layout */");
  sections.push(...groups.md.map((i) => i.line));

  return (
    "/**\n" +
    " * AUTO-GENERATED — DO NOT EDIT\n" +
    " * Source: design-tokens/ (edit via Figma Tokens Studio export)\n" +
    " * Rebuild: npm run tokens:build\n" +
    " */\n" +
    ":root {\n" +
    sections.join("\n") +
    "\n}\n\n" +
    "@media (prefers-reduced-motion: reduce) {\n" +
    "  * {\n" +
    "    animation-duration: 0.01ms !important;\n" +
    "    transition-duration: 0.01ms !important;\n" +
    "  }\n" +
    "}\n"
  );
}

function exportTokenCatalog() {
  /** @type {Record<string, Array<{name:string,value:string,type?:string,description?:string}>>} */
  const catalog = {
    fandor: [],
    semantic: [],
    shape: [],
    typography: [],
    motion: [],
    layout: [],
  };

  for (const [path, entry] of registry.entries()) {
    const resolved = resolveValue(entry.value);
    let displayValue = resolved;
    if (entry.value.match(/^\{.+\}$/)) {
      displayValue = "→ {" + entry.value.slice(1, -1) + "}";
    }

    const item = {
      name: entry.cssName,
      path,
      value: displayValue,
      type: entry.type,
      description: entry.description,
    };

    if (entry.cssName.startsWith("fandor-")) catalog.fandor.push(item);
    else if (entry.cssName.startsWith("md-sys-color-")) catalog.semantic.push(item);
    else if (entry.cssName.startsWith("md-sys-shape-")) catalog.shape.push(item);
    else if (entry.cssName.startsWith("md-sys-typescale-")) catalog.typography.push(item);
    else if (entry.cssName.startsWith("md-sys-motion-")) catalog.motion.push(item);
    else catalog.layout.push(item);
  }

  const sortByName = (a, b) => a.name.localeCompare(b.name);
  Object.values(catalog).forEach((arr) => arr.sort(sortByName));

  return catalog;
}

// ── main ──
for (const file of collectTokenFiles(TOKENS_DIR)) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  walkJson(json);
}

const css = buildCss();
writeFileSync(OUT_FILE, css, "utf8");

const catalogPath = join(ROOT, "generated", "tokens.json");
mkdirSync(dirname(catalogPath), { recursive: true });
writeFileSync(catalogPath, JSON.stringify(exportTokenCatalog(), null, 2) + "\n", "utf8");

console.log("✓ css/m3-tokens.css (" + registry.size + " tokens)");
console.log("✓ generated/tokens.json");

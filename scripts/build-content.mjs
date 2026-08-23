#!/usr/bin/env node
/**
 * Build js/site-content.js from content/ YAML (Decap CMS editable).
 */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONTENT_DIR = join(ROOT, "content");
const OUT_JS = join(ROOT, "js", "site-content.js");
const OUT_JSON = join(ROOT, "generated", "site-content.json");

function readYaml(path) {
  return yaml.load(readFileSync(path, "utf8"));
}

function collectYamlFiles(dir, base = dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith("._")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectYamlFiles(full, base));
    } else if (entry.endsWith(".yml") || entry.endsWith(".yaml")) {
      const rel = full.slice(base.length + 1).replace(/\\/g, "/");
      files.push({ path: full, key: rel.replace(/\.(ya?ml)$/, "") });
    }
  }
  return files;
}

const content = { site: {}, pages: {} };

for (const file of collectYamlFiles(CONTENT_DIR)) {
  const data = readYaml(file.path);
  if (file.key.startsWith("site/")) {
    content.site[basename(file.key)] = data;
  } else if (file.key.startsWith("pages/")) {
    content.pages[basename(file.key)] = data;
  }
}

const js =
  "/**\n" +
  " * AUTO-GENERATED — DO NOT EDIT\n" +
  " * Source: content/ (edit YAML in content/, then npm run content:build)\n" +
  " * Rebuild: npm run content:build\n" +
  " */\n" +
  "window.FANDOR_CONTENT = " +
  JSON.stringify(content, null, 2) +
  ";\n";

mkdirSync(dirname(OUT_JSON), { recursive: true });
writeFileSync(OUT_JS, js, "utf8");
writeFileSync(OUT_JSON, JSON.stringify(content, null, 2) + "\n", "utf8");

console.log("✓ js/site-content.js");
console.log("✓ generated/site-content.json");

#!/usr/bin/env node
/**
 * Validates figma-config.json before /figma-sync runs.
 * Usage: node scripts/figma-sync-check.mjs [scope...|all|phase1|phase2|phase3|sync]
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const configPath = join(root, "scripts/figma-config.json");
const scope = (process.argv[2] || "all").toLowerCase();

const config = JSON.parse(readFileSync(configPath, "utf8"));
const pilotKeys = Object.keys(config.pilot ?? {}).filter(
  (k) => k !== "description" && config.pilot[k]?.label
);
const phase1 = ["tokens", "btn", "footer"];
const phase2 = ["top-app-bar", "hero"];
const phase3 = ["section-header", "feature-card", "cta-banner"];
const phase4 = ["filter-chip", "kol-carousel", "page-hero"];
const phase5 = ["join-form", "brand-history"];
const phase6 = ["article-card", "partner-categories", "partner-inquiry"];
const syncKeys = pilotKeys.filter((k) => {
  if (k.endsWith("-page")) return false;
  return Boolean(config.pilot[k]?.nodeId);
});

let targets;
if (scope === "all") targets = syncKeys;
else if (scope === "sync") targets = syncKeys;
else if (scope === "phase1") targets = phase1;
else if (scope === "phase2") targets = phase2;
else if (scope === "phase3") targets = phase3;
else if (scope === "phase4") targets = phase4;
else if (scope === "phase5") targets = phase5;
else if (scope === "phase6") targets = phase6;
else targets = [scope];

const errors = [];
const warnings = [];

if (!config.fileKey) {
  errors.push("fileKey 尚未設定 — 需先建立 Figma 檔並寫入 scripts/figma-config.json");
}
if (!config.fileUrl) {
  warnings.push("fileUrl 尚未設定 — 建議填入以便開啟 Figma");
}

for (const key of targets) {
  const entry = config.pilot?.[key];
  if (!entry) {
    errors.push(`未知的 scope: ${key}`);
    continue;
  }
  if (!entry.nodeId) {
    errors.push(`pilot.${key}.nodeId 尚未設定 (${entry.label})`);
  }
}

console.log("FANDOR Figma Sync Check");
console.log("─".repeat(40));
console.log(`Scope: ${targets.join(", ")}`);
console.log(`File:  ${config.fileName}`);
console.log(`Key:   ${config.fileKey ?? "(未設定)"}`);
console.log("");

if (warnings.length) {
  console.log("⚠ Warnings:");
  warnings.forEach((w) => console.log(`  · ${w}`));
  console.log("");
}

if (errors.length) {
  console.log("✗ Not ready:");
  errors.forEach((e) => console.log(`  · ${e}`));
  console.log("");
  console.log("Next: Figma MCP 登入 → 建立 Design System 檔 → 填入 nodeId");
  process.exit(1);
}

console.log("✓ Ready for /figma-sync");
for (const key of targets) {
  const e = config.pilot[key];
  console.log(`  ${key}: ${e.label} (${e.nodeId})`);
}

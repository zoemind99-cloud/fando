#!/usr/bin/env node
/**
 * Set fileKey / nodeIds in scripts/figma-config.json from Figma URLs.
 *
 * Usage:
 *   node scripts/figma-config-set.mjs --file "https://figma.com/design/ABC123/..."
 *   node scripts/figma-config-set.mjs --node tokens "https://figma.com/design/ABC123/...?node-id=1-2"
 *   node scripts/figma-config-set.mjs --node btn "https://..."
 *   node scripts/figma-config-set.mjs --node footer "https://..."
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, "figma-config.json");

function parseFigmaUrl(url) {
  const u = new URL(url.trim());
  const match = u.pathname.match(/\/design\/([^/]+)/);
  if (!match) throw new Error("Not a Figma design URL: " + url);
  const fileKey = match[1];
  let nodeId = u.searchParams.get("node-id");
  if (nodeId) nodeId = nodeId.replace(/-/g, ":");
  return { fileKey, nodeId, fileUrl: url.split("?")[0] };
}

const args = process.argv.slice(2);
const config = JSON.parse(readFileSync(configPath, "utf8"));

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--file" && args[i + 1]) {
    const { fileKey, fileUrl } = parseFigmaUrl(args[++i]);
    config.fileKey = fileKey;
    config.fileUrl = fileUrl;
    console.log("fileKey:", fileKey);
  } else if (args[i] === "--node" && args[i + 1] && args[i + 2]) {
    const key = args[++i];
    const { nodeId } = parseFigmaUrl(args[++i]);
    if (!config.pilot[key]) throw new Error("Unknown pilot key: " + key);
    config.pilot[key].nodeId = nodeId;
    console.log(`pilot.${key}.nodeId:`, nodeId);
  }
}

config.updatedAt = new Date().toISOString().slice(0, 10);
writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
console.log("Updated", configPath);

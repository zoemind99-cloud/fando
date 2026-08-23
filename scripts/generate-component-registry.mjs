#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, "scripts", "components-registry.json");
const OUT = join(ROOT, "generated", "components.json");

const registry = JSON.parse(readFileSync(SRC, "utf8"));
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(registry, null, 2) + "\n", "utf8");
console.log("✓ generated/components.json (" + registry.components.length + " components)");

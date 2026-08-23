import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function readGenerated(name) {
  return JSON.parse(readFileSync(join(ROOT, "generated", name), "utf8"));
}

function readJson(path) {
  return JSON.parse(readFileSync(join(ROOT, path), "utf8"));
}

function readYaml(path) {
  return yaml.load(readFileSync(join(ROOT, path), "utf8"));
}

function normalizeBlock(block) {
  if (block.type && typeof block.type === "string" && !block.hero && !block["problem-grid"]) {
    const { type, ...rest } = block;
    return { type, ...rest };
  }
  const key = Object.keys(block).find((k) => k !== "type");
  if (key && block[key] && typeof block[key] === "object") {
    const inner = block[key];
    const type = inner.type || key;
    const { type: _ignored, ...rest } = inner;
    return { type, ...rest };
  }
  return block;
}

function loadHome() {
  const home = readYaml("content/pages/home.yml");
  if (Array.isArray(home.blocks)) {
    home.blocks = home.blocks.map(normalizeBlock);
  }
  return home;
}

export function registerCommon(eleventyConfig) {
  eleventyConfig.addGlobalData("tokens", () => readGenerated("tokens.json"));
  eleventyConfig.addGlobalData("components", () => readGenerated("components.json"));
  eleventyConfig.addGlobalData("figma", () => readJson("scripts/figma-mapping.json"));
  eleventyConfig.addGlobalData("home", loadHome);

  eleventyConfig.addFilter("categoryLabel", (categories, id) => {
    const cat = categories.find((c) => c.id === id);
    return cat ? cat.label : id;
  });

  eleventyConfig.addFilter("richText", (str) => {
    if (!str) return "";
    return String(str)
      .replace(/\{accent\}(.+?)\{\/accent\}/g, '<span class="accent">$1</span>')
      .replace(/\{accent-lime\}(.+?)\{\/accent-lime\}/g, '<span class="accent-lime">$1</span>');
  });

  eleventyConfig.addFilter("btnClass", (variant) => {
    const map = {
      filled: "btn--filled",
      outlined: "btn--outlined",
      text: "btn--text",
      "on-primary": "btn--on-primary",
      "on-primary-outline": "btn--on-primary-outline",
    };
    return map[variant] || "btn--filled";
  });

  eleventyConfig.addFilter("socialIcon", (network) => {
    const icons = { instagram: "photo_camera", facebook: "public", line: "chat" };
    return icons[network] || "link";
  });
}

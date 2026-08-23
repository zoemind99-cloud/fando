import { registerCommon } from "./scripts/eleventy-shared.js";

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function (eleventyConfig) {
  registerCommon(eleventyConfig);
  return {
    dir: {
      input: "design-system-src",
      output: "design-system",
      includes: "../_includes",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}

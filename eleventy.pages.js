import { registerCommon } from "./scripts/eleventy-shared.js";

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function (eleventyConfig) {
  registerCommon(eleventyConfig);
  return {
    dir: {
      input: "pages-src",
      output: ".",
      includes: "../_includes",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}

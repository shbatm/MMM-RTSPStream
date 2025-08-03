import {defineConfig, globalIgnores} from "eslint/config";
import css from "@eslint/css";
import globals from "globals";
import {flatConfigs as importX} from "eslint-plugin-import-x";
import js from "@eslint/js";
import markdown from "@eslint/markdown";
import stylistic from "@stylistic/eslint-plugin";

export default defineConfig([
  globalIgnores(["scripts/jsmpeg.min.js"]),
  {files: ["**/*.css"], plugins: {css}, language: "css/css", extends: ["css/recommended"], rules: {"css/no-important": "off", "css/use-baseline": "off"}},
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.node,
        Log: "readonly",
        Module: "readonly"
      }
    },
    plugins: {js, stylistic},
    extends: [importX.recommended, "js/all", "stylistic/all"],
    rules: {
      "@stylistic/array-element-newline": ["error", "consistent"],
      "@stylistic/dot-location": ["error", "property"],
      "@stylistic/function-call-argument-newline": ["error", "consistent"],
      "@stylistic/indent": ["error", 2],
      "@stylistic/lines-around-comment": "off",
      "@stylistic/object-property-newline": ["error", {allowAllPropertiesOnSameLine: true}],
      "@stylistic/padded-blocks": ["error", "never"],
      "@stylistic/quote-props": ["error", "as-needed"],
      "capitalized-comments": "off",
      "consistent-this": "off",
      "id-length": "off",
      "init-declarations": "off",
      "max-lines-per-function": ["warn", 500],
      "max-statements": ["warn", 200],
      "no-inline-comments": "off",
      "no-invalid-this": "off",
      "no-magic-numbers": "off",
      "no-ternary": "off",
      "no-undefined": "off",
      "one-var": ["error", "never"],
      "sort-keys": "off"
    }
  },
  {files: ["**/*.md"], plugins: {markdown}, language: "markdown/gfm", extends: ["markdown/recommended"]}
]);

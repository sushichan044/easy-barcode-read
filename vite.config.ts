import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL("index.html", import.meta.url)),
        "shape-detection": fileURLToPath(new URL("shape-detection.html", import.meta.url)),
      },
    },
  },
  fmt: {
    ignorePatterns: ["pnpm-lock.yaml", "CHANGELOG.md", "public/vendor/opencv.js"],
    jsdoc: {
      commentLineStrategy: "multiline",
    },
    sortImports: true,
  },
  lint: {
    ignorePatterns: ["public/vendor/opencv.js"],
    jsPlugins: ["vite-plus/oxlint-plugin"],
    categories: {
      correctness: "error",
      nursery: "error",
      perf: "error",
    },
    env: {
      browser: true,
      node: true,
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    plugins: [
      // https://oxc.rs/docs/guide/usage/linter/plugins.html#supported-plugins
      // enabled by default
      "eslint",
      "typescript",
      "unicorn",
      "oxc",

      // optional
      "import",
      "node",
      "promise",
      "react",
      "vitest",
    ],
    rules: {
      "import/consistent-type-specifier-style": "error",

      "typescript/array-type": ["error", { default: "array-simple" }],
      "typescript/ban-ts-comment": "error",
      "typescript/consistent-type-assertions": "error",
      "typescript/consistent-type-imports": "error",
      "typescript/no-misused-promises": "error",
      "typescript/no-explicit-any": "error",
      "typescript/no-unnecessary-type-assertion": "error",
      "typescript/no-unnecessary-type-conversion": "error",
      "typescript/no-unsafe-call": "error",
      "typescript/non-nullable-type-assertion-style": "error",
      "typescript/switch-exhaustiveness-check": "error",
      "typescript/no-confusing-void-expression": "error",

      "node/no-path-concat": "error",

      "unicorn/custom-error-definition": "error",
      "unicorn/switch-case-braces": "error",
      "unicorn/prefer-date-now": "error",
      "unicorn/consistent-assert": "error",

      "oxc/branches-sharing-code": "error",

      "vite-plus/prefer-vite-plus-imports": "error",
    },
    overrides: [
      {
        files: ["**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        rules: {
          // Vitest fixtures require an object-destructuring first parameter; allow `({}, use) => {}`.
          "no-empty-pattern": ["error", { allowObjectPatternsAsParameters: true }],
        },
      },
    ],
  },
  test: {
    benchmark: {
      include: ["**/*.{bench,benchmark}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    },
    passWithNoTests: true,
    typecheck: {
      enabled: true,
    },
  },
});

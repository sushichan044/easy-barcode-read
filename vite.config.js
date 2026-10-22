import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: ["pnpm-lock.yaml"],
    sortImports: true,
  },
  lint: {
    categories: {
      correctness: "error",
      nursery: "error",
      perf: "error",
    },
    env: {
      browser: true,
      node: true,
    },
    plugins: ["eslint", "unicorn", "oxc", "vitest"],
    rules: {
      "unicorn/consistent-assert": "error",
      "unicorn/switch-case-braces": "error",
      "oxc/branches-sharing-code": "error",
    },
  },
  test: {
    passWithNoTests: false,
  },
});

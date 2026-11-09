import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    // 由 filesystem-routing 自动生成，格式不受我们控制
    ignorePatterns: ["**/file-routes.d.ts"],
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  run: {
    cache: { tasks: true, scripts: false },
  },
  test: {
    include: ["**/tests/*.test.ts"],
    coverage: {
      provider: "v8", // 或 "istanbul"
      reporter: ["text", "lcov"], // lcov 是给 Codecov 用的
      reportsDirectory: "./coverage",
    },
  },
});

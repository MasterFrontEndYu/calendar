import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
  pack: {
    dts: {
      generator: "tsgo",
    },
    format: ["esm", "cjs"],
  },
});

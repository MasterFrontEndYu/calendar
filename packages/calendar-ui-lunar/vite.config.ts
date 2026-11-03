import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // 测试直接跑源码，避免依赖两个包的 dist
    alias: {
      "@sanguogege/calendar": fileURLToPath(new URL("../calendar/src/index.ts", import.meta.url)),
      "@sanguogege/calendar-ui": fileURLToPath(
        new URL("../calendar-ui/src/index.ts", import.meta.url),
      ),
    },
  },
  pack: {
    dts: {
      generator: "tsgo",
    },
    format: ["esm", "cjs"],
  },
});

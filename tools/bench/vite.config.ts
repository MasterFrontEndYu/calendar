import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        local: fileURLToPath(new URL("./local.html", import.meta.url)),
        npm: fileURLToPath(new URL("./npm.html", import.meta.url)),
      },
    },
  },
});

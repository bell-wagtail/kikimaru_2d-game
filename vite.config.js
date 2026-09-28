import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  base: "./",
  publicDir: false,
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
  build: {
    outDir: "../dist",
    // The output is outside Vite's root; do not empty it implicitly.
    emptyOutDir: false,
    rolldownOptions: {
      output: { manualChunks: id => id.includes("node_modules/phaser/") ? "phaser" : undefined }
    }
  }
});

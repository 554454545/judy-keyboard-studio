import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // The lazy 3D engine is budgeted separately from the small initial UI bundle.
    chunkSizeWarningLimit: 650,
    rollupOptions: { output: { manualChunks: { three: ["three"] } } },
  },
});

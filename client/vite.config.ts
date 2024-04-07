import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteTsconfigPaths from "vite-tsconfig-paths";
import legacy from "@vitejs/plugin-legacy";
import { optimizeLodashImports } from "@optimize-lodash/rollup-plugin";

export default defineConfig({
  base: "",
  plugins: [react(), viteTsconfigPaths(), legacy()],
  server: {
    open: true,
    port: Number(process.env.PORT) || 8080,
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      plugins: [optimizeLodashImports()],
      output: {
        // Use "npx vite-bundle-visualizer" to see where these end up
        manualChunks: {
          // Split out react/react-router dependencies into their own chunk
          // (multiple small js chunks > a single big one)
          vendor: [
            "react",
            "react-router-dom",
            "react-dom",
            "@tanstack/query-core",
          ],
        },
      },
    },
  },
});

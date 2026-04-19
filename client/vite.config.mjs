/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteTsconfigPaths from "vite-tsconfig-paths";
import legacy from "@vitejs/plugin-legacy";
import { optimizeLodashImports } from "@optimize-lodash/rollup-plugin";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/",
  plugins: [
    react({
      babel: {
        plugins: ["@emotion/babel-plugin"],
      },
    }),
    viteTsconfigPaths(),
    legacy(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      manifest: false,
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallbackDenylist: [/^\/api/, /^\/widget/],
      },
    }),
  ],
  server: {
    open: !process.env.CI,
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
  test: {
    environment: "jsdom",
    setupFiles: ["./test/vitest-setup.ts"],
  },
});

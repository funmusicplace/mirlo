/// <reference types="vitest" />
import { optimizeLodashImports } from "@optimize-lodash/rollup-plugin";
import tailwindcss from "@tailwindcss/vite";
import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import viteTsconfigPaths from "vite-tsconfig-paths";

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
            "@tanstack/react-query",
            "@tanstack/query-core",
            "@emotion/react",
            "@emotion/css",
            "@emotion/styled",
          ],
          i18n: ["i18next", "react-i18next", "@transifex/i18next"],
          editor: [
            "remirror",
            "@remirror/react",
            "@remirror/core",
            "@remirror/core-utils",
          ],
          markdown: ["react-markdown", "remark-breaks", "remark-gfm"],
          player: ["hls.js", "@mirlo/react-hls-player"],
          charts: ["recharts"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/vitest-setup.ts"],
  },
});

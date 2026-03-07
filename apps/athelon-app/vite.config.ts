import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["icon-192.png", "icon-512.png", "favicon.ico"],
      manifest: {
        name: "Athelon Aviation MRO",
        short_name: "Athelon",
        description: "Aviation MRO Management Platform — Work Orders, Parts, Billing, Scheduling",
        start_url: "/dashboard",
        scope: "/",
        display: "standalone",
        background_color: "#0f172a",
        theme_color: "#2563eb",
        orientation: "any",
        categories: ["business", "productivity"],
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        shortcuts: [
          {
            name: "Work Orders",
            url: "/work-orders",
            icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Parts",
            url: "/parts",
            icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Scheduling",
            url: "/scheduling",
            icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        // Keep large vendor chunks (e.g. react-pdf) eligible for precache.
        maximumFileSizeToCacheInBytes: 3_000_000,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.convex\.cloud\/.*$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "convex-read-cache",
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 3000,
    strictPort: true,
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-router')) return 'vendor-react';
          if (id.includes('node_modules/convex')) return 'vendor-convex';
          if (id.includes('node_modules/@clerk')) return 'vendor-clerk';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'vendor-charts';
          if (id.includes('node_modules/@radix-ui') || id.includes('node_modules/radix-ui')) return 'vendor-radix';
          if (id.includes('node_modules/html5-qrcode')) return 'vendor-scanner';
        },
      },
    },
  },
});

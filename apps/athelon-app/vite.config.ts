import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
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
          if (id.includes('node_modules/@react-pdf')) return 'vendor-pdf';
        },
      },
    },
  },
});

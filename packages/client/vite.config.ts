import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { UserConfig } from "vite";

export default {
  build: {
    emptyOutDir: true,
    outDir: "../server/dist",
  },
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      // Proxy /api requests to the backend server.
      // Removes the need for CORS in development.
      "/api": "http://localhost:3000",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve("src"),
      "@components": path.resolve("src/components"),
    },
  },
} satisfies UserConfig;

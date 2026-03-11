import path from "node:path";
import { fileURLToPath } from "node:url";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

const dirname = fileURLToPath(new URL(".", import.meta.url));

const port = 31420;
export default defineConfig(async () => ({
  plugins: [
    tanstackRouter({
      routesDirectory: path.resolve(dirname, "./src/routes"),
      target: "react",
      autoCodeSplitting: true,
      routeFileIgnorePattern: "\\.css\\.ts$",
    }),
    react(),
    vanillaExtractPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: port + 1 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
}));

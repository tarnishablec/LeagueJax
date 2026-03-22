import path from "node:path";
import { fileURLToPath } from "node:url";
import swc from "@rollup/plugin-swc";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, withFilter } from "vite";

const host = process.env.TAURI_DEV_HOST;

const dirname = fileURLToPath(new URL(".", import.meta.url));

const port = 31420;
export default defineConfig(async () => ({
  plugins: [
    withFilter(
      swc({
        swc: {
          jsc: {
            parser: {
              syntax: "typescript",
              tsx: true,
              decorators: true,
            },
            transform: {
              decoratorVersion: "2022-03",
            },
          },
        },
      }),
      {
        transform: {
          id: /\.[cm]?[jt]sx?$/,
          code: "@",
        },
      },
    ),
    react(),
    vanillaExtractPlugin(),
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "large-libs",
              test: /node_modules/,
              minSize: 100000, // 100KB
              maxSize: 300000, // 300KB
              priority: 10,
            },
          ],
        },
      },
    },
  },
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

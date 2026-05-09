import path from "node:path";
import { fileURLToPath } from "node:url";
import swc from "@rollup/plugin-swc";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, withFilter } from "vite";

const host = process.env.TAURI_DEV_HOST;

const dirname = fileURLToPath(new URL(".", import.meta.url));

const port = 31420;
export default defineConfig(async ({ command }) => ({
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
      input: {
        main: path.resolve(dirname, "index.html"),
        mini: path.resolve(dirname, "mini.html"),
      },
      output: {
        codeSplitting:
          command === "serve"
            ? false
            : {
                groups: [
                  {
                    name: "vendor-react",
                    test: /node_modules[\\/](react|react-dom|scheduler)([\\/]|$)/,
                    priority: 20,
                  },
                  {
                    name: "vendor-router",
                    test: /node_modules[\\/]react-router([\\/]|$)/,
                    priority: 19,
                  },
                  {
                    name: "vendor-ui",
                    test: /node_modules[\\/](@ark-ui|@floating-ui|lucide-react)/,
                    priority: 15,
                  },
                  {
                    name: "vendor-graph",
                    test: /node_modules[\\/](@xyflow|@dagrejs)/,
                    priority: 12,
                  },
                  {
                    name: "vendor-table",
                    test: /node_modules[\\/]@tanstack/,
                    priority: 11,
                  },
                  {
                    name: "vendor-misc",
                    test: /node_modules[\\/](i18next|react-i18next|swr|remeda|zod|zustand|pino|graphology|uuid)/,
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

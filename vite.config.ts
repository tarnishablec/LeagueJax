import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import swc from "@rollup/plugin-swc";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { defineConfig, withFilter } from "vite";
import solid from "vite-plugin-solid";

const host = process.env.TAURI_DEV_HOST;

const dirname = fileURLToPath(new URL(".", import.meta.url));

const port = 31420;
const SOLID_APP_JSX_MODULE_RE = /src[\\/].*\.[cm]?[jt]sx$/;
const SOLID_DEPENDENCY_JSX_RE =
  /node_modules[\\/](?:@solidjs[\\/]router|@ark-ui[\\/]solid|lucide-solid|solid-motionone|@dschz[\\/]solid-flow)(?:[\\/].*)?\.jsx$/;
const ABOUT_PACKAGE_DEPENDENCIES = [
  "@ark-ui/solid",
  "@dschz/solid-flow",
  "@solid-primitives/i18n",
  "@solidjs/router",
  "@tauri-apps/api",
  "@thaterror/core",
  "@vanilla-extract/css",
  "i18next",
  "lucide-solid",
  "solid-js",
  "solid-motionone",
  "solid-zustand",
  "zod",
  "zustand",
] as const;
const ABOUT_PACKAGE_DEV_DEPENDENCIES = ["typescript", "vite"] as const;

function pickPackageVersions(
  source: Record<string, string | undefined> | undefined,
  keys: readonly string[],
): Record<string, string | undefined> {
  return Object.fromEntries(keys.map((key) => [key, source?.[key]]));
}

function resolveAboutPackageMetadata() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(dirname, "package.json"), "utf8"),
  ) as {
    version?: string;
    dependencies?: Record<string, string | undefined>;
    devDependencies?: Record<string, string | undefined>;
  };

  return {
    version: packageJson.version ?? "0.0.0",
    dependencies: pickPackageVersions(
      packageJson.dependencies,
      ABOUT_PACKAGE_DEPENDENCIES,
    ),
    devDependencies: pickPackageVersions(
      packageJson.devDependencies,
      ABOUT_PACKAGE_DEV_DEPENDENCIES,
    ),
  };
}

export default defineConfig(async ({ command }) => ({
  plugins: [
    solid({
      include: [SOLID_APP_JSX_MODULE_RE, SOLID_DEPENDENCY_JSX_RE],
    }),
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
          id: /^(?!.*(?:src[\\/].*\.[cm]?[jt]sx$|node_modules[\\/](?:@solidjs[\\/]router|@ark-ui[\\/]solid|lucide-solid|solid-motionone|@dschz[\\/]solid-flow)(?:[\\/].*)?\.jsx$)).*\.[cm]?[jt]sx?$/,
          code: "@",
        },
      },
    ),
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
                    name: "vendor-solid",
                    test: /node_modules[\\/](solid-js|@solidjs|@solid-primitives|solid-zustand|solid-motionone|lucide-solid)([\\/]|$)|node_modules[\\/]@ark-ui[\\/]solid|node_modules[\\/]@dschz[\\/]solid-flow/,
                    priority: 21,
                  },
                  {
                    name: "vendor-graph",
                    test: /node_modules[\\/](@dschz|@dagrejs)/,
                    priority: 12,
                  },
                  {
                    name: "vendor-table",
                    test: /node_modules[\\/]@tanstack/,
                    priority: 11,
                  },
                  {
                    name: "vendor-misc",
                    test: /node_modules[\\/](i18next|remeda|zod|pino|graphology|uuid)([\\/]|$)|node_modules[\\/]zustand[\\/](?:esm[\\/])?(vanilla|middleware)(?:[\\/.]|$)/,
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
  define: {
    __LEAGUE_JAX_ABOUT_PACKAGE_METADATA__: JSON.stringify(
      resolveAboutPackageMetadata(),
    ),
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

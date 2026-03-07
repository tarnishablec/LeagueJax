import path from "node:path";
import {fileURLToPath} from 'node:url';
import tailwindcss from "@tailwindcss/vite";
import {tanstackRouter} from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import {defineConfig} from "vite";

const host = process.env.TAURI_DEV_HOST;

const dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(async () => ({
    plugins: [
        tanstackRouter({
            routesDirectory: path.resolve(dirname, "./src/routes"),
            target: "react",
            autoCodeSplitting: true
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            "@": path.resolve(dirname, "./src"),
        },
    },
    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host ? {protocol: "ws", host, port: 1421} : undefined,
        watch: {ignored: ["**/src-tauri/**"]},
    },
}));

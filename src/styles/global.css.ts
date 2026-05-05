import { globalStyle } from "@vanilla-extract/css";
import { theme } from "./theme.css";

globalStyle(":root", {
  fontFamily:
    '"Maple UI", Inter, "Segoe UI", "HarmonyOS Sans SC", MiSans, "Noto Sans SC", "Noto Sans JP", "Microsoft YaHei UI", sans-serif',
  fontSize: 16,
  lineHeight: 1.5,
  fontWeight: 400,
  fontSynthesis: "none",
  textRendering: "optimizeLegibility",
  WebkitFontSmoothing: "antialiased",
  WebkitTextSizeAdjust: "100%",
  color: theme.color.foreground,
  background: theme.color.backdrop,
});

globalStyle("body", {
  margin: 0,
  background: "transparent",
});

globalStyle("*", {
  textBoxTrim: "trim-both",
});

/* ── Reset — minimal, just what the app needs ── */

globalStyle("*, *::before, *::after", {
  boxSizing: "border-box",
});

globalStyle('[data-platform="windows"] *::-webkit-scrollbar-button', {
  display: "none",
  width: 0,
  height: 0,
  WebkitAppearance: "none",
  background: "transparent",
});

globalStyle(
  '[data-platform="windows"] *::-webkit-scrollbar-button:single-button, [data-platform="windows"] *::-webkit-scrollbar-button:vertical:start:decrement, [data-platform="windows"] *::-webkit-scrollbar-button:vertical:end:increment, [data-platform="windows"] *::-webkit-scrollbar-button:horizontal:start:decrement, [data-platform="windows"] *::-webkit-scrollbar-button:horizontal:end:increment',
  {
    display: "none",
    width: 0,
    height: 0,
    WebkitAppearance: "none",
    background: "transparent",
  },
);

globalStyle('[data-platform="windows"] *::-webkit-scrollbar', {
  width: 8,
  height: 8,
});

globalStyle('[data-platform="windows"] *::-webkit-scrollbar-thumb', {
  border: "2px solid transparent",
  borderRadius: 999,
  background: "rgba(128, 128, 128, 0.55)",
  backgroundClip: "content-box",
});

globalStyle('[data-platform="windows"] *::-webkit-scrollbar-thumb:hover', {
  background: "rgba(128, 128, 128, 0.72)",
  backgroundClip: "content-box",
});

globalStyle('[data-platform="windows"] *::-webkit-scrollbar-track', {
  background: "transparent",
});

globalStyle('[data-platform="windows"] *::-webkit-scrollbar-corner', {
  background: "transparent",
});

globalStyle('[data-scrollbar="hidden"]', {
  scrollbarWidth: "none",
});

globalStyle('[data-scrollbar="hidden"]::-webkit-scrollbar', {
  display: "none",
});

globalStyle("button", {
  cursor: "pointer",
  border: "none",
  background: "none",
  padding: 0,
  font: "inherit",
  color: "inherit",
});

globalStyle("*", {
  userSelect: "none",
  // scrollbarGutter: "stable",
});

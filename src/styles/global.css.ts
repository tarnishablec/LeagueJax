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

globalStyle("html, body, *", {
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(0, 0, 0, 0.2) transparent",
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

globalStyle("html", {
  scrollbarColor: `#888 transparent`,
});

import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const root = style({
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: "8px",
  padding: "10px 12px",
  borderRadius: "8px",
  border: `1px solid ${theme.color.border}`,
  background: "oklch(0 0 0 / 0.14)",
});

export const title = style({
  minWidth: 0,
  fontSize: "13px",
  lineHeight: 1.35,
  color: theme.color.foreground,
});

export const button = style({
  display: "inline-grid",
  gridAutoFlow: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  minWidth: "82px",
  height: "32px",
  padding: "0 10px",
  border: "1px solid color-mix(in oklch, rgb(91 195 82) 28%, transparent)",
  borderRadius: "6px",
  color: "oklch(0.88 0.09 158)",
  background: "oklch(0.28 0.06 158 / 0.72)",
  fontSize: "13px",
  lineHeight: 1,
  cursor: "pointer",
  selectors: {
    "&:hover:not(:disabled)": {
      background: "oklch(0.34 0.08 158 / 0.84)",
      borderColor: "color-mix(in oklch, rgb(91 195 82) 44%, transparent)",
    },
    "&:active:not(:disabled)": {
      transform: "translateY(1px)",
    },
    "&:disabled": {
      cursor: "default",
      opacity: 0.55,
    },
  },
});

export const error = style({
  gridColumn: "1 / -1",
  fontSize: "12px",
  lineHeight: 1.35,
  color: theme.color.error,
});

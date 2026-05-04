import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const tableWrap = style({
  border: `1px solid ${theme.color.border}`,
  borderRadius: 10,
  overflow: "hidden",
});

export const table = style({
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
});

export const headCell = style({
  fontSize: "0.75rem",
  color: theme.color.mutedForeground,
  padding: "9px 12px",
  background: theme.color.surface,
  borderBottom: `1px solid ${theme.color.border}`,
  textAlign: "left",
  verticalAlign: "top",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const bodyCell = style({
  fontSize: "0.8125rem",
  color: theme.color.foreground,
  padding: "10px 12px",
  borderBottom: `1px solid ${theme.color.border}`,
  verticalAlign: "top",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const empty = style({
  padding: "16px 12px",
  color: theme.color.mutedForeground,
  fontSize: "0.8125rem",
});

export const monospace = style({
  fontFamily:
    'ui-monospace, "SFMono-Regular", "Cascadia Code", "Fira Code", Consolas, "Liberation Mono", Menlo, monospace',
});

export const mutedCell = style({
  color: theme.color.mutedForeground,
  textWrap: "nowrap",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
});

import { globalStyle, style } from "@vanilla-extract/css";
import { row as settingsFieldRow } from "@/components/settings-ui/SettingsFieldRow.css";
import { numberInput as settingsNumberInput } from "@/components/settings-ui/SettingsInput.css";
import { theme } from "@/styles/theme.css";

export const autoAcceptPanel = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) max-content",
  gap: "8px 12px",
  minWidth: 0,
  padding: "8px",
  borderRadius: "8px",
  background: theme.color.surface,
  border: `1px solid ${theme.color.border}`,
});

globalStyle(`${autoAcceptPanel} ${settingsFieldRow}`, {
  gridColumn: "1 / -1",
  gridTemplateColumns: "subgrid",
  minWidth: 0,
});

// Size the control from its value instead of the input's default character width.
globalStyle(`${autoAcceptPanel} ${settingsNumberInput}`, {
  fieldSizing: "content",
  width: "auto",
});

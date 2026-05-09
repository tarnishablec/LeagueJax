import { globalStyle, style } from "@vanilla-extract/css";
import { row as settingsFieldRow } from "@/components/settings-ui/SettingsFieldRow.css";
import { theme } from "@/styles/theme.css";

export const autoAcceptPanel = style({
  display: "grid",
  gap: "8px",
  padding: "8px",
  borderRadius: "8px",
  background: theme.color.surface,
  border: `1px solid ${theme.color.border}`,
});

globalStyle(`${autoAcceptPanel} ${settingsFieldRow}`, {
  gridTemplateColumns: "13rem minmax(0, 1fr)",
});

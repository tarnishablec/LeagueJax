import { style } from "@vanilla-extract/css";

export const page = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gridAutoRows: "minmax(220px, 1fr)",
  gap: 8,
  alignContent: "start",
  minHeight: 0,
  height: "100%",
  padding: "12px",
  paddingTop: 4,
  overflowX: "hidden",
  overflowY: "auto",
  scrollbarWidth: "none",
  selectors: {
    "&::-webkit-scrollbar": {
      display: "none",
    },
  },
});

export const teamGroup = style({
  minWidth: 0,
  minHeight: 0,
});

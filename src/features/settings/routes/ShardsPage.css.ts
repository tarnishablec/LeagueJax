import { style } from "@vanilla-extract/css";
import { theme } from "@/styles/theme.css";

export const shardsPage = style({
  height: "100%",
  minHeight: 0,
  overflow: "hidden",
});

export const toolbar = style({
  display: "grid",
  gridTemplateColumns: "max-content 1fr max-content",
  alignItems: "center",
  gap: 12,
});

export const segmentGroup = style({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "max-content",
  gap: 2,
  padding: 2,
  borderRadius: 6,
  background: theme.color.surface,
});

export const segment = style({
  padding: "4px 10px",
  borderRadius: 4,
  fontSize: "0.75rem",
  color: theme.color.mutedForeground,
  cursor: "pointer",
  border: "none",
  background: "none",
  selectors: {
    "&:hover": {
      color: theme.color.foreground,
    },
  },
});

export const segmentActive = style([
  segment,
  {
    color: theme.color.foreground,
    background: theme.color.surface,
    // boxShadow: `0 1px 2px oklch(0 0 0 / 0.06)`,
  },
]);

export const carouselRoot = style({
  display: "grid",
  gridTemplateRows: "auto 1fr",
  gap: 10,
  height: "100%",
  minHeight: 0,
  overflow: "hidden",
});

export const carouselItemGroup = style({
  height: "100%",
  minHeight: 0,
  scrollBehavior: "smooth",
});

export const carouselItem = style({
  height: "100%",
  minHeight: 0,
  overflow: "hidden",
});

export const carouselItemScroller = style({
  height: "100%",
  minHeight: 0,
});

export const carouselItemContent = style({
  height: "100%",
  minHeight: "100%",
});

export const tablePane = style({
  height: "100%",
  minHeight: 0,
  overflow: "scroll",
  scrollbarGutter: "stable",
});

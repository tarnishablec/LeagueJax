export const layers = {
  local: {
    raised: 1,
    floating: 2,
    scrollbar: 3,
    control: 10,
  },
  overlay: {
    dock: 30,
    dialogBackdrop: 100,
    dialog: 110,
    dropdown: 150,
    popover: 160,
    contextMenu: 170,
    tooltip: 180,
    toast: 240,
    system: 1000,
  },
} as const;

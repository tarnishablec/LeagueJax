import { createToaster } from "@ark-ui/react/toast";

export const appToaster = createToaster({
  placement: "bottom-end",
  gap: 12,
  max: 4,
  removeDelay: 180,
  offsets: {
    top: "1rem",
    right: "1rem",
    bottom: "1rem",
    left: "1rem",
  },
});

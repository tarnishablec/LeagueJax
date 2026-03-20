import { create } from "zustand";
import type { LcuInstanceInfo, LeagueClientCmdArgs } from "@/bindings/lcu.ts";

interface LcuState {
  instances: LcuInstanceInfo[];
  cmdArgsByPid: Record<number, LeagueClientCmdArgs>;
  setInstances: (instances: LcuInstanceInfo[]) => void;
}

export const useLcuStore = create<LcuState>((set) => ({
  instances: [],
  cmdArgsByPid: {},
  setInstances: (instances) =>
    set({
      instances,
      cmdArgsByPid: Object.fromEntries(
        instances.map((instance) => [instance.pid, instance.cmdArgs]),
      ),
    }),
}));

/** Selector: true when any instance is focused and ready */
export const selectIsFocused = (st: LcuState) =>
  st.instances.find((i) => i.isFocused && i.state === "ready");

/** Selector: focused instance's port, or null */
export const selectPort = (st: LcuState) => {
  const focused = st.instances.find((i) => i.isFocused);
  return focused?.port ?? null;
};

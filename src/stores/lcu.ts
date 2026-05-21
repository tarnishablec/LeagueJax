import { lcuStore, selectIsFocused, selectPort } from "./lcu-core";
import { createSolidStoreHook } from "./solid-zustand";

export type { LcuState } from "./lcu-core";
export { lcuStore, selectIsFocused, selectPort };

export const useSolidLcuStore = createSolidStoreHook(lcuStore);

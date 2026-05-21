import { createSolidStoreHook } from "./solid-zustand";
import { tabStore } from "./tabs-core";

export type { HistoryTab, HistoryTabIdentity, TabState } from "./tabs-core";
export { tabStore };

export const useSolidTabStore = createSolidStoreHook(tabStore);

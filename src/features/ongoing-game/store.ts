import { createSolidStoreHook } from "@/stores/solid-zustand";
import { ongoingGameStore } from "./store-core";

export type { OngoingGameStore, OngoingGameUiState } from "./store-core";
export { ongoingGameStore };

export const useSolidOngoingGameStore = createSolidStoreHook(ongoingGameStore);

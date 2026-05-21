import { createSolidStoreHook } from "@/stores/solid-zustand";
import {
  type MatchListViewStore,
  matchListViewStore,
} from "./match-list-view-store-core";

export type { MatchListViewStore };
export { matchListViewStore };

export const useSolidMatchListViewStore =
  createSolidStoreHook(matchListViewStore);

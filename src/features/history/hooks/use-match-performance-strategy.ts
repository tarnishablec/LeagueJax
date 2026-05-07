import { useSyncExternalStore } from "react";
import { useSettings } from "@/features/settings/context";
import { HISTORY_MVP_ACE_STRATEGY_SETTING } from "../manifest";
import {
  type MatchPerformanceStrategy,
  normalizeMatchPerformanceStrategy,
} from "../utils/match-performance-badge";

export function useMatchPerformanceStrategy(): MatchPerformanceStrategy {
  const settings = useSettings();
  return useSyncExternalStore(
    (callback) =>
      settings.subscribe(HISTORY_MVP_ACE_STRATEGY_SETTING, callback),
    () =>
      normalizeMatchPerformanceStrategy(
        settings.get(HISTORY_MVP_ACE_STRATEGY_SETTING),
      ),
    () =>
      normalizeMatchPerformanceStrategy(
        settings.get(HISTORY_MVP_ACE_STRATEGY_SETTING),
      ),
  );
}

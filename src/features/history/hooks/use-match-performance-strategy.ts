import { createSignal, onCleanup } from "solid-js";
import { useSolidSettings } from "@/features/settings/solid-context.solid";
import { HISTORY_MVP_ACE_STRATEGY_SETTING } from "../settings-ids";
import {
  type MatchPerformanceStrategy,
  normalizeMatchPerformanceStrategy,
} from "../utils/match-performance-badge";

export function useSolidMatchPerformanceStrategy() {
  const settings = useSolidSettings();
  const read = () =>
    normalizeMatchPerformanceStrategy(
      settings.get(HISTORY_MVP_ACE_STRATEGY_SETTING),
    );
  const [strategy, setStrategy] = createSignal<MatchPerformanceStrategy>(
    read(),
  );
  const unsubscribe = settings.subscribe(HISTORY_MVP_ACE_STRATEGY_SETTING, () =>
    setStrategy(read()),
  );

  onCleanup(unsubscribe);

  return strategy;
}

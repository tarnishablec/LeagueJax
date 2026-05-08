import type { OngoingGamePhase } from "@/bindings/ongoing_game";
import { useOngoingGameStore } from "../store";
import * as s from "./OngoingGameNavStatusDot.css";

function isVisibleOngoingPhase(phase: OngoingGamePhase): boolean {
  return phase === "ChampSelect" || phase === "InGame";
}

export function OngoingGameNavStatusDot() {
  const phase = useOngoingGameStore((state) => state.phase);

  if (!isVisibleOngoingPhase(phase)) {
    return null;
  }

  return <span className={s.root} aria-hidden="true" />;
}

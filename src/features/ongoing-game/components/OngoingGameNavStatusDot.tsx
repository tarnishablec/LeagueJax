/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import type { OngoingGamePhase } from "@/bindings/ongoing_game";
import { useSolidOngoingGameStore } from "../store";
import * as s from "./OngoingGameNavStatusDot.css";

function isVisibleOngoingPhase(phase: OngoingGamePhase): boolean {
  return phase === "ChampSelect" || phase === "InGame";
}

export function OngoingGameNavStatusDot(): JSX.Element {
  const phase = useSolidOngoingGameStore((state) => state.phase);

  return (
    <Show when={isVisibleOngoingPhase(phase())}>
      <span class={s.root} aria-hidden="true" />
    </Show>
  );
}

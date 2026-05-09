import type { OngoingGamePhase } from "@/bindings/ongoing_game";

export type MiniBottomPanelKind = "none" | "autoAccept" | "champSelectDodge";

export function resolveMiniBottomPanelKind(
  phase: OngoingGamePhase,
): MiniBottomPanelKind {
  switch (phase) {
    case "Matchmaking":
    case "ReadyCheck":
      return "autoAccept";
    case "ChampSelect":
      return "champSelectDodge";
    case "Idle":
    case "InGame":
      return "none";
  }
}

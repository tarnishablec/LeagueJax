import { createMemo, createSignal } from "solid-js";
import type { RawMatchSummaryParticipant } from "@/bindings/matches";
import { matchParticipantKey } from "./match-participant-display";

export type MatchParticipantEntry = {
  participant: RawMatchSummaryParticipant;
  key: string;
};

export function createMatchParticipantEntries(
  participants: readonly RawMatchSummaryParticipant[],
): MatchParticipantEntry[] {
  return participants.map((participant, index) => ({
    participant,
    key: matchParticipantKey(participant, index),
  }));
}

export function resolveMatchParticipantSelection(
  entries: readonly MatchParticipantEntry[],
  requestedKey: string,
): MatchParticipantEntry | null {
  return (
    entries.find((entry) => entry.key === requestedKey) ?? entries[0] ?? null
  );
}

export function useSolidMatchParticipantSelection(
  participants: () => readonly RawMatchSummaryParticipant[],
): {
  selectedEntry: () => MatchParticipantEntry | null;
  selectedKey: () => string;
  setSelectedKey: (key: string) => void;
} {
  const entries = createMemo(() =>
    createMatchParticipantEntries(participants()),
  );
  const [requestedKey, setRequestedKey] = createSignal(entries()[0]?.key ?? "");
  const selectedEntry = createMemo(() =>
    resolveMatchParticipantSelection(entries(), requestedKey()),
  );

  return {
    selectedEntry,
    selectedKey: () => selectedEntry()?.key ?? "",
    setSelectedKey: setRequestedKey,
  };
}

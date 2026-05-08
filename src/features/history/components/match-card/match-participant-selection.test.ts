import { describe, expect, test } from "bun:test";
import type { RawMatchSummaryParticipant } from "@/bindings/matches";
import {
  createMatchParticipantEntries,
  resolveMatchParticipantSelection,
} from "./match-participant-selection";

function participant(
  id: number | null,
  championId = 24,
): RawMatchSummaryParticipant {
  return {
    participantId: id,
    puuid: `puuid-${id ?? championId}`,
    championId,
  } as RawMatchSummaryParticipant;
}

describe("match participant selection", () => {
  test("creates stable keyed participant entries", () => {
    expect(
      createMatchParticipantEntries([
        participant(1, 24),
        participant(null, 99),
      ]),
    ).toEqual([
      {
        participant: participant(1, 24),
        key: "participant-1",
      },
      {
        participant: participant(null, 99),
        key: "participant-puuid-99-99-1",
      },
    ]);
  });

  test("selects the requested key when it exists", () => {
    const entries = createMatchParticipantEntries([
      participant(1, 24),
      participant(2, 99),
    ]);

    expect(resolveMatchParticipantSelection(entries, "participant-2")).toEqual(
      entries[1],
    );
  });

  test("falls back to the first entry when requested key is missing", () => {
    const entries = createMatchParticipantEntries([
      participant(1, 24),
      participant(2, 99),
    ]);

    expect(resolveMatchParticipantSelection(entries, "missing")).toEqual(
      entries[0],
    );
  });

  test("returns null when there are no participants", () => {
    expect(resolveMatchParticipantSelection([], "missing")).toBeNull();
  });
});

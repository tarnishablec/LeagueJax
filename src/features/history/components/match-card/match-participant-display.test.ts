import { describe, expect, test } from "bun:test";
import type { RawMatchSummaryParticipant } from "@/bindings/matches";
import {
  matchParticipantChampionName,
  matchParticipantDisplayName,
  matchParticipantKey,
} from "./match-participant-display";

function participant(
  overrides: Partial<RawMatchSummaryParticipant>,
): RawMatchSummaryParticipant {
  return {
    participantId: 7,
    puuid: "puuid-7",
    championId: 24,
    championName: "Jax",
    riotIdGameName: "Riot Name",
    summonerName: "Summoner Name",
    ...overrides,
  } as RawMatchSummaryParticipant;
}

describe("match participant display helpers", () => {
  test("resolves participant key from participant id when available", () => {
    expect(matchParticipantKey(participant({ participantId: 7 }), 0)).toBe(
      "participant-7",
    );
  });

  test("falls back to identity fields when participant id is unavailable", () => {
    expect(matchParticipantKey(participant({ participantId: null }), 3)).toBe(
      "participant-puuid-7-24-3",
    );
  });

  test("prefers riot name then summoner name then puuid for display name", () => {
    expect(matchParticipantDisplayName(participant({}))).toBe("Riot Name");
    expect(
      matchParticipantDisplayName(participant({ riotIdGameName: "" })),
    ).toBe("Summoner Name");
    expect(
      matchParticipantDisplayName(
        participant({ riotIdGameName: "", summonerName: "" }),
      ),
    ).toBe("puuid-7");
  });

  test("falls back to unknown display name and champion id label", () => {
    const value = participant({
      championName: null,
      puuid: "",
      riotIdGameName: "",
      summonerName: "",
    });

    expect(matchParticipantDisplayName(value)).toBe("Unknown");
    expect(matchParticipantChampionName(value)).toBe("#24");
  });
});

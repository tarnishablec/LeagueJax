import { describe, expect, test } from "bun:test";
import type { TFunction } from "i18next";
import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches";
import type { MatchPerformanceStrategy } from "@/features/history/utils/match-performance-badge";
import type { PlayerSlot } from "../routes/ongoing-game.types";
import {
  collectMatchPlayerCardTags,
  collectSpecialPlayerCardTags,
  getPlayerCardTagSettingItems,
  type PlayerCardMatch,
} from "./player-card-tags";

const FLASH_SPELL_ID = 4;
const IGNITE_SPELL_ID = 14;
const SMITE_SPELL_ID = 11;
const TELEPORT_SPELL_ID = 12;

const t = ((key: string) => key) as TFunction;

function slot(spell1Id: number, spell2Id: number): PlayerSlot {
  return {
    spell1Id,
    spell2Id,
  } as PlayerSlot;
}

function match(
  spell1Id: number | null,
  spell2Id: number | null,
): PlayerCardMatch {
  return {
    me: {
      spell1Id,
      spell2Id,
    },
  } as RawMatchSummaryGame & PlayerCardMatch;
}

function performanceParticipant(
  id: number,
  overrides: Partial<RawMatchSummaryParticipant>,
): RawMatchSummaryParticipant {
  return {
    participantId: id,
    puuid: `puuid-${id}`,
    teamId: 100,
    championId: id,
    kills: 0,
    deaths: 0,
    assists: 0,
    win: true,
    totalDamageDealtToChampions: 0,
    totalDamageTaken: 0,
    damageSelfMitigated: 0,
    goldEarned: 0,
    totalMinionsKilled: 0,
    neutralMinionsKilled: 0,
    visionScore: 0,
    totalHealsOnTeammates: 0,
    totalDamageShieldedOnTeammates: 0,
    totalTimeCcDealt: 0,
    damageDealtToBuildings: 0,
    damageDealtToObjectives: 0,
    damageDealtToTurrets: 0,
    objectivesStolen: 0,
    challenges: null,
    ...overrides,
  } as RawMatchSummaryParticipant;
}

function performanceMatch(
  meOverrides: Partial<RawMatchSummaryParticipant>,
  teammates: RawMatchSummaryParticipant[] = [],
): PlayerCardMatch {
  const me = performanceParticipant(1, meOverrides);
  const participants = [me, ...teammates];

  return {
    me,
    json: {
      participants,
      teams: [],
      mapId: 11,
      queueId: 420,
      gameMode: "CLASSIC",
      gameModeMutators: [],
      endOfGameResult: "GameComplete",
    },
  } as unknown as PlayerCardMatch;
}

function hasOffFlashPositionTag(
  currentSlot: PlayerSlot,
  recentGames: PlayerCardMatch[],
): boolean {
  return collectSpecialPlayerCardTags({
    colors: {},
    enabledIds: ["offFlashPosition"],
    hasHiddenCareer: false,
    isSelf: false,
    recentGames,
    slot: currentSlot,
    t,
    wasEncountered: false,
  }).some((tag) => tag.id === "offFlashPosition");
}

function hasHiddenCareerTag(hasHiddenCareer: boolean): boolean {
  return collectSpecialPlayerCardTags({
    colors: {},
    enabledIds: ["hiddenCareer"],
    hasHiddenCareer,
    isSelf: false,
    recentGames: [],
    slot: slot(FLASH_SPELL_ID, IGNITE_SPELL_ID),
    t,
    wasEncountered: false,
  }).some((tag) => tag.id === "hiddenCareer");
}

function hasExcellentTag(
  recentGames: PlayerCardMatch[],
  strategy: MatchPerformanceStrategy,
): boolean {
  return collectMatchPlayerCardTags(
    recentGames,
    ["excellent"],
    {},
    slot(FLASH_SPELL_ID, IGNITE_SPELL_ID),
    strategy,
    t,
  ).some((tag) => tag.id === "excellent");
}

describe("collectSpecialPlayerCardTags", () => {
  test("does not mark off-flash when the historical majority matches the current slot", () => {
    expect(
      hasOffFlashPositionTag(slot(FLASH_SPELL_ID, IGNITE_SPELL_ID), [
        match(TELEPORT_SPELL_ID, FLASH_SPELL_ID),
        match(FLASH_SPELL_ID, IGNITE_SPELL_ID),
        match(FLASH_SPELL_ID, SMITE_SPELL_ID),
      ]),
    ).toBe(false);
  });

  test("marks off-flash when the current slot differs from the historical majority", () => {
    expect(
      hasOffFlashPositionTag(slot(FLASH_SPELL_ID, IGNITE_SPELL_ID), [
        match(TELEPORT_SPELL_ID, FLASH_SPELL_ID),
        match(SMITE_SPELL_ID, FLASH_SPELL_ID),
        match(FLASH_SPELL_ID, IGNITE_SPELL_ID),
      ]),
    ).toBe(true);
  });

  test("does not mark off-flash when historical flash slots are tied", () => {
    expect(
      hasOffFlashPositionTag(slot(FLASH_SPELL_ID, IGNITE_SPELL_ID), [
        match(TELEPORT_SPELL_ID, FLASH_SPELL_ID),
        match(FLASH_SPELL_ID, SMITE_SPELL_ID),
      ]),
    ).toBe(false);
  });

  test("does not mark off-flash when history has no flash", () => {
    expect(
      hasOffFlashPositionTag(slot(FLASH_SPELL_ID, IGNITE_SPELL_ID), [
        match(TELEPORT_SPELL_ID, IGNITE_SPELL_ID),
        match(SMITE_SPELL_ID, IGNITE_SPELL_ID),
      ]),
    ).toBe(false);
  });

  test("does not mark off-flash when current slot has no flash", () => {
    expect(
      hasOffFlashPositionTag(slot(TELEPORT_SPELL_ID, IGNITE_SPELL_ID), [
        match(TELEPORT_SPELL_ID, FLASH_SPELL_ID),
        match(SMITE_SPELL_ID, FLASH_SPELL_ID),
      ]),
    ).toBe(false);
  });

  test("marks hidden career when the summoner profile is private", () => {
    expect(hasHiddenCareerTag(true)).toBe(true);
  });

  test("does not mark hidden career for public summoner profiles", () => {
    expect(hasHiddenCareerTag(false)).toBe(false);
  });
});

describe("collectMatchPlayerCardTags", () => {
  test("marks excellent under kda strategy when average KDA reaches the built-in threshold", () => {
    expect(
      hasExcellentTag(
        [
          performanceMatch({ kills: 7, deaths: 1, assists: 4 }),
          performanceMatch({ kills: 5, deaths: 1, assists: 4 }),
          performanceMatch({ kills: 3, deaths: 1, assists: 6 }),
        ],
        "kda",
      ),
    ).toBe(true);
  });

  test("does not mark excellent under kda strategy when average KDA is below the built-in threshold", () => {
    expect(
      hasExcellentTag(
        [
          performanceMatch({ kills: 2, deaths: 4, assists: 8 }),
          performanceMatch({ kills: 3, deaths: 5, assists: 6 }),
          performanceMatch({ kills: 1, deaths: 3, assists: 7 }),
        ],
        "kda",
      ),
    ).toBe(false);
  });

  test("marks excellent under balanced strategy for repeated high-contribution support games with lower KDA", () => {
    const supportCarry = performanceParticipant(2, {
      kills: 13,
      deaths: 2,
      assists: 5,
      totalDamageDealtToChampions: 33_000,
      totalDamageTaken: 12_000,
      damageSelfMitigated: 4_000,
      goldEarned: 16_400,
      totalMinionsKilled: 236,
      neutralMinionsKilled: 12,
      visionScore: 18,
      totalTimeCcDealt: 14,
      damageDealtToBuildings: 2_600,
      damageDealtToObjectives: 1_200,
      challenges: {
        killParticipation: 0.64,
        teamDamagePercentage: 0.55,
      } as RawMatchSummaryParticipant["challenges"],
    });

    expect(
      hasExcellentTag(
        [
          performanceMatch(
            {
              kills: 5,
              deaths: 5,
              assists: 23,
              totalDamageDealtToChampions: 10_000,
              totalDamageTaken: 24_000,
              damageSelfMitigated: 18_000,
              goldEarned: 10_200,
              totalMinionsKilled: 32,
              neutralMinionsKilled: 0,
              visionScore: 86,
              totalHealsOnTeammates: 7_200,
              totalDamageShieldedOnTeammates: 5_400,
              totalTimeCcDealt: 72,
              damageDealtToBuildings: 1_400,
              damageDealtToObjectives: 2_500,
              challenges: {
                killParticipation: 0.86,
                controlWardsPlaced: 8,
                stealthWardsPlaced: 28,
                teamDamagePercentage: 0.18,
              } as RawMatchSummaryParticipant["challenges"],
            },
            [supportCarry],
          ),
          performanceMatch(
            {
              kills: 5,
              deaths: 5,
              assists: 24,
              totalDamageDealtToChampions: 12_000,
              totalDamageTaken: 25_500,
              damageSelfMitigated: 20_000,
              goldEarned: 10_800,
              totalMinionsKilled: 36,
              visionScore: 91,
              totalHealsOnTeammates: 8_000,
              totalDamageShieldedOnTeammates: 5_700,
              totalTimeCcDealt: 81,
              damageDealtToBuildings: 1_700,
              damageDealtToObjectives: 2_900,
              challenges: {
                killParticipation: 0.88,
                controlWardsPlaced: 9,
                stealthWardsPlaced: 31,
                teamDamagePercentage: 0.2,
              } as RawMatchSummaryParticipant["challenges"],
            },
            [supportCarry],
          ),
          performanceMatch(
            {
              kills: 4,
              deaths: 4,
              assists: 21,
              totalDamageDealtToChampions: 11_000,
              totalDamageTaken: 23_000,
              damageSelfMitigated: 17_500,
              goldEarned: 9_900,
              totalMinionsKilled: 29,
              visionScore: 82,
              totalHealsOnTeammates: 7_600,
              totalDamageShieldedOnTeammates: 5_100,
              totalTimeCcDealt: 70,
              damageDealtToBuildings: 1_300,
              damageDealtToObjectives: 2_400,
              challenges: {
                killParticipation: 0.83,
                controlWardsPlaced: 7,
                stealthWardsPlaced: 27,
                teamDamagePercentage: 0.19,
              } as RawMatchSummaryParticipant["challenges"],
            },
            [supportCarry],
          ),
        ],
        "balanced",
      ),
    ).toBe(true);
  });

  test("does not mark excellent under balanced strategy from a single high-contribution game", () => {
    expect(
      hasExcellentTag(
        [
          performanceMatch({
            kills: 1,
            deaths: 5,
            assists: 23,
            totalDamageDealtToChampions: 10_000,
            totalDamageTaken: 24_000,
            damageSelfMitigated: 18_000,
            goldEarned: 10_200,
            totalMinionsKilled: 32,
            visionScore: 86,
            totalHealsOnTeammates: 7_200,
            totalDamageShieldedOnTeammates: 5_400,
            totalTimeCcDealt: 72,
            challenges: {
              killParticipation: 0.86,
              controlWardsPlaced: 8,
              stealthWardsPlaced: 28,
              teamDamagePercentage: 0.18,
            } as RawMatchSummaryParticipant["challenges"],
          }),
        ],
        "balanced",
      ),
    ).toBe(false);
  });

  test("does not mark excellent under balanced strategy when MVP or ACE rate is below sixty percent", () => {
    const strongerTeammate = performanceParticipant(2, {
      kills: 6,
      deaths: 1,
      assists: 2,
      totalDamageDealtToChampions: 12_000,
      goldEarned: 8_000,
    });

    expect(
      hasExcellentTag(
        [
          performanceMatch({ kills: 1, deaths: 1 }),
          performanceMatch({ kills: 1, deaths: 1 }, [strongerTeammate]),
          performanceMatch({ kills: 1, deaths: 1 }, [strongerTeammate]),
          performanceMatch({ kills: 1, deaths: 1 }, [strongerTeammate]),
        ],
        "balanced",
      ),
    ).toBe(false);
  });

  test("marks excellent under balanced strategy when MVP or ACE rate reaches sixty percent without a negative kill-death record", () => {
    expect(
      hasExcellentTag(
        [
          performanceMatch({ kills: 1, deaths: 1 }),
          performanceMatch({ kills: 1, deaths: 1 }),
          performanceMatch({ kills: 1, deaths: 1 }),
          performanceMatch({ kills: 1, deaths: 1 }, [
            performanceParticipant(2, {
              kills: 6,
              deaths: 1,
              assists: 2,
              totalDamageDealtToChampions: 12_000,
              goldEarned: 8_000,
            }),
          ]),
          performanceMatch({ kills: 1, deaths: 1 }, [
            performanceParticipant(2, {
              kills: 6,
              deaths: 1,
              assists: 2,
              totalDamageDealtToChampions: 12_000,
              goldEarned: 8_000,
            }),
          ]),
        ],
        "balanced",
      ),
    ).toBe(true);
  });

  test("does not mark excellent under balanced strategy from repeated MVP or ACE games with a negative kill-death record", () => {
    expect(
      hasExcellentTag(
        [
          performanceMatch({ kills: 1, deaths: 2 }),
          performanceMatch({ kills: 1, deaths: 2 }),
          performanceMatch({ kills: 1, deaths: 2 }),
          performanceMatch({ kills: 1, deaths: 2 }),
          performanceMatch({ kills: 1, deaths: 2 }),
        ],
        "balanced",
      ),
    ).toBe(false);
  });
});

describe("getPlayerCardTagSettingItems", () => {
  test("exposes an excellent mark hint key for the custom settings row", () => {
    const excellent = getPlayerCardTagSettingItems(t).find(
      (item) => item.id === "excellent",
    );

    expect(excellent?.hintKey).toBe(
      "settings.ongoing.playerCardTags.items.excellent.hint",
    );
  });
});

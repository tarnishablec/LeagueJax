import { describe, expect, test } from "bun:test";
import type { TFunction } from "i18next";
import type { RawMatchSummaryGame } from "@/bindings/matches";
import type { PlayerSlot } from "../routes/ongoing-game.types";
import {
  collectSpecialPlayerCardTags,
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

function hasOffFlashPositionTag(
  currentSlot: PlayerSlot,
  recentGames: PlayerCardMatch[],
): boolean {
  return collectSpecialPlayerCardTags({
    colors: {},
    enabledIds: ["offFlashPosition"],
    hasHistoryLoadFailed: false,
    isSelf: false,
    recentGames,
    slot: currentSlot,
    t,
    wasEncountered: false,
  }).some((tag) => tag.id === "offFlashPosition");
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
});

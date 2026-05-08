import { describe, expect, test } from "bun:test";
import type {
  RawMatchDetailsEvent,
  RawMatchDetailsGame,
} from "@/bindings/matches";
import { resolveParticipantBuildTimeline } from "./match-build-timeline";

type MatchBuildEventInput = Partial<RawMatchDetailsEvent> & {
  skillSlot?: number | null;
};

function event(overrides: MatchBuildEventInput): RawMatchDetailsEvent {
  return {
    type: null,
    timestamp: null,
    participantId: null,
    itemId: null,
    beforeId: null,
    afterId: null,
    skillSlot: null,
    ...overrides,
  };
}

function details(frames: MatchBuildEventInput[][]): RawMatchDetailsGame {
  return {
    json: {
      gameId: 1,
      frames: frames.map((frame, frameIndex) => ({
        timestamp: frameIndex * 60_000,
        events: frame.map(event),
      })),
    },
    metadata: {},
  } as RawMatchDetailsGame;
}

describe("resolveParticipantBuildTimeline", () => {
  test("extracts skill level-up order and item purchases for one participant", () => {
    const timeline = resolveParticipantBuildTimeline(
      details([
        [
          {
            type: "ITEM_PURCHASED",
            participantId: 1,
            itemId: 1055,
            timestamp: 31_000,
          },
          {
            type: "SKILL_LEVEL_UP",
            participantId: 1,
            skillSlot: 1,
            timestamp: 62_000,
          },
        ],
        [
          {
            type: "SKILL_LEVEL_UP",
            participantId: 2,
            skillSlot: 4,
            timestamp: 70_000,
          },
          {
            type: "ITEM_PURCHASED",
            participantId: 1,
            itemId: 2003,
            timestamp: 90_000,
          },
          {
            type: "SKILL_LEVEL_UP",
            participantId: 1,
            skillSlot: 2,
            timestamp: 130_000,
          },
        ],
      ]),
      1,
    );

    expect(timeline.skillOrder).toEqual([
      {
        level: 1,
        skillKey: "Q",
        skillSlot: 1,
        timeLabel: "01:02",
        timestamp: 62_000,
      },
      {
        level: 2,
        skillKey: "W",
        skillSlot: 2,
        timeLabel: "02:10",
        timestamp: 130_000,
      },
    ]);
    expect(timeline.itemPurchases).toEqual([
      {
        itemId: 1055,
        timeLabel: "00:31",
        timestamp: 31_000,
      },
      {
        itemId: 2003,
        timeLabel: "01:30",
        timestamp: 90_000,
      },
    ]);
  });

  test("removes the most recent matching purchase when a purchase is undone", () => {
    const timeline = resolveParticipantBuildTimeline(
      details([
        [
          {
            type: "ITEM_PURCHASED",
            participantId: 1,
            itemId: 1001,
            timestamp: 24_000,
          },
          {
            type: "ITEM_PURCHASED",
            participantId: 1,
            itemId: 1001,
            timestamp: 30_000,
          },
          {
            type: "ITEM_UNDO",
            participantId: 1,
            beforeId: 1001,
            afterId: 0,
            timestamp: 32_000,
          },
          {
            type: "ITEM_PURCHASED",
            participantId: 1,
            itemId: 2003,
            timestamp: 60_000,
          },
        ],
      ]),
      1,
    );

    expect(timeline.itemPurchases).toEqual([
      {
        itemId: 1001,
        timeLabel: "00:24",
        timestamp: 24_000,
      },
      {
        itemId: 2003,
        timeLabel: "01:00",
        timestamp: 60_000,
      },
    ]);
  });
});

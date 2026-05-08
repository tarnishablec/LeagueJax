import type {
  RawMatchDetailsEvent,
  RawMatchDetailsGame,
} from "@/bindings/matches";

export type MatchBuildSkillKey = "Q" | "W" | "E" | "R";

export type MatchBuildSkillStep = {
  level: number;
  skillKey: MatchBuildSkillKey;
  skillSlot: number;
  timeLabel: string;
  timestamp: number | null;
};

export type MatchBuildItemPurchase = {
  itemId: number;
  timeLabel: string;
  timestamp: number | null;
};

export type MatchBuildTimeline = {
  skillOrder: MatchBuildSkillStep[];
  itemPurchases: MatchBuildItemPurchase[];
};

const SKILL_KEY_BY_SLOT: Record<number, MatchBuildSkillKey> = {
  1: "Q",
  2: "W",
  3: "E",
  4: "R",
};

function isPositiveNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function skillKeyFromSlot(
  skillSlot: number | null | undefined,
): MatchBuildSkillKey | null {
  if (!isPositiveNumber(skillSlot)) {
    return null;
  }

  return SKILL_KEY_BY_SLOT[skillSlot] ?? null;
}

function formatTimelineTimestamp(timestamp: number | null | undefined): string {
  if (
    timestamp === null ||
    timestamp === undefined ||
    !Number.isFinite(timestamp)
  ) {
    return "--:--";
  }

  const totalSeconds = Math.max(0, Math.floor(timestamp / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function appendSkillStep(
  skillOrder: MatchBuildSkillStep[],
  event: RawMatchDetailsEvent,
): void {
  const skillKey = skillKeyFromSlot(event.skillSlot);
  if (!skillKey) {
    return;
  }

  skillOrder.push({
    level: skillOrder.length + 1,
    skillKey,
    skillSlot: event.skillSlot ?? 0,
    timeLabel: formatTimelineTimestamp(event.timestamp),
    timestamp: event.timestamp,
  });
}

function appendItemPurchase(
  itemPurchases: MatchBuildItemPurchase[],
  event: RawMatchDetailsEvent,
): void {
  if (!isPositiveNumber(event.itemId)) {
    return;
  }

  itemPurchases.push({
    itemId: event.itemId,
    timeLabel: formatTimelineTimestamp(event.timestamp),
    timestamp: event.timestamp,
  });
}

function undoItemPurchase(
  itemPurchases: MatchBuildItemPurchase[],
  event: RawMatchDetailsEvent,
): void {
  if (!isPositiveNumber(event.beforeId) || isPositiveNumber(event.afterId)) {
    return;
  }

  const removedIndex = itemPurchases.findLastIndex(
    (purchase) => purchase.itemId === event.beforeId,
  );
  if (removedIndex >= 0) {
    itemPurchases.splice(removedIndex, 1);
  }
}

function applyBuildEvent(
  timeline: MatchBuildTimeline,
  event: RawMatchDetailsEvent,
): void {
  switch (event.type) {
    case "SKILL_LEVEL_UP":
      appendSkillStep(timeline.skillOrder, event);
      break;
    case "ITEM_PURCHASED":
      appendItemPurchase(timeline.itemPurchases, event);
      break;
    case "ITEM_UNDO":
      undoItemPurchase(timeline.itemPurchases, event);
      break;
  }
}

export function resolveParticipantBuildTimeline(
  details: RawMatchDetailsGame | undefined,
  participantId: number | null | undefined,
): MatchBuildTimeline {
  const timeline: MatchBuildTimeline = {
    skillOrder: [],
    itemPurchases: [],
  };

  if (!details || participantId === null || participantId === undefined) {
    return timeline;
  }

  for (const frame of details.json.frames) {
    for (const event of frame.events) {
      if (event.participantId !== participantId) {
        continue;
      }

      applyBuildEvent(timeline, event);
    }
  }

  return timeline;
}

import type {
  RawMatchDetailsEvent,
  RawMatchDetailsGame,
} from "@/bindings/matches.ts";

const JUNGLE_EGG_ITEM_IDS = new Set([1101, 1102, 1103]);

type JungleEggState = {
  activeItemId: number | null;
  lastKnownItemId: number | null;
};

function isJungleEggItemId(value: number | null | undefined): value is number {
  return (
    value !== null && value !== undefined && JUNGLE_EGG_ITEM_IDS.has(value)
  );
}

function rememberJungleEgg(state: JungleEggState, itemId: number): void {
  state.activeItemId = itemId;
  state.lastKnownItemId = itemId;
}

function applyPurchasedItem(
  state: JungleEggState,
  event: RawMatchDetailsEvent,
): void {
  if (isJungleEggItemId(event.itemId)) {
    rememberJungleEgg(state, event.itemId);
  }
}

function applyRemovedItem(
  state: JungleEggState,
  event: RawMatchDetailsEvent,
): void {
  if (isJungleEggItemId(event.itemId)) {
    state.activeItemId = null;
  }
}

function applyUndoItem(
  state: JungleEggState,
  event: RawMatchDetailsEvent,
): void {
  if (isJungleEggItemId(event.afterId)) {
    rememberJungleEgg(state, event.afterId);
    return;
  }

  if (isJungleEggItemId(event.beforeId)) {
    state.activeItemId = null;
  }
}

function applyJungleEggEvent(
  state: JungleEggState,
  event: RawMatchDetailsEvent,
): void {
  switch (event.type) {
    case "ITEM_PURCHASED":
      applyPurchasedItem(state, event);
      break;
    case "ITEM_SOLD":
    case "ITEM_DESTROYED":
      applyRemovedItem(state, event);
      break;
    case "ITEM_UNDO":
      applyUndoItem(state, event);
      break;
  }
}

export function resolveJungleEggItemIdFromDetails(
  details: RawMatchDetailsGame | undefined,
  participantId: number | null | undefined,
): number | null {
  if (!details || participantId === null || participantId === undefined) {
    return null;
  }

  const state: JungleEggState = {
    activeItemId: null,
    lastKnownItemId: null,
  };

  for (const frame of details.json.frames) {
    for (const event of frame.events) {
      if (event.participantId !== participantId) {
        continue;
      }

      applyJungleEggEvent(state, event);
    }
  }

  return state.activeItemId ?? state.lastKnownItemId;
}

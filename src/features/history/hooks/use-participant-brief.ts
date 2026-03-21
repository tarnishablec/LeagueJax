import type { RawMatchSummaryParticipant } from "@/bindings/matches.ts";

export const useParticipantBrief = (
  participant: RawMatchSummaryParticipant,
) => {
  const items = [
    participant.item0,
    participant.item1,
    participant.item2,
    participant.item3,
    participant.item4,
    participant.item5,
    participant.item6,
  ] as const;

  const augments = [
    participant.playerAugment1,
    participant.playerAugment2,
    participant.playerAugment3,
    participant.playerAugment4,
    participant.playerAugment5,
    participant.playerAugment6,
  ] as const;

  const outcome = participant.gameEndedInEarlySurrender
    ? "remake"
    : participant.win
      ? "victory"
      : "defeat";

  return { items, augments, outcome } as const;
};

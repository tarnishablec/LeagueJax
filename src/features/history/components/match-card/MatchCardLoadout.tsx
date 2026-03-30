import type { RawMatchSummaryParticipant } from "@/bindings/matches.ts";
import { LeaguePositionIcon } from "@/components/league-position/LeaguePositionIcon";
import * as s from "./MatchCard.css";
import { MatchCardAugments } from "./MatchCardAugments";
import { MatchCardItems } from "./MatchCardItems";
import { MatchCardRunes } from "./MatchCardRunes";
import { MatchCardSpells } from "./MatchCardSpells";

export function MatchCardLoadout({
  position,
  me,
  hasAugments,
  augments,
  primaryRuneId,
  subStyleId,
  gameId,
  items,
}: {
  position: string | null;
  me: RawMatchSummaryParticipant;
  hasAugments: boolean;
  augments: readonly [
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
  ];
  primaryRuneId: number;
  subStyleId: number;
  gameId: number;
  items: readonly [
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
  ];
}) {
  return (
    <div className={s.loadoutRow}>
      {position ? (
        <div className={s.positionSlot}>
          <LeaguePositionIcon position={position} width={23} height={23} />
        </div>
      ) : null}
      <MatchCardSpells
        spell1Id={me.spell1Id ?? 0}
        spell2Id={me.spell2Id ?? 0}
      />
      {hasAugments ? (
        <MatchCardAugments augmentIds={augments} />
      ) : (
        <MatchCardRunes
          perkPrimaryRuneId={primaryRuneId}
          perkSubStyleId={subStyleId}
        />
      )}
      <MatchCardItems gameId={gameId} items={items} />
    </div>
  );
}

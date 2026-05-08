import { ToggleGroup } from "@ark-ui/react/toggle-group";
import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches";
import { ChampionAvatar } from "@/components/champion-avatar/ChampionAvatar";
import * as s from "./MatchParticipantPicker.css";
import {
  matchParticipantChampionName,
  matchParticipantDisplayName,
  matchParticipantKey,
  matchParticipantTeamTone,
} from "./match-participant-display";

export function MatchParticipantPicker({
  summary,
  participants,
  selectedKey,
  onSelectedKeyChange,
  ariaLabel,
  actionLabel,
}: {
  summary: RawMatchSummaryGame;
  participants: RawMatchSummaryParticipant[];
  selectedKey: string;
  onSelectedKeyChange: (value: string) => void;
  ariaLabel: string;
  actionLabel: (displayName: string) => string;
}) {
  return (
    <ToggleGroup.Root
      className={s.participantPicker}
      value={selectedKey ? [selectedKey] : []}
      deselectable={false}
      onValueChange={({ value }) => {
        if (value[0]) {
          onSelectedKeyChange(value[0]);
        }
      }}
      aria-label={ariaLabel}
    >
      {participants.map((participant, index) => {
        const key = matchParticipantKey(participant, index);
        const championName = matchParticipantChampionName(participant);
        const displayName = matchParticipantDisplayName(participant);

        return (
          <ToggleGroup.Item
            key={key}
            value={key}
            className={s.participantTrigger({
              team: matchParticipantTeamTone(participant, summary),
            })}
            aria-label={actionLabel(displayName)}
          >
            <ChampionAvatar
              championId={participant.championId}
              imageClassName={s.participantChampionIcon}
              fallbackClassName={s.participantChampionFallback}
              alt={championName}
            />
          </ToggleGroup.Item>
        );
      })}
    </ToggleGroup.Root>
  );
}

export function MatchSelectedParticipantHeader({
  participant,
}: {
  participant: RawMatchSummaryParticipant;
}) {
  const displayName = matchParticipantDisplayName(participant);
  const championName = matchParticipantChampionName(participant);

  return (
    <header className={s.selectedHeader}>
      <ChampionAvatar
        championId={participant.championId}
        imageClassName={s.selectedChampionIcon}
        fallbackClassName={s.selectedChampionFallback}
        level={participant.champLevel}
        alt={championName}
      />
      <span className={s.selectedText}>
        <span className={s.selectedName}>{displayName}</span>
        <span className={s.selectedChampionName}>{championName}</span>
      </span>
    </header>
  );
}

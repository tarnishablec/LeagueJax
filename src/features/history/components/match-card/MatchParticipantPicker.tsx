/** @jsxImportSource solid-js */
import { ToggleGroup } from "@ark-ui/solid/toggle-group";
import { keyArray } from "@solid-primitives/keyed";
import type { JSX } from "solid-js";
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

export function MatchParticipantPicker(props: {
  summary: RawMatchSummaryGame;
  participants: RawMatchSummaryParticipant[];
  selectedKey: string;
  onSelectedKeyChange: (value: string) => void;
  ariaLabel: string;
  actionLabel: (displayName: string) => string;
}): JSX.Element {
  const participantItems = keyArray(
    () => props.participants,
    matchParticipantKey,
    (participant, index) => {
      const key = () => matchParticipantKey(participant(), index());
      const championName = () => matchParticipantChampionName(participant());
      const displayName = () => matchParticipantDisplayName(participant());

      return (
        <ToggleGroup.Item
          value={key()}
          class={s.participantTrigger({
            team: matchParticipantTeamTone(participant(), props.summary),
          })}
          aria-label={props.actionLabel(displayName())}
        >
          <ChampionAvatar
            championId={participant().championId}
            imageClassName={s.participantChampionIcon}
            fallbackClassName={s.participantChampionFallback}
            alt={championName()}
          />
        </ToggleGroup.Item>
      );
    },
  );

  return (
    <ToggleGroup.Root
      class={s.participantPicker}
      value={props.selectedKey ? [props.selectedKey] : []}
      deselectable={false}
      onValueChange={({ value }) => {
        if (value[0]) {
          props.onSelectedKeyChange(value[0]);
        }
      }}
      aria-label={props.ariaLabel}
    >
      {participantItems()}
    </ToggleGroup.Root>
  );
}

export function MatchSelectedParticipantHeader(props: {
  participant: RawMatchSummaryParticipant;
}): JSX.Element {
  const displayName = () => matchParticipantDisplayName(props.participant);
  const championName = () => matchParticipantChampionName(props.participant);

  return (
    <header class={s.selectedHeader}>
      <ChampionAvatar
        championId={props.participant.championId}
        imageClassName={s.selectedChampionIcon}
        fallbackClassName={s.selectedChampionFallback}
        level={props.participant.champLevel}
        alt={championName()}
      />
      <span class={s.selectedText}>
        <span class={s.selectedName}>{displayName()}</span>
        <span class={s.selectedChampionName}>{championName()}</span>
      </span>
    </header>
  );
}

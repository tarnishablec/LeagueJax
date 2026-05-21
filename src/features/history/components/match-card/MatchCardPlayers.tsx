/** @jsxImportSource solid-js */
import { Key } from "@solid-primitives/keyed";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import type { JSX } from "solid-js";
import { createMemo, Show } from "solid-js";
import { LazyImage } from "@/components/LazyImage";
import { useSolidChampionIcon } from "@/hooks/use-champion-icon";
import type { MatchParticipantGroup } from "../../utils/match-participant-groups";
import * as s from "./MatchCard.css";
import { MatchCardPlayerNameButton } from "./MatchCardPlayerNameButton";

function PlayerIcon(props: { championId: number }): JSX.Element {
  const iconUrl = useSolidChampionIcon(() => props.championId);

  return (
    <Show
      when={iconUrl()}
      fallback={<span class={s.playerIconFallback} aria-hidden="true" />}
    >
      {(src) => (
        <LazyImage
          src={src()}
          alt=""
          className={s.playerIcon}
          fallbackClassName={s.playerIconFallback}
        />
      )}
    </Show>
  );
}

export function MatchCardPlayers(props: {
  groups: MatchParticipantGroup[];
  sgpServerId: string | null;
}): JSX.Element {
  const layout = createMemo(() =>
    props.groups.some((group) => group.layout === "subteam")
      ? "subteam"
      : "side",
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: this wrapper only stops card toggle bubbling; child buttons keep their own semantics.
    <div
      class={s.playersPanel({ layout: layout() })}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <Key each={props.groups} by="key">
        {(group) => (
          <div
            class={s.playerTeamColumn({ layout: layout() })}
            style={assignInlineVars({
              [s.playerTeamAccentVar]: group().accentColor,
            })}
          >
            <Key
              each={group().participants}
              by={(participant) =>
                participant.puuid ??
                `participant-${participant.participantId ?? participant.championId}`
              }
            >
              {(participant) => (
                <div class={s.playerRow}>
                  <PlayerIcon championId={participant().championId} />
                  <MatchCardPlayerNameButton
                    participant={participant()}
                    sgpServerId={props.sgpServerId}
                  />
                </div>
              )}
            </Key>
          </div>
        )}
      </Key>
    </div>
  );
}

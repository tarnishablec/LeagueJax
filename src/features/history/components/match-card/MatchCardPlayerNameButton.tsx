/** @jsxImportSource solid-js */
import { HoverCard } from "@ark-ui/solid/hover-card";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { Portal } from "solid-js/web";
import type { RawMatchSummaryParticipant } from "@/bindings/matches.ts";
import { useSolidOpenHistoryTab } from "../../hooks/use-open-history-tab";
import * as s from "./MatchCard.css";

const BOT_PUUID = "00000000-0000-0000-0000-000000000000";

function isBot(participant: RawMatchSummaryParticipant): boolean {
  const puuid = participant.puuid?.trim() ?? "";
  return puuid.length === 0 || puuid === BOT_PUUID;
}

function resolvePlayerName(participant: RawMatchSummaryParticipant): {
  gameName: string;
  tagLine: string;
} {
  const gameName = (participant.riotIdGameName ?? "").trim();
  const tagLine = (participant.riotIdTagline ?? "").trim();

  return {
    gameName:
      gameName.length > 0
        ? gameName
        : (participant.summonerName ?? participant.puuid ?? "Unknown"),
    tagLine,
  };
}

function classNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function MatchCardPlayerNameButton(props: {
  participant: RawMatchSummaryParticipant;
  sgpServerId: string | null;
  className?: string;
  botClassName?: string;
  children?: string;
}): JSX.Element {
  const openHistoryTab = useSolidOpenHistoryTab();
  const playerName = () => resolvePlayerName(props.participant);
  const displayName = () => props.children ?? playerName().gameName;
  const fullName = () =>
    playerName().tagLine
      ? `${playerName().gameName}#${playerName().tagLine}`
      : playerName().gameName;

  return (
    <Show
      when={!isBot(props.participant)}
      fallback={
        <span
          class={classNames(
            props.botClassName ?? s.playerNameLabel,
            props.className,
          )}
        >
          {displayName()}
        </span>
      }
    >
      <HoverCard.Root openDelay={100} closeDelay={60}>
        <HoverCard.Trigger
          asChild={(getTriggerProps) => (
            <button
              {...getTriggerProps({
                type: "button",
                "aria-label": "Open player history tab",
                class: classNames(s.playerNameButton, props.className),
                onClick: () => {
                  openHistoryTab(
                    props.participant.puuid ?? "",
                    props.sgpServerId,
                    {
                      gameName: playerName().gameName,
                      tagLine: playerName().tagLine,
                    },
                  );
                },
              })}
            >
              {displayName()}
            </button>
          )}
        />
        <Portal>
          <HoverCard.Positioner class={s.playerHoverPositioner}>
            <HoverCard.Content class={s.playerHoverContent}>
              {fullName()}
            </HoverCard.Content>
          </HoverCard.Positioner>
        </Portal>
      </HoverCard.Root>
    </Show>
  );
}

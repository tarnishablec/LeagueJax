import { HoverCard } from "@ark-ui/react/hover-card";
import { Portal } from "@ark-ui/react/portal";
import type { RawMatchSummaryParticipant } from "@/bindings/matches.ts";
import { useOpenHistoryTab } from "../../hooks/use-open-history-tab";
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

export function MatchCardPlayerNameButton({
  participant,
  sgpServerId,
  className,
  botClassName,
  children,
}: {
  participant: RawMatchSummaryParticipant;
  sgpServerId: string | null;
  className?: string;
  botClassName?: string;
  children?: string;
}) {
  const openHistoryTab = useOpenHistoryTab();
  const { gameName, tagLine } = resolvePlayerName(participant);
  const displayName = children ?? gameName;
  const fullName = tagLine ? `${gameName}#${tagLine}` : gameName;

  if (isBot(participant)) {
    return (
      <span
        className={classNames(botClassName ?? s.playerNameLabel, className)}
      >
        {displayName}
      </span>
    );
  }

  return (
    <HoverCard.Root openDelay={100} closeDelay={60}>
      <HoverCard.Trigger
        type="button"
        aria-label="Open player history tab"
        className={classNames(s.playerNameButton, className)}
        onClick={() => {
          openHistoryTab(participant.puuid ?? "", sgpServerId, {
            gameName,
            tagLine,
          });
        }}
      >
        {displayName}
      </HoverCard.Trigger>
      <Portal>
        <HoverCard.Positioner className={s.playerHoverPositioner}>
          <HoverCard.Content className={s.playerHoverContent}>
            {fullName}
          </HoverCard.Content>
        </HoverCard.Positioner>
      </Portal>
    </HoverCard.Root>
  );
}

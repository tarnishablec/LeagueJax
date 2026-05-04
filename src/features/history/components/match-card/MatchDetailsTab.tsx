import { Portal } from "@ark-ui/react/portal";
import { Tooltip } from "@ark-ui/react/tooltip";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type {
  RawMatchDetailsGame,
  RawMatchSummaryGame,
  RawMatchSummaryObjectives,
  RawMatchSummaryParticipant,
  RawMatchSummaryTeam,
} from "@/bindings/matches.ts";
import { ChampionAvatar } from "@/components/champion-avatar/ChampionAvatar";
import { LeaguePositionIcon } from "@/components/league-position/LeaguePositionIcon";
import {
  ScoreboardIcon,
  type ScoreboardIconType,
} from "@/components/ScoreboardIcon.tsx";
import { resolveJungleEggItemIdFromDetails } from "../../hooks/match-details-timeline.ts";
import { normalizeHistoryPosition } from "../../hooks/use-match-card-view-model.ts";
import {
  type RoleQuestSlot,
  useRoleQuestSlot,
} from "../../hooks/use-role-quest-slot.ts";
import * as matchCardStyles from "./MatchCard.css";
import { MatchCardAssetIcon } from "./MatchCardAssetIcon";
import { MatchCardAugments } from "./MatchCardAugments";
import { MatchCardItems } from "./MatchCardItems";
import { MatchCardPlayerNameButton } from "./MatchCardPlayerNameButton";
import { MatchCardRunes } from "./MatchCardRunes";
import { MatchCardSpells } from "./MatchCardSpells";
import * as s from "./MatchDetailsTab.css";
import { formatDamage } from "./match-card-display";

type TeamSide = "blue" | "red";

type TeamTotals = {
  kills: number;
  deaths: number;
  assists: number;
  gold: number;
};

type DamageBreakdown = {
  physical: number;
  magic: number;
  trueDamage: number;
  total: number;
};

type MatchDetailsTabModel = {
  showAugments: boolean;
  showPositionColumn: boolean;
  showQuestColumn: boolean;
  visibleObjectives: readonly ObjectiveConfig[];
  maxDealtDamage: number;
  maxTakenDamage: number;
};

type ObjectiveConfig = {
  key: keyof RawMatchSummaryObjectives;
  labelKey: string;
  defaultLabel: string;
};

const TEAM_IDS = [100, 200] as const;
const AUGMENT_GAME_MODES = new Set(["CHERRY", "KIWI", "STRAWBERRY"]);
const CDRAGON_LATEST_BASE = "https://raw.communitydragon.org/latest";
const CDRAGON_GAME_CHARACTERS_BASE = `${CDRAGON_LATEST_BASE}/game/assets/characters`;
const CDRAGON_POSTGAME_BASE = `${CDRAGON_LATEST_BASE}/plugins/rcp-fe-lol-postgame/global/default`;
const MatchDetailsTabModelContext = createContext<MatchDetailsTabModel | null>(
  null,
);

const OBJECTIVES = [
  {
    key: "baron",
    labelKey: "history.matchDetails.objectives.baron",
    defaultLabel: "Baron",
  },
  {
    key: "dragon",
    labelKey: "history.matchDetails.objectives.dragon",
    defaultLabel: "Dragon",
  },
  {
    key: "riftHerald",
    labelKey: "history.matchDetails.objectives.riftHerald",
    defaultLabel: "Herald",
  },
  {
    key: "horde",
    labelKey: "history.matchDetails.objectives.horde",
    defaultLabel: "Voidgrubs",
  },
  {
    key: "atakhan",
    labelKey: "history.matchDetails.objectives.atakhan",
    defaultLabel: "Atakhan",
  },
  {
    key: "tower",
    labelKey: "history.matchDetails.objectives.tower",
    defaultLabel: "Tower",
  },
  {
    key: "inhibitor",
    labelKey: "history.matchDetails.objectives.inhibitor",
    defaultLabel: "Inhibitor",
  },
] as const satisfies readonly ObjectiveConfig[];
const SUMMONERS_RIFT_OBJECTIVES = OBJECTIVES;
const ARAM_OBJECTIVE_KEYS = new Set<keyof RawMatchSummaryObjectives>([
  "tower",
  "inhibitor",
]);

function safeNumber(value: number | null | undefined): number {
  return Math.max(0, value ?? 0);
}

function participantRowKey(
  participant: RawMatchSummaryParticipant,
  teamId: number,
  index: number,
): string {
  if (participant.participantId !== null) {
    return `team-${teamId}-pid-${participant.participantId}`;
  }

  return `team-${teamId}-puuid-${participant.puuid ?? "unknown"}-champ-${participant.championId}-idx-${index}`;
}

function teamSideFromId(teamId: number): TeamSide {
  return teamId === 100 ? "blue" : "red";
}

function participantPosition(
  participant: RawMatchSummaryParticipant,
): string | null {
  return (
    normalizeHistoryPosition(participant.teamPosition) ??
    normalizeHistoryPosition(participant.individualPosition) ??
    normalizeHistoryPosition(participant.lane) ??
    normalizeHistoryPosition(participant.role) ??
    "FILL"
  );
}

function getParticipantItems(participant: RawMatchSummaryParticipant) {
  return [
    participant.item0,
    participant.item1,
    participant.item2,
    participant.item3,
    participant.item4,
    participant.item5,
    participant.item6,
  ] as const;
}

function getParticipantAugments(participant: RawMatchSummaryParticipant) {
  return [
    participant.playerAugment1,
    participant.playerAugment2,
    participant.playerAugment3,
    participant.playerAugment4,
    participant.playerAugment5,
    participant.playerAugment6,
  ] as const;
}

function getPerkIds(participant: RawMatchSummaryParticipant): {
  primaryRuneId: number;
  subStyleId: number;
} {
  const primary = participant.perks?.styles.find(
    (style) => style.description === "primaryStyle",
  );
  const sub = participant.perks?.styles.find(
    (style) => style.description === "subStyle",
  );

  return {
    primaryRuneId: primary?.selections[0]?.perk ?? 0,
    subStyleId: sub?.style ?? 0,
  };
}

function participantHasAugments(
  participant: RawMatchSummaryParticipant,
): boolean {
  return getParticipantAugments(participant).some(
    (augmentId) => augmentId !== null && augmentId > 0,
  );
}

function matchHasAugments(summary: RawMatchSummaryGame): boolean {
  const gameMode = summary.json.gameMode.toUpperCase();
  return (
    AUGMENT_GAME_MODES.has(gameMode) ||
    summary.json.participants.some(participantHasAugments)
  );
}

function matchSupportsPosition(summary: RawMatchSummaryGame): boolean {
  return (
    summary.json.mapId === 11 ||
    summary.json.gameMode.toUpperCase() === "CLASSIC"
  );
}

function isSummonersRiftMatch(summary: RawMatchSummaryGame): boolean {
  return matchSupportsPosition(summary);
}

function isAramMatch(summary: RawMatchSummaryGame): boolean {
  return summary.json.mapId === 12 || summary.json.queueId === 450;
}

function matchObjectiveKills(
  summary: RawMatchSummaryGame,
  key: keyof RawMatchSummaryObjectives,
): number {
  return summary.json.teams.reduce(
    (total, team) => total + objectiveKills(team, key),
    0,
  );
}

function resolveVisibleObjectives(
  summary: RawMatchSummaryGame,
): readonly ObjectiveConfig[] {
  if (isSummonersRiftMatch(summary)) {
    return SUMMONERS_RIFT_OBJECTIVES;
  }

  if (isAramMatch(summary)) {
    return OBJECTIVES.filter((objective) =>
      ARAM_OBJECTIVE_KEYS.has(objective.key),
    );
  }

  return OBJECTIVES.filter((objective) => {
    return (
      ARAM_OBJECTIVE_KEYS.has(objective.key) ||
      matchObjectiveKills(summary, objective.key) > 0
    );
  });
}

function matchSeason(summary: RawMatchSummaryGame): number | null {
  const majorVersion = Number(summary.json.gameVersion.split(".")[0]);
  return Number.isFinite(majorVersion) ? majorVersion : null;
}

function participantHasRoleQuestData(
  participant: RawMatchSummaryParticipant,
): boolean {
  return participant.roleBoundItem !== null && participant.roleBoundItem > 0;
}

function matchSupportsRoleQuest(summary: RawMatchSummaryGame): boolean {
  return (
    matchSeason(summary) === 16 &&
    matchSupportsPosition(summary) &&
    summary.json.participants.some(participantHasRoleQuestData)
  );
}

function useMatchDetailsTabModel(
  summary: RawMatchSummaryGame,
): MatchDetailsTabModel {
  return useMemo(
    () => ({
      showAugments: matchHasAugments(summary),
      showPositionColumn: matchSupportsPosition(summary),
      showQuestColumn: matchSupportsRoleQuest(summary),
      visibleObjectives: resolveVisibleObjectives(summary),
      maxDealtDamage: Math.max(
        1,
        ...summary.json.participants.map((participant) =>
          safeNumber(participant.totalDamageDealtToChampions),
        ),
      ),
      maxTakenDamage: Math.max(
        1,
        ...summary.json.participants.map((participant) =>
          safeNumber(participant.totalDamageTaken),
        ),
      ),
    }),
    [summary],
  );
}

function useMatchDetailsTabModelContext(): MatchDetailsTabModel {
  const model = useContext(MatchDetailsTabModelContext);
  if (!model) {
    throw new Error("MatchDetailsTabModelContext is unavailable");
  }

  return model;
}

function computeTeamTotals(
  participants: RawMatchSummaryParticipant[],
): TeamTotals {
  return participants.reduce<TeamTotals>(
    (totals, participant) => ({
      kills: totals.kills + safeNumber(participant.kills),
      deaths: totals.deaths + safeNumber(participant.deaths),
      assists: totals.assists + safeNumber(participant.assists),
      gold: totals.gold + safeNumber(participant.goldEarned),
    }),
    { kills: 0, deaths: 0, assists: 0, gold: 0 },
  );
}

function computeKda(participant: RawMatchSummaryParticipant): number | null {
  const kills = safeNumber(participant.kills);
  const assists = safeNumber(participant.assists);
  const deaths = safeNumber(participant.deaths);
  if (deaths === 0) {
    return null;
  }

  return (kills + assists) / deaths;
}

function formatKda(
  participant: RawMatchSummaryParticipant,
  perfectLabel: string,
): string {
  const kda = computeKda(participant);
  return kda === null ? perfectLabel : kda.toFixed(2);
}

function participantCs(participant: RawMatchSummaryParticipant): number {
  return (
    safeNumber(participant.totalMinionsKilled) +
    safeNumber(participant.neutralMinionsKilled)
  );
}

function damageDealtBreakdown(
  participant: RawMatchSummaryParticipant,
): DamageBreakdown {
  return {
    physical: safeNumber(participant.physicalDamageDealtToChampions),
    magic: safeNumber(participant.magicDamageDealtToChampions),
    trueDamage: safeNumber(participant.trueDamageDealtToChampions),
    total: safeNumber(participant.totalDamageDealtToChampions),
  };
}

function damageTakenBreakdown(
  participant: RawMatchSummaryParticipant,
): DamageBreakdown {
  return {
    physical: safeNumber(participant.physicalDamageTaken),
    magic: safeNumber(participant.magicDamageTaken),
    trueDamage: safeNumber(participant.trueDamageTaken),
    total: safeNumber(participant.totalDamageTaken),
  };
}

function fillPercent(value: number, maxValue: number): string {
  if (maxValue <= 0) {
    return "0%";
  }

  const percent = Math.min(100, Math.max(0, (value / maxValue) * 100));
  return `${percent.toFixed(3)}%`;
}

function segmentPercent(value: number, total: number): string {
  if (total <= 0) {
    return "0%";
  }

  const percent = Math.min(100, Math.max(0, (value / total) * 100));
  return `${percent.toFixed(3)}%`;
}

function objectiveKills(
  team: RawMatchSummaryTeam | undefined,
  key: keyof RawMatchSummaryObjectives,
): number {
  return safeNumber(team?.objectives?.[key]?.kills);
}

function objectiveIconSources(
  key: keyof RawMatchSummaryObjectives,
  side: TeamSide,
): { src: string; fallbacks: string[] } {
  switch (key) {
    case "baron":
      return {
        src: `${CDRAGON_GAME_CHARACTERS_BASE}/sru_baron/hud/baron_square.png`,
        fallbacks: [
          "https://raw.communitydragon.org/14.17/game/assets/characters/sru_baron/hud/baron_square.png",
        ],
      };
    case "dragon":
      return {
        src: `${CDRAGON_GAME_CHARACTERS_BASE}/sru_dragon/hud/dragon_square.png`,
        fallbacks: [
          `${CDRAGON_GAME_CHARACTERS_BASE}/sru_dragon_fire/hud/dragon_square_fire.png`,
        ],
      };
    case "riftHerald":
      return {
        src: `${CDRAGON_GAME_CHARACTERS_BASE}/sru_riftherald/hud/sruriftherald_square.png`,
        fallbacks: [
          "https://raw.communitydragon.org/15.7/game/assets/characters/sru_riftherald/hud/sruriftherald_square.png",
        ],
      };
    case "horde":
      return {
        src: `${CDRAGON_GAME_CHARACTERS_BASE}/sru_horde/hud/sru_voidgrub_square.png`,
        fallbacks: [],
      };
    case "atakhan":
      return {
        src: `${CDRAGON_GAME_CHARACTERS_BASE}/sru_atakhan/hud/atakhan_v_square_128.png`,
        fallbacks: [
          `${CDRAGON_GAME_CHARACTERS_BASE}/sru_atakhan/hud/atakhan_r_square_128.png`,
          `${CDRAGON_GAME_CHARACTERS_BASE}/sru_atakhan/hud/atakhan_t_circle_128.png`,
        ],
      };
    case "tower": {
      const color = side === "blue" ? "blue" : "red";
      return {
        src: `${CDRAGON_GAME_CHARACTERS_BASE}/turret/hud/turret_${color}_square.unified_map_objects.png`,
        fallbacks: [
          `https://raw.communitydragon.org/12.18/game/assets/characters/turret/hud/turret_${color}_square.unified_map_objects.png`,
          `https://raw.communitydragon.org/8.8/data/characters/sruap_turret_order1/hud/turret_${color}_square.png`,
        ],
      };
    }
    case "inhibitor": {
      const color = side === "blue" ? "blue" : "red";
      return {
        src: `${CDRAGON_GAME_CHARACTERS_BASE}/inhibitor/hud/inhibitor_${color}_square.png`,
        fallbacks: [
          `https://raw.communitydragon.org/15.17/game/assets/characters/inhibitor/hud/inhibitor_${color}_square.png`,
          `https://raw.communitydragon.org/12.10/game/assets/characters/inhibitor/hud/inhibitor_${color}_square.unified_map_objects.png`,
          `${CDRAGON_POSTGAME_BASE}/icon-crystal.svg`,
        ],
      };
    }
    default:
      return {
        src: `${CDRAGON_POSTGAME_BASE}/scoreboard-challenge-crystal-icon.svg`,
        fallbacks: [],
      };
  }
}

function MatchDetailsTooltip({
  content,
  children,
}: {
  content: string;
  children: ReactNode;
}) {
  return (
    <Tooltip.Root openDelay={180} closeDelay={0}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner className={s.tooltipPositioner}>
          <Tooltip.Content className={s.tooltipContent}>
            {content}
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}

function DamageBreakdownMeter({
  label,
  breakdown,
  maxDamage,
}: {
  label: string;
  breakdown: DamageBreakdown;
  maxDamage: number;
}) {
  const splitTotal = Math.max(
    0,
    breakdown.physical + breakdown.magic + breakdown.trueDamage,
  );
  const trueDamage =
    splitTotal === 0 && breakdown.total > 0
      ? breakdown.total
      : breakdown.trueDamage + Math.max(0, breakdown.total - splitTotal);
  const normalizedSplitTotal = Math.max(
    0,
    breakdown.physical + breakdown.magic + trueDamage,
  );

  return (
    <div className={s.damageCell}>
      <span className={s.damageNumberRow}>
        <span className={s.damageLabel}>{label}</span>
        <span className={s.damageNumber}>{formatDamage(breakdown.total)}</span>
      </span>
      <div className={s.damageMeterTrack}>
        <div
          className={s.damageMeterFill}
          style={assignInlineVars({
            [s.meterFillWidthVar]: fillPercent(breakdown.total, maxDamage),
            [s.physicalSegmentWidthVar]: segmentPercent(
              breakdown.physical,
              normalizedSplitTotal,
            ),
            [s.magicSegmentWidthVar]: segmentPercent(
              breakdown.magic,
              normalizedSplitTotal,
            ),
            [s.trueSegmentWidthVar]: segmentPercent(
              trueDamage,
              normalizedSplitTotal,
            ),
          })}
        >
          <span className={s.damageSegment.physical} />
          <span className={s.damageSegment.magic} />
          <span className={s.damageSegment.trueDamage} />
        </div>
      </div>
    </div>
  );
}

function ObjectiveStat({
  objective,
  team,
  side,
}: {
  objective: ObjectiveConfig;
  team: RawMatchSummaryTeam | undefined;
  side: TeamSide;
}) {
  const { t } = useTranslation();
  const count = objectiveKills(team, objective.key);
  const label = t(objective.labelKey, {
    defaultValue: objective.defaultLabel,
  });
  const icon = objectiveIconSources(objective.key, side);

  return (
    <MatchDetailsTooltip content={label}>
      <span className={s.objectiveStat}>
        <MatchCardAssetIcon
          src={icon.src}
          fallbacks={icon.fallbacks}
          alt={label}
          className={s.objectiveIcon}
          fallbackClassName={s.objectiveIconFallback}
        />
        <span>{count}</span>
      </span>
    </MatchDetailsTooltip>
  );
}

function QuestSlot({ slot }: { slot: RoleQuestSlot | null }) {
  if (slot === null) {
    return <span className={s.emptyQuestSlot} aria-hidden="true" />;
  }

  if (slot.kind === "quest") {
    return (
      <MatchCardAssetIcon
        src={slot.iconUrl}
        alt=""
        className={matchCardStyles.itemIcon}
        fallbackClassName={matchCardStyles.itemIconFallback}
      />
    );
  }

  return (
    <MatchCardAssetIcon
      src={slot.iconUrl}
      alt={`Item ${slot.itemId}`}
      className={matchCardStyles.itemIcon}
      fallbackClassName={matchCardStyles.itemIconFallback}
    />
  );
}

function ScoreCell({
  type,
  value,
  muted = false,
}: {
  type: ScoreboardIconType;
  value: string;
  muted?: boolean;
}) {
  return (
    <span className={s.scoreCell({ tone: muted ? "muted" : "default" })}>
      <ScoreboardIcon
        type={type}
        className={s.scoreCellIcon}
        fallbackClassName={s.scoreCellIconFallback}
      />
      <span>{value}</span>
    </span>
  );
}

function ParticipantRow({
  summary,
  detail,
  participant,
  sgpServerId,
}: {
  summary: RawMatchSummaryGame;
  detail: RawMatchDetailsGame | undefined;
  participant: RawMatchSummaryParticipant;
  sgpServerId: string | null;
}) {
  const { t } = useTranslation();
  const {
    showAugments,
    showPositionColumn,
    showQuestColumn,
    maxDealtDamage,
    maxTakenDamage,
  } = useMatchDetailsTabModelContext();
  const resolvedJungleEggItemId = useMemo(
    () => resolveJungleEggItemIdFromDetails(detail, participant.participantId),
    [detail, participant.participantId],
  );
  const roleQuest = useRoleQuestSlot({
    participant,
    match: summary,
    resolvedJungleEggItemId,
  });
  const position = showPositionColumn
    ? (roleQuest.inferredPosition ?? participantPosition(participant))
    : null;
  const itemIds = getParticipantItems(participant);
  const augmentIds = getParticipantAugments(participant);
  const { primaryRuneId, subStyleId } = getPerkIds(participant);
  const championName = participant.championName ?? `#${participant.championId}`;
  const record = `${safeNumber(participant.kills)}/${safeNumber(participant.deaths)}/${safeNumber(participant.assists)}`;
  const perfectLabel = t("history.matchDetails.perfectKda", {
    defaultValue: "Perfect",
  });
  const damageDealtLabel = t("history.matchDetails.columns.damageDealt", {
    defaultValue: "Dealt",
  });
  const damageTakenLabel = t("history.matchDetails.columns.damageTaken", {
    defaultValue: "Taken",
  });

  return (
    <div
      className={s.participantRow({
        positionColumn: showPositionColumn ? "shown" : "hidden",
        questColumn: showQuestColumn ? "shown" : "hidden",
      })}
    >
      {showPositionColumn ? (
        <div className={s.positionCell}>
          <LeaguePositionIcon position={position} width={18} height={18} />
        </div>
      ) : null}
      <div className={s.summonerCell}>
        <ChampionAvatar
          championId={participant.championId}
          imageClassName={s.championIcon}
          fallbackClassName={s.championIconFallback}
          level={participant.champLevel}
        />
        <span className={s.summonerText}>
          <MatchCardPlayerNameButton
            participant={participant}
            sgpServerId={sgpServerId}
            className={s.summonerName}
            botClassName={s.summonerBotName}
          />
          <MatchDetailsTooltip content={championName}>
            <span className={s.championName}>{championName}</span>
          </MatchDetailsTooltip>
        </span>
      </div>
      <div className={s.loadoutCell}>
        <MatchCardSpells
          spell1Id={participant.spell1Id ?? 0}
          spell2Id={participant.spell2Id ?? 0}
        />
      </div>
      <div className={s.loadoutCell}>
        {showAugments ? (
          <MatchCardAugments augmentIds={augmentIds} />
        ) : (
          <MatchCardRunes
            perkPrimaryRuneId={primaryRuneId}
            perkSubStyleId={subStyleId}
          />
        )}
      </div>
      <div className={s.loadoutCell}>
        <MatchCardItems gameId={summary.json.gameId} items={itemIds} />
      </div>
      {showQuestColumn ? (
        <div className={s.centeredCell}>
          <QuestSlot slot={roleQuest.slot} />
        </div>
      ) : null}
      <DamageBreakdownMeter
        label={damageDealtLabel}
        breakdown={damageDealtBreakdown(participant)}
        maxDamage={maxDealtDamage}
      />
      <DamageBreakdownMeter
        label={damageTakenLabel}
        breakdown={damageTakenBreakdown(participant)}
        maxDamage={maxTakenDamage}
      />
      <ScoreCell
        type="gold"
        value={formatDamage(safeNumber(participant.goldEarned))}
      />
      <ScoreCell type="record" value={record} />
      <ScoreCell
        type="kda"
        value={formatKda(participant, perfectLabel)}
        muted
      />
      <ScoreCell type="cs" value={formatDamage(participantCs(participant))} />
    </div>
  );
}

function TeamBlock({
  summary,
  detail,
  teamId,
  sgpServerId,
}: {
  summary: RawMatchSummaryGame;
  detail: RawMatchDetailsGame | undefined;
  teamId: number;
  sgpServerId: string | null;
}) {
  const { t } = useTranslation();
  const { showPositionColumn, showQuestColumn, visibleObjectives } =
    useMatchDetailsTabModelContext();
  const side = teamSideFromId(teamId);
  const participants = summary.json.participants.filter(
    (participant) => participant.teamId === teamId,
  );
  const team = summary.json.teams.find(
    (candidate) => candidate.teamId === teamId,
  );
  const totals = computeTeamTotals(participants);
  const teamLabel = t(side === "blue" ? "history.blueTeam" : "history.redTeam");
  // const headerLabels = {
  //   position: t("history.matchDetails.columns.position", {
  //     defaultValue: "Position",
  //   }),
  //   summoner: t("history.matchDetails.columns.summoner", {
  //     defaultValue: "Summoner",
  //   }),
  //   spells: t("history.matchDetails.columns.spells", {
  //     defaultValue: "Spells",
  //   }),
  //   runes: t("history.matchDetails.columns.runes", {
  //     defaultValue: "Runes",
  //   }),
  //   items: t("history.matchDetails.columns.items", {
  //     defaultValue: "Items",
  //   }),
  //   quest: t("history.matchDetails.columns.quest", {
  //     defaultValue: "Quest",
  //   }),
  //   dealt: t("history.matchDetails.columns.damageDealt", {
  //     defaultValue: "Dealt",
  //   }),
  //   taken: t("history.matchDetails.columns.damageTaken", {
  //     defaultValue: "Taken",
  //   }),
  //   gold: t("history.matchDetails.columns.gold", {
  //     defaultValue: "Gold",
  //   }),
  //   record: t("history.matchDetails.columns.record", {
  //     defaultValue: "K/D/A",
  //   }),
  //   kda: t("history.matchDetails.columns.kda", {
  //     defaultValue: "KDA",
  //   }),
  //   cs: t("history.matchDetails.columns.cs", {
  //     defaultValue: "CS",
  //   }),
  // };

  return (
    <section className={s.teamBlock({ team: side })}>
      <header className={s.teamHeader}>
        <div className={s.teamTitleGroup}>
          <span className={s.teamTitle({ team: side })}>{teamLabel}</span>
          <span className={s.teamHeaderMetric}>
            <ScoreboardIcon
              type="record"
              className={s.scoreboardIcon}
              fallbackClassName={s.scoreboardIconFallback}
            />
            {totals.kills}/{totals.deaths}/{totals.assists}
          </span>
          <span className={s.teamHeaderMetric}>
            <ScoreboardIcon
              type="gold"
              className={s.scoreboardIcon}
              fallbackClassName={s.scoreboardIconFallback}
            />
            {formatDamage(totals.gold)}
          </span>
        </div>
        <div className={s.objectiveList}>
          {visibleObjectives.map((objective) => (
            <ObjectiveStat
              key={`${teamId}-${objective.key}`}
              objective={objective}
              team={team}
              side={side}
            />
          ))}
        </div>
      </header>

      <div className={s.tableScroller}>
        <div
          className={s.table({
            positionColumn: showPositionColumn ? "shown" : "hidden",
            questColumn: showQuestColumn ? "shown" : "hidden",
          })}
        >
          {/*<div className={s.tableHeader}>*/}
          {/*  <span>{headerLabels.position}</span>*/}
          {/*  <span>{headerLabels.summoner}</span>*/}
          {/*  <span>{headerLabels.spells}</span>*/}
          {/*  <span>{headerLabels.runes}</span>*/}
          {/*  <span>{headerLabels.items}</span>*/}
          {/*  <span>{headerLabels.quest}</span>*/}
          {/*  <span>{headerLabels.dealt}</span>*/}
          {/*  <span>{headerLabels.taken}</span>*/}
          {/*  <span>{headerLabels.gold}</span>*/}
          {/*  <span>{headerLabels.record}</span>*/}
          {/*  <span>{headerLabels.kda}</span>*/}
          {/*  <span>{headerLabels.cs}</span>*/}
          {/*</div>*/}
          {participants.map((participant, index) => (
            <ParticipantRow
              key={participantRowKey(participant, teamId, index)}
              summary={summary}
              detail={detail}
              participant={participant}
              sgpServerId={sgpServerId}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function MatchDetailsTab({
  summary,
  detail,
  sgpServerId,
}: {
  summary: RawMatchSummaryGame;
  detail: RawMatchDetailsGame | undefined;
  sgpServerId?: string | null;
}) {
  const model = useMatchDetailsTabModel(summary);

  return (
    <MatchDetailsTabModelContext.Provider value={model}>
      <div className={s.root}>
        {TEAM_IDS.map((teamId) => (
          <TeamBlock
            key={teamId}
            summary={summary}
            detail={detail}
            teamId={teamId}
            sgpServerId={sgpServerId ?? null}
          />
        ))}
      </div>
    </MatchDetailsTabModelContext.Provider>
  );
}

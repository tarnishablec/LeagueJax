/** @jsxImportSource solid-js */
import { Tooltip } from "@ark-ui/solid/tooltip";
import { keyArray } from "@solid-primitives/keyed";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import type { Accessor, JSX } from "solid-js";
import { createContext, createMemo, Show, useContext } from "solid-js";
import { Portal } from "solid-js/web";
import type {
  RawMatchDetailsGame,
  RawMatchSummaryGame,
  RawMatchSummaryObjectives,
  RawMatchSummaryParticipant,
  RawMatchSummaryTeam,
} from "@/bindings/matches.ts";
import { ChampionAvatar } from "@/components/champion-avatar/ChampionAvatar";
import { LeaguePositionIcon } from "@/components/league-position/LeaguePositionIcon";
import { ScoreboardIcon } from "@/components/ScoreboardIcon";
import type { ScoreboardIconType } from "@/components/ScoreboardIcon.types";
import { useSolidTranslation } from "@/i18n/solid";
import { resolveJungleEggItemIdFromDetails } from "../../hooks/match-details-timeline.ts";
import {
  type RoleQuestSlot,
  useSolidRoleQuestSlot,
} from "../../hooks/use-role-quest-slot";
import { normalizeHistoryPosition } from "../../utils/history-position";
import {
  type MatchParticipantGroup,
  resolveMatchParticipantGroups,
  type TeamSide,
} from "../../utils/match-participant-groups";
import {
  EMPTY_BAN_CHAMPION_ID,
  resolveMatchTeamBanSlots,
  resolveMatchTeamForGroup,
} from "../../utils/match-team-bans";
import * as matchCardStyles from "./MatchCard.css";
import { MatchCardAssetIcon } from "./MatchCardAssetIcon";
import { MatchCardAugments } from "./MatchCardAugments";
import { MatchCardItems } from "./MatchCardItems";
import { MatchCardPlayerNameButton } from "./MatchCardPlayerNameButton";
import { MatchCardRunes } from "./MatchCardRunes";
import { MatchCardSpells } from "./MatchCardSpells";
import * as s from "./MatchDetailsTab.css";
import { formatDamage } from "./match-card-display";
import { matchParticipantKey } from "./match-participant-display";

type TooltipTriggerProps = Parameters<
  NonNullable<Parameters<typeof Tooltip.Trigger>[0]["asChild"]>
>[0];

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

const AUGMENT_GAME_MODES = new Set(["CHERRY", "KIWI"]);
const CDRAGON_LATEST_BASE = "https://raw.communitydragon.org/latest";
const CDRAGON_GAME_CHARACTERS_BASE = `${CDRAGON_LATEST_BASE}/game/assets/characters`;
const CDRAGON_POSTGAME_BASE = `${CDRAGON_LATEST_BASE}/plugins/rcp-fe-lol-postgame/global/default`;
const MatchDetailsTabModelContext =
  createContext<Accessor<MatchDetailsTabModel> | null>(null);

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
    return matchObjectiveKills(summary, objective.key) > 0;
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
  summary: Accessor<RawMatchSummaryGame>,
): Accessor<MatchDetailsTabModel> {
  return createMemo(() => ({
    showAugments: matchHasAugments(summary()),
    showPositionColumn: matchSupportsPosition(summary()),
    showQuestColumn: matchSupportsRoleQuest(summary()),
    visibleObjectives: resolveVisibleObjectives(summary()),
    maxDealtDamage: Math.max(
      1,
      ...summary().json.participants.map((participant) =>
        safeNumber(participant.totalDamageDealtToChampions),
      ),
    ),
    maxTakenDamage: Math.max(
      1,
      ...summary().json.participants.map((participant) =>
        safeNumber(participant.totalDamageTaken),
      ),
    ),
  }));
}

function useMatchDetailsTabModelContext(): Accessor<MatchDetailsTabModel> {
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

function MatchDetailsTooltip(props: {
  content: string;
  children: (triggerProps: TooltipTriggerProps) => JSX.Element;
}): JSX.Element {
  return (
    <Tooltip.Root openDelay={180} closeDelay={0}>
      <Tooltip.Trigger
        asChild={(triggerProps) => props.children(triggerProps)}
      />
      <Portal>
        <Tooltip.Positioner class={s.tooltipPositioner}>
          <Tooltip.Content class={s.tooltipContent}>
            {props.content}
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}

function DamageBreakdownMeter(props: {
  label: string;
  breakdown: DamageBreakdown;
  maxDamage: number;
}): JSX.Element {
  const splitTotal = createMemo(() =>
    Math.max(
      0,
      props.breakdown.physical +
        props.breakdown.magic +
        props.breakdown.trueDamage,
    ),
  );
  const trueDamage = createMemo(() =>
    splitTotal() === 0 && props.breakdown.total > 0
      ? props.breakdown.total
      : props.breakdown.trueDamage +
        Math.max(0, props.breakdown.total - splitTotal()),
  );
  const normalizedSplitTotal = createMemo(() =>
    Math.max(
      0,
      props.breakdown.physical + props.breakdown.magic + trueDamage(),
    ),
  );

  return (
    <div class={s.damageCell}>
      <span class={s.damageNumberRow}>
        <span class={s.damageLabel}>{props.label}</span>
        <span class={s.damageNumber}>
          {formatDamage(props.breakdown.total)}
        </span>
      </span>
      <div class={s.damageMeterTrack}>
        <div
          class={s.damageMeterFill}
          style={assignInlineVars({
            [s.meterFillWidthVar]: fillPercent(
              props.breakdown.total,
              props.maxDamage,
            ),
            [s.physicalSegmentWidthVar]: segmentPercent(
              props.breakdown.physical,
              normalizedSplitTotal(),
            ),
            [s.magicSegmentWidthVar]: segmentPercent(
              props.breakdown.magic,
              normalizedSplitTotal(),
            ),
            [s.trueSegmentWidthVar]: segmentPercent(
              trueDamage(),
              normalizedSplitTotal(),
            ),
          })}
        >
          <span class={s.damageSegment.physical} />
          <span class={s.damageSegment.magic} />
          <span class={s.damageSegment.trueDamage} />
        </div>
      </div>
    </div>
  );
}

function ObjectiveStat(props: {
  objective: ObjectiveConfig;
  team: RawMatchSummaryTeam | undefined;
  side: TeamSide;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const count = createMemo(() =>
    objectiveKills(props.team, props.objective.key),
  );
  const label = createMemo(() =>
    t(props.objective.labelKey, {
      defaultValue: props.objective.defaultLabel,
    }),
  );
  const icon = createMemo(() =>
    objectiveIconSources(props.objective.key, props.side),
  );

  return (
    <MatchDetailsTooltip content={label()}>
      {(triggerProps) => (
        <span
          {...triggerProps({
            class: s.objectiveStat,
          })}
        >
          <MatchCardAssetIcon
            src={icon().src}
            fallbacks={icon().fallbacks}
            alt={label()}
            className={s.objectiveIcon}
            fallbackClassName={s.objectiveIconFallback}
          />
          <span>{count()}</span>
        </span>
      )}
    </MatchDetailsTooltip>
  );
}

function TeamBans(props: {
  team: RawMatchSummaryTeam | undefined;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const bans = createMemo(() => resolveMatchTeamBanSlots(props.team));
  const label = () =>
    t("history.matchDetails.bans.label", {
      defaultValue: "Bans:",
    });
  const emptyBanLabel = () =>
    t("history.matchDetails.bans.empty", {
      defaultValue: "Empty ban",
    });
  const banIcons = keyArray(
    bans,
    (ban) => ban.key,
    (ban) => (
      <ChampionAvatar
        championId={ban().championId}
        imageClassName={s.teamBanIcon}
        fallbackClassName={s.teamBanIconFallback}
        alt={ban().championId === EMPTY_BAN_CHAMPION_ID ? emptyBanLabel() : ""}
      />
    ),
  );

  return (
    <Show when={bans().length > 0} fallback={<div />}>
      <div class={s.teamBans}>
        <span class={s.teamBansLabel}>{label()}</span>
        <div class={s.teamBanList}>{banIcons()}</div>
      </div>
    </Show>
  );
}

function QuestSlot(props: { slot: RoleQuestSlot | null }): JSX.Element {
  return (
    <Show
      when={props.slot}
      fallback={<span class={s.emptyQuestSlot} aria-hidden="true" />}
    >
      {(slot) => {
        const value = slot();
        return value.kind === "quest" ? (
          <MatchCardAssetIcon
            src={value.iconUrl}
            alt=""
            className={matchCardStyles.itemIcon}
            fallbackClassName={matchCardStyles.itemIconFallback}
          />
        ) : (
          <MatchCardAssetIcon
            src={value.iconUrl}
            alt={`Item ${value.itemId}`}
            className={matchCardStyles.itemIcon}
            fallbackClassName={matchCardStyles.itemIconFallback}
          />
        );
      }}
    </Show>
  );
}

function ScoreCell(props: {
  type: ScoreboardIconType;
  value: string;
  muted?: boolean;
}): JSX.Element {
  return (
    <span class={s.scoreCell({ tone: props.muted ? "muted" : "default" })}>
      <ScoreboardIcon
        type={props.type}
        className={s.scoreCellIcon}
        fallbackClassName={s.scoreCellIconFallback}
      />
      <span>{props.value}</span>
    </span>
  );
}

function ParticipantRow(props: {
  summary: RawMatchSummaryGame;
  detail: RawMatchDetailsGame | undefined;
  participant: RawMatchSummaryParticipant;
  sgpServerId: string | null;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const model = useMatchDetailsTabModelContext();
  const resolvedJungleEggItemId = createMemo(() =>
    resolveJungleEggItemIdFromDetails(
      props.detail,
      props.participant.participantId,
    ),
  );
  const roleQuest = useSolidRoleQuestSlot({
    participant: props.participant,
    match: props.summary,
    resolvedJungleEggItemId,
  });
  const position = createMemo(() =>
    model().showPositionColumn
      ? (roleQuest().inferredPosition ?? participantPosition(props.participant))
      : null,
  );
  const itemIds = createMemo(() => getParticipantItems(props.participant));
  const augmentIds = createMemo(() =>
    getParticipantAugments(props.participant),
  );
  const perkIds = createMemo(() => getPerkIds(props.participant));
  const championName = createMemo(
    () => props.participant.championName ?? `#${props.participant.championId}`,
  );
  const record = createMemo(
    () =>
      `${safeNumber(props.participant.kills)}/${safeNumber(props.participant.deaths)}/${safeNumber(props.participant.assists)}`,
  );
  const perfectLabel = () =>
    t("history.matchDetails.perfectKda", {
      defaultValue: "Perfect",
    });
  const damageDealtLabel = () =>
    t("history.matchDetails.columns.damageDealt", {
      defaultValue: "Dealt",
    });
  const damageTakenLabel = () =>
    t("history.matchDetails.columns.damageTaken", {
      defaultValue: "Taken",
    });

  return (
    <div
      class={s.participantRow({
        positionColumn: model().showPositionColumn ? "shown" : "hidden",
        questColumn: model().showQuestColumn ? "shown" : "hidden",
      })}
    >
      <Show when={model().showPositionColumn}>
        <div class={s.positionCell}>
          <LeaguePositionIcon position={position()} width={18} height={18} />
        </div>
      </Show>
      <div class={s.summonerCell}>
        <ChampionAvatar
          championId={props.participant.championId}
          imageClassName={s.championIcon}
          fallbackClassName={s.championIconFallback}
          level={props.participant.champLevel}
        />
        <span class={s.summonerText}>
          <MatchCardPlayerNameButton
            participant={props.participant}
            sgpServerId={props.sgpServerId}
            className={s.summonerName}
            botClassName={s.summonerBotName}
          />
          <MatchDetailsTooltip content={championName()}>
            {(triggerProps) => (
              <span
                {...triggerProps({
                  class: s.championName,
                })}
              >
                {championName()}
              </span>
            )}
          </MatchDetailsTooltip>
        </span>
      </div>
      <div class={s.loadoutCell}>
        <MatchCardSpells
          spell1Id={props.participant.spell1Id ?? 0}
          spell2Id={props.participant.spell2Id ?? 0}
        />
      </div>
      <div class={s.loadoutCell}>
        <Show
          when={model().showAugments}
          fallback={
            <MatchCardRunes
              perkPrimaryRuneId={perkIds().primaryRuneId}
              perkSubStyleId={perkIds().subStyleId}
            />
          }
        >
          <MatchCardAugments augmentIds={augmentIds()} />
        </Show>
      </div>
      <div class={s.loadoutCell}>
        <MatchCardItems gameId={props.summary.json.gameId} items={itemIds()} />
      </div>
      <Show when={model().showQuestColumn}>
        <div class={s.centeredCell}>
          <QuestSlot slot={roleQuest().slot} />
        </div>
      </Show>
      <DamageBreakdownMeter
        label={damageDealtLabel()}
        breakdown={damageDealtBreakdown(props.participant)}
        maxDamage={model().maxDealtDamage}
      />
      <DamageBreakdownMeter
        label={damageTakenLabel()}
        breakdown={damageTakenBreakdown(props.participant)}
        maxDamage={model().maxTakenDamage}
      />
      <ScoreCell
        type="gold"
        value={formatDamage(safeNumber(props.participant.goldEarned))}
      />
      <ScoreCell type="record" value={record()} />
      <ScoreCell
        type="kda"
        value={formatKda(props.participant, perfectLabel())}
        muted
      />
      <ScoreCell
        type="cs"
        value={formatDamage(participantCs(props.participant))}
      />
    </div>
  );
}

function TeamBlock(props: {
  summary: RawMatchSummaryGame;
  detail: RawMatchDetailsGame | undefined;
  group: MatchParticipantGroup;
  sgpServerId: string | null;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const model = useMatchDetailsTabModelContext();
  const participants = createMemo(() => props.group.participants);
  const objectiveSide = createMemo<TeamSide>(() =>
    props.group.tone === "red" ? "red" : "blue",
  );
  const team = createMemo(() =>
    resolveMatchTeamForGroup(props.summary.json.teams, props.group),
  );
  const totals = createMemo(() => computeTeamTotals(participants()));
  const teamLabel = createMemo(() =>
    props.group.tone === "blue"
      ? t("history.blueTeam")
      : props.group.tone === "red"
        ? t("history.redTeam")
        : t("history.matchDetails.team", {
            number: props.group.labelNumber,
            defaultValue: `Team ${props.group.labelNumber}`,
          }),
  );
  const placementLabel = createMemo(() =>
    props.group.placement !== null
      ? t("history.matchDetails.placement", {
          placement: props.group.placement,
          defaultValue: `#${props.group.placement}`,
        })
      : null,
  );
  const teamName = createMemo(() =>
    props.group.nameKey
      ? t(props.group.nameKey, {
          defaultValue: teamLabel(),
        })
      : null,
  );
  const objectiveStats = keyArray(
    () => model().visibleObjectives,
    (objective) => objective.key,
    (objective) => (
      <ObjectiveStat
        objective={objective()}
        team={team()}
        side={objectiveSide()}
      />
    ),
  );
  const participantRows = keyArray(
    participants,
    matchParticipantKey,
    (participant) => (
      <ParticipantRow
        summary={props.summary}
        detail={props.detail}
        participant={participant()}
        sgpServerId={props.sgpServerId}
      />
    ),
  );

  return (
    <Show when={participants().length > 0}>
      <section
        class={s.teamBlock({ team: props.group.tone })}
        style={assignInlineVars({
          [s.teamAccentColorVar]: props.group.accentColor,
        })}
      >
        <header class={s.teamHeader}>
          <div class={s.teamTitleGroup}>
            <span class={s.teamTitle({ team: props.group.tone })}>
              <Show when={placementLabel()} fallback={teamLabel()}>
                {(placement) => (
                  <>
                    <span class={s.teamPlacement}>{placement()}</span>
                    <Show when={teamName()}>
                      {(name) => <span class={s.teamName}>{name()}</span>}
                    </Show>
                  </>
                )}
              </Show>
            </span>
            <span class={s.teamHeaderMetric}>
              <ScoreboardIcon
                type="record"
                className={s.scoreboardIcon}
                fallbackClassName={s.scoreboardIconFallback}
              />
              {totals().kills}/{totals().deaths}/{totals().assists}
            </span>
            <span class={s.teamHeaderMetric}>
              <ScoreboardIcon
                type="gold"
                className={s.scoreboardIcon}
                fallbackClassName={s.scoreboardIconFallback}
              />
              {formatDamage(totals().gold)}
            </span>
          </div>
          <TeamBans team={team()} />
          <Show
            when={
              props.group.showObjectives && model().visibleObjectives.length > 0
            }
          >
            <div class={s.objectiveScroller}>
              <div class={s.objectiveList}>{objectiveStats()}</div>
            </div>
          </Show>
        </header>

        <div class={s.tableScroller}>
          <div
            class={s.table({
              positionColumn: model().showPositionColumn ? "shown" : "hidden",
              questColumn: model().showQuestColumn ? "shown" : "hidden",
            })}
          >
            {participantRows()}
          </div>
        </div>
      </section>
    </Show>
  );
}

export function MatchDetailsTab(props: {
  summary: RawMatchSummaryGame;
  detail: RawMatchDetailsGame | undefined;
  sgpServerId?: string | null;
}): JSX.Element {
  const model = useMatchDetailsTabModel(() => props.summary);
  const teamGroups = createMemo(() =>
    resolveMatchParticipantGroups(props.summary),
  );
  const teamBlocks = keyArray(
    teamGroups,
    (group) => group.key,
    (group) => (
      <TeamBlock
        summary={props.summary}
        detail={props.detail}
        group={group()}
        sgpServerId={props.sgpServerId ?? null}
      />
    ),
  );

  return (
    <MatchDetailsTabModelContext.Provider value={model}>
      <div class={s.root}>{teamBlocks()}</div>
    </MatchDetailsTabModelContext.Provider>
  );
}

import { Portal } from "@ark-ui/react/portal";
import { ToggleGroup } from "@ark-ui/react/toggle-group";
import { Tooltip } from "@ark-ui/react/tooltip";
import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  RawMatchDetailsGame,
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
  RawMatchSummaryPerkSelection,
  RawMatchSummaryStatPerks,
  RawMatchSummaryStyle,
} from "@/bindings/matches.ts";
import { ChampionAvatar } from "@/components/champion-avatar/ChampionAvatar";
import {
  type CdragonGameDataCatalog,
  type CdragonGameDataCatalogPerk,
  type CdragonGameDataCatalogPerkStyle,
  normalizeCdragonGameAssetPath,
  useCdragonGameDataCatalog,
} from "../../hooks/use-cdragon-game-data-catalog.ts";
import {
  matchUsesSideTeams,
  type TeamTone,
  teamToneFromId,
} from "../../utils/match-participant-groups";
import { MatchCardAssetIcon } from "./MatchCardAssetIcon";
import * as s from "./MatchRunesTab.css";
import { CDRAGON_PERK_STYLE_ICON_BY_ID } from "./match-card-display";

type AugmentRarityVariant =
  | "default"
  | "prismatic"
  | "gold"
  | "silver"
  | "bronze";

const AUGMENT_GAME_MODES = new Set(["CHERRY", "KIWI", "STRAWBERRY"]);
const STAT_PERK_SLOTS = ["offense", "flex", "defense"] as const;
const AUGMENT_SLOT_KEYS = [
  "slot1",
  "slot2",
  "slot3",
  "slot4",
  "slot5",
  "slot6",
] as const;
const STAT_PERK_VALUE_LABEL_BY_ID: Record<number, string> = {
  5001: "+10-180",
  5002: "+6",
  5003: "+8",
  5005: "+10%",
  5007: "+8",
  5008: "+9",
  5010: "+2%",
  5011: "+65",
  5013: "+15%",
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function safeNumber(value: number | null | undefined): number {
  return Math.max(0, value ?? 0);
}

function participantKey(
  participant: RawMatchSummaryParticipant,
  index: number,
): string {
  if (participant.participantId !== null) {
    return `participant-${participant.participantId}`;
  }

  return `participant-${participant.puuid ?? "unknown"}-${participant.championId}-${index}`;
}

function participantTeamTone(
  participant: RawMatchSummaryParticipant,
  summary: RawMatchSummaryGame,
): TeamTone {
  if (!matchUsesSideTeams(summary)) {
    return "neutral";
  }

  return teamToneFromId(participant.teamId);
}

function participantDisplayName(
  participant: RawMatchSummaryParticipant,
): string {
  const riotName = (participant.riotIdGameName ?? "").trim();
  if (riotName.length > 0) {
    return riotName;
  }

  const fallbackName = (
    participant.summonerName ??
    participant.puuid ??
    ""
  ).trim();
  return fallbackName.length > 0 ? fallbackName : "Unknown";
}

function participantChampionName(
  participant: RawMatchSummaryParticipant,
): string {
  return participant.championName ?? `#${participant.championId}`;
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

function participantHasAugments(
  participant: RawMatchSummaryParticipant,
): boolean {
  return getParticipantAugments(participant).some(
    (augmentId) => augmentId !== null && augmentId > 0,
  );
}

function matchUsesAugments(summary: RawMatchSummaryGame): boolean {
  const gameMode = summary.json.gameMode.toUpperCase();
  return (
    AUGMENT_GAME_MODES.has(gameMode) ||
    summary.json.participants.some(participantHasAugments)
  );
}

function primaryStyle(
  participant: RawMatchSummaryParticipant,
): RawMatchSummaryStyle | null {
  const styles = participant.perks?.styles ?? [];
  return (
    styles.find((style) => style.description === "primaryStyle") ??
    styles[0] ??
    null
  );
}

function secondaryStyle(
  participant: RawMatchSummaryParticipant,
): RawMatchSummaryStyle | null {
  const styles = participant.perks?.styles ?? [];
  return (
    styles.find((style) => style.description === "subStyle") ??
    styles.find((style) => style !== primaryStyle(participant)) ??
    null
  );
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match: string, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    )
    .replace(/&#(\d+);/g, (_match: string, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 10)),
    )
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cdragonTextToPlainText(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const withoutTags = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return decodeHtmlEntities(withoutTags)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function perkDescription(perk: CdragonGameDataCatalogPerk | undefined): string {
  return cdragonTextToPlainText(
    perk?.longDesc ??
      perk?.shortDesc ??
      perk?.tooltip ??
      perk?.recommendationDescriptor,
  );
}

function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat().format(safeNumber(value));
}

function replaceEndOfGameVariables(
  value: string,
  selection: RawMatchSummaryPerkSelection,
): string {
  const variables: Record<string, number | null> = {
    "1": selection.var1,
    "2": selection.var2,
    "3": selection.var3,
  };

  return value.replace(/@eogvar([123])@/gi, (_match: string, index: string) =>
    formatNumber(variables[index]),
  );
}

function perkStatLines(
  perk: CdragonGameDataCatalogPerk | undefined,
  selection: RawMatchSummaryPerkSelection | null,
): string[] {
  if (!selection) {
    return [];
  }

  return (perk?.endOfGameStatDescs ?? [])
    .map((statDescription) =>
      cdragonTextToPlainText(
        replaceEndOfGameVariables(statDescription, selection),
      ),
    )
    .filter((statLine) => statLine.length > 0);
}

function styleIconSources(
  styleId: number,
  styleData: CdragonGameDataCatalogPerkStyle | undefined,
): { src: string | null; fallbacks: string[] } {
  const mappedIconSrc = CDRAGON_PERK_STYLE_ICON_BY_ID[styleId] ?? null;

  if (styleData?.iconPath && styleData.iconPath.trim().length > 0) {
    return {
      src: normalizeCdragonGameAssetPath(styleData.iconPath),
      fallbacks: [mappedIconSrc].filter((value): value is string => {
        return value !== null;
      }),
    };
  }

  return { src: mappedIconSrc, fallbacks: [] };
}

function perkIconSrc(
  perk: CdragonGameDataCatalogPerk | undefined,
): string | null {
  if (!perk?.iconPath || perk.iconPath.trim().length === 0) {
    return null;
  }

  return normalizeCdragonGameAssetPath(perk.iconPath, { lowercase: true });
}

function augmentIconSources(iconPath: string | null | undefined): {
  src: string | null;
  fallbacks: string[];
} {
  if (!iconPath || iconPath.trim().length === 0) {
    return { src: null, fallbacks: [] };
  }

  return {
    src: normalizeCdragonGameAssetPath(iconPath),
    fallbacks: [
      normalizeCdragonGameAssetPath(iconPath, {
        lowercase: true,
      }),
    ],
  };
}

function rarityVariant(
  rarity: string | null | undefined,
): AugmentRarityVariant {
  switch (rarity) {
    case "kPrismatic":
      return "prismatic";
    case "kGold":
      return "gold";
    case "kSilver":
      return "silver";
    case "kBronze":
      return "bronze";
    default:
      return "default";
  }
}

function rarityDefaultLabel(rarity: string | null | undefined): string {
  switch (rarity) {
    case "kPrismatic":
      return "Prismatic";
    case "kGold":
      return "Gold";
    case "kSilver":
      return "Silver";
    case "kBronze":
      return "Bronze";
    default:
      return "Unknown";
  }
}

function GameDataTooltip({
  title,
  description,
  stats,
  statsRarity = "default",
  children,
}: {
  title: string;
  description?: string | null;
  stats?: readonly string[];
  statsRarity?: AugmentRarityVariant;
  children: ReactElement;
}) {
  const statLines = stats ?? [];

  return (
    <Tooltip.Root openDelay={120} closeDelay={0}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner className={s.tooltipPositioner}>
          <Tooltip.Content className={s.tooltipContent}>
            <span className={s.tooltipTitle}>{title}</span>
            {description ? (
              <span className={s.tooltipDescription}>{description}</span>
            ) : null}
            {statLines.length > 0 ? (
              <span className={s.tooltipStats}>
                {statLines.map((statLine) => (
                  <span
                    key={statLine}
                    className={s.tooltipStatLine({ rarity: statsRarity })}
                  >
                    {statLine}
                  </span>
                ))}
              </span>
            ) : null}
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}

function RuneEntry({
  catalog,
  perkId,
  selection,
  meta,
}: {
  catalog: CdragonGameDataCatalog;
  perkId: number;
  selection: RawMatchSummaryPerkSelection | null;
  meta?: string | null;
}) {
  const { t } = useTranslation();
  const perk = catalog.perksById[perkId];
  const name =
    perk?.name?.trim() ||
    t("history.matchRunes.unknownRune", {
      id: perkId,
      defaultValue: `Rune #${perkId}`,
    });
  const description = perkDescription(perk);
  const stats = perkStatLines(perk, selection);
  const iconSrc = perkIconSrc(perk);
  const visibleMeta = stats[0] ?? meta;

  return (
    <GameDataTooltip title={name} description={description} stats={stats}>
      <span className={s.runeEntry}>
        <MatchCardAssetIcon
          src={iconSrc}
          alt=""
          className={s.runeIcon}
          fallbackClassName={s.runeIconFallback}
        />
        <span className={s.runeText}>
          <span className={s.runeName}>{name}</span>
          {visibleMeta ? (
            <span className={s.runeMeta}>{visibleMeta}</span>
          ) : null}
        </span>
      </span>
    </GameDataTooltip>
  );
}

function RuneStyleSection({
  catalog,
  fallbackTitle,
  style,
}: {
  catalog: CdragonGameDataCatalog;
  fallbackTitle: string;
  style: RawMatchSummaryStyle | null;
}) {
  const { t } = useTranslation();
  const styleId = style?.style ?? 0;
  const styleData = styleId > 0 ? catalog.perkStylesById[styleId] : undefined;
  const label =
    styleData?.name?.trim() ||
    (styleId > 0
      ? t("history.runeStyle.unknown", {
          styleId,
          defaultValue: `Style ${styleId}`,
        })
      : fallbackTitle);
  const iconSources = styleIconSources(styleId, styleData);
  const selections = (style?.selections ?? []).filter(
    (selection) => selection.perk !== null && selection.perk > 0,
  );

  return (
    <section className={s.section}>
      <header className={s.sectionHeader}>
        <MatchCardAssetIcon
          src={iconSources.src}
          fallbacks={iconSources.fallbacks}
          alt=""
          className={s.styleIcon}
          fallbackClassName={s.styleIconFallback}
        />
        <span>{label}</span>
      </header>
      {selections.length > 0 ? (
        <div className={s.runeList}>
          {selections.map((selection) => (
            <RuneEntry
              key={`${styleId}-${selection.perk}`}
              catalog={catalog}
              perkId={selection.perk ?? 0}
              selection={selection}
            />
          ))}
        </div>
      ) : (
        <span className={s.emptyState}>
          {t("history.matchRunes.noData", {
            defaultValue: "No rune data",
          })}
        </span>
      )}
    </section>
  );
}

function statPerkId(
  statPerks: RawMatchSummaryStatPerks | null | undefined,
  slot: (typeof STAT_PERK_SLOTS)[number],
): number {
  return statPerks?.[slot] ?? 0;
}

function statPerkMeta(
  catalog: CdragonGameDataCatalog,
  perkId: number,
  fallbackLabel: string,
): string {
  const perk = catalog.perksById[perkId];
  const valueLabel =
    statPerkValueFromDescription(perk, perkId) ??
    STAT_PERK_VALUE_LABEL_BY_ID[perkId];
  const perkName = perk?.name?.trim() || fallbackLabel;

  if (!valueLabel) {
    return fallbackLabel;
  }

  return `${valueLabel} ${perkName}`;
}

function statPerkValueFromDescription(
  perk: CdragonGameDataCatalogPerk | undefined,
  perkId: number,
): string | null {
  const description = perkDescription(perk);
  if (description.length === 0) {
    return null;
  }

  if (perkId === 5008) {
    const abilityPowerValue = description.match(
      /([+＋]?\s*\d+(?:\.\d+)?)\s*(?:Ability Power|法术强度|魔力|魔法攻撃力)/i,
    )?.[1];
    return normalizeStatPerkValue(abilityPowerValue);
  }

  const percentageValue = description.match(
    /([+＋]?\s*\d+(?:\.\d+)?\s*%)/,
  )?.[1];
  if (percentageValue) {
    return normalizeStatPerkValue(percentageValue);
  }

  const rangedValue = description.match(
    /([+＋]?\s*\d+(?:\.\d+)?\s*[-－–—~～至到]\s*\d+(?:\.\d+)?)/,
  )?.[1];
  if (rangedValue) {
    return normalizeStatPerkValue(rangedValue);
  }

  const flatValue = description.match(/([+＋]?\s*\d+(?:\.\d+)?)/)?.[1];
  return normalizeStatPerkValue(flatValue);
}

function normalizeStatPerkValue(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(/＋/g, "+")
    .replace(/[－–—~～]|至|到/g, "-")
    .replace(/\s+/g, "")
    .trim();
  if (normalized.length === 0) {
    return null;
  }

  return normalized.startsWith("+") ? normalized : `+${normalized}`;
}

function StatPerksSection({
  catalog,
  statPerks,
}: {
  catalog: CdragonGameDataCatalog;
  statPerks: RawMatchSummaryStatPerks | null | undefined;
}) {
  const { t } = useTranslation();
  const slots = STAT_PERK_SLOTS.map((slot) => ({
    slot,
    perkId: statPerkId(statPerks, slot),
    fallbackLabel: t(`history.matchRunes.statSlots.${slot}`, {
      defaultValue: slot,
    }),
  })).filter((slot) => slot.perkId > 0);

  if (slots.length === 0) {
    return null;
  }

  const firstStatPerk = catalog.perksById[slots[0]?.perkId ?? 0];

  return (
    <section className={classNames(s.section, s.statSection)}>
      <header className={s.sectionHeader}>
        <MatchCardAssetIcon
          src={perkIconSrc(firstStatPerk)}
          alt=""
          className={s.styleIcon}
          fallbackClassName={s.styleIconFallback}
        />
        <span>
          {t("history.matchRunes.statPerks", {
            defaultValue: "Stat Shards",
          })}
        </span>
      </header>
      <div className={s.statShardGrid}>
        {slots.map((slot) => (
          <RuneEntry
            key={`stat-${slot.slot}-${slot.perkId}`}
            catalog={catalog}
            perkId={slot.perkId}
            selection={null}
            meta={statPerkMeta(catalog, slot.perkId, slot.fallbackLabel)}
          />
        ))}
      </div>
    </section>
  );
}

function NormalRunesPanel({
  catalog,
  participant,
}: {
  catalog: CdragonGameDataCatalog;
  participant: RawMatchSummaryParticipant;
}) {
  const { t } = useTranslation();

  if (!participant.perks) {
    return (
      <span className={s.emptyState}>
        {t("history.matchRunes.noData", {
          defaultValue: "No rune data",
        })}
      </span>
    );
  }

  return (
    <div className={s.sectionGrid}>
      <RuneStyleSection
        catalog={catalog}
        fallbackTitle={t("history.matchRunes.primaryStyle", {
          defaultValue: "Primary",
        })}
        style={primaryStyle(participant)}
      />
      <RuneStyleSection
        catalog={catalog}
        fallbackTitle={t("history.matchRunes.subStyle", {
          defaultValue: "Secondary",
        })}
        style={secondaryStyle(participant)}
      />
      <StatPerksSection
        catalog={catalog}
        statPerks={participant.perks.statPerks}
      />
    </div>
  );
}

function AugmentPanel({
  catalog,
  participant,
}: {
  catalog: CdragonGameDataCatalog;
  participant: RawMatchSummaryParticipant;
}) {
  const { t } = useTranslation();
  const augmentSlots = useMemo(() => {
    const augmentIds = getParticipantAugments(participant);
    return AUGMENT_SLOT_KEYS.map((slotKey, slotIndex) => ({
      slotKey,
      id: augmentIds[slotIndex],
    })).filter((slot) => slot.id !== null && slot.id > 0);
  }, [participant]);

  if (augmentSlots.length === 0) {
    return (
      <span className={s.emptyState}>
        {t("history.matchRunes.noAugmentData", {
          defaultValue: "No augment data",
        })}
      </span>
    );
  }

  return (
    <div className={s.augmentPanel}>
      <header className={s.augmentHeader}>
        <span>
          {t("history.matchRunes.augments", {
            defaultValue: "Augments",
          })}
        </span>
      </header>
      <div className={s.augmentGrid}>
        {augmentSlots.map(({ slotKey, id }) => {
          const augmentId = id ?? 0;
          const augment = catalog.augmentsById[augmentId];
          const name =
            augment?.nameTRA?.trim() ||
            augment?.simpleNameTRA?.trim() ||
            t("history.matchRunes.unknownAugment", {
              id: augmentId,
              defaultValue: `Augment #${augmentId}`,
            });
          const rarity = augment?.rarity ?? null;
          const rarityLabel = t(`history.matchRunes.rarity.${rarity}`, {
            defaultValue: rarityDefaultLabel(rarity),
          });
          const iconSources = augmentIconSources(augment?.augmentSmallIconPath);
          const description =
            augment?.tooltip?.trim() || augment?.description?.trim() || null;

          return (
            <GameDataTooltip
              key={`${slotKey}-${augmentId}`}
              title={name}
              description={description}
              stats={[rarityLabel]}
              statsRarity={rarityVariant(rarity)}
            >
              <span
                className={s.augmentEntry({
                  rarity: rarityVariant(rarity),
                })}
              >
                <MatchCardAssetIcon
                  src={iconSources.src}
                  fallbacks={iconSources.fallbacks}
                  alt=""
                  className={s.augmentIcon}
                  fallbackClassName={s.augmentIconFallback}
                />
                <span className={s.runeText}>
                  <span className={s.runeName}>{name}</span>
                  <span className={s.runeMeta}>{rarityLabel}</span>
                </span>
              </span>
            </GameDataTooltip>
          );
        })}
      </div>
    </div>
  );
}

function SelectedParticipantHeader({
  participant,
}: {
  participant: RawMatchSummaryParticipant;
}) {
  const displayName = participantDisplayName(participant);
  const championName = participantChampionName(participant);

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

function ParticipantPicker({
  summary,
  participants,
  selectedKey,
  onSelectedKeyChange,
}: {
  summary: RawMatchSummaryGame;
  participants: RawMatchSummaryParticipant[];
  selectedKey: string;
  onSelectedKeyChange: (value: string) => void;
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
      aria-label="Match participant rune tabs"
    >
      {participants.map((participant, index) => {
        const key = participantKey(participant, index);
        const championName = participantChampionName(participant);
        const displayName = participantDisplayName(participant);

        return (
          <ToggleGroup.Item
            key={key}
            value={key}
            className={s.participantTrigger({
              team: participantTeamTone(participant, summary),
            })}
            aria-label={`Show runes for ${displayName}`}
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

function SelectedParticipantContent({
  catalog,
  summary,
  participant,
}: {
  catalog: CdragonGameDataCatalog;
  summary: RawMatchSummaryGame;
  participant: RawMatchSummaryParticipant;
}) {
  if (matchUsesAugments(summary) || participantHasAugments(participant)) {
    return <AugmentPanel catalog={catalog} participant={participant} />;
  }

  return <NormalRunesPanel catalog={catalog} participant={participant} />;
}

export function MatchRunesTab({
  summary,
  detail: _detail,
}: {
  summary: RawMatchSummaryGame;
  detail: RawMatchDetailsGame | undefined;
}) {
  void _detail;
  const { t } = useTranslation();
  const catalog = useCdragonGameDataCatalog();
  const participants = summary.json.participants;
  const participantEntries = useMemo(
    () =>
      participants.map((participant, index) => ({
        participant,
        key: participantKey(participant, index),
      })),
    [participants],
  );
  const initialKey = participantEntries[0]?.key ?? "";
  const [requestedParticipantKey, setRequestedParticipantKey] =
    useState(initialKey);
  const selectedEntry =
    participantEntries.find((entry) => entry.key === requestedParticipantKey) ??
    participantEntries[0] ??
    null;

  if (!selectedEntry) {
    return (
      <span className={s.emptyState}>
        {t("history.matchRunes.noData", {
          defaultValue: "No rune data",
        })}
      </span>
    );
  }

  return (
    <div className={s.root}>
      <ParticipantPicker
        summary={summary}
        participants={participants}
        selectedKey={selectedEntry.key}
        onSelectedKeyChange={setRequestedParticipantKey}
      />
      <div className={s.content}>
        <SelectedParticipantHeader participant={selectedEntry.participant} />
        <SelectedParticipantContent
          catalog={catalog}
          summary={summary}
          participant={selectedEntry.participant}
        />
      </div>
    </div>
  );
}

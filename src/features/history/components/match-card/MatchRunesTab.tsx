/** @jsxImportSource solid-js */
import { Tooltip } from "@ark-ui/solid/tooltip";
import { keyArray } from "@solid-primitives/keyed";
import type { JSX } from "solid-js";
import { createMemo, Show } from "solid-js";
import { Portal } from "solid-js/web";
import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
  RawMatchSummaryPerkSelection,
  RawMatchSummaryStatPerks,
  RawMatchSummaryStyle,
} from "@/bindings/matches.ts";
import { useSolidSettingValue } from "@/features/settings/use-setting-value";
import { useSolidTranslation } from "@/i18n/solid";
import {
  type CdragonGameDataCatalog,
  type CdragonGameDataCatalogPerk,
  type CdragonGameDataCatalogPerkStyle,
  normalizeCdragonGameAssetPath,
  useSolidCdragonGameDataCatalog,
} from "../../hooks/use-cdragon-game-data-catalog";
import { HISTORY_SHOW_AUGMENT_DETAILS_SETTING } from "../../settings-ids";
import { MatchCardAssetIcon } from "./MatchCardAssetIcon";
import * as s from "./MatchRunesTab.css";
import { CDRAGON_PERK_STYLE_ICON_BY_ID } from "./match-card-display";

type TooltipTriggerProps = Parameters<
  NonNullable<Parameters<typeof Tooltip.Trigger>[0]["asChild"]>
>[0];

type AugmentRarityVariant =
  | "default"
  | "prismatic"
  | "gold"
  | "silver"
  | "bronze";

const AUGMENT_GAME_MODES = new Set(["CHERRY", "KIWI"]);
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

function matchAugmentIds(
  participants: readonly RawMatchSummaryParticipant[],
): number[] {
  return [
    ...new Set(
      participants
        .flatMap((participant) => [...getParticipantAugments(participant)])
        .filter(
          (augmentId): augmentId is number =>
            typeof augmentId === "number" && augmentId > 0,
        ),
    ),
  ].sort((left, right) => left - right);
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

function GameDataTooltip(props: {
  title: string;
  description?: string | null;
  stats?: readonly string[];
  statsRarity?: AugmentRarityVariant;
  children: (triggerProps: TooltipTriggerProps) => JSX.Element;
}): JSX.Element {
  const statLines = () => props.stats ?? [];
  const statLineItems = keyArray(
    statLines,
    (statLine, index) => `${index}:${statLine}`,
    (statLine) => (
      <span
        class={s.tooltipStatLine({
          rarity: props.statsRarity ?? "default",
        })}
      >
        {statLine()}
      </span>
    ),
  );

  return (
    <Tooltip.Root
      openDelay={120}
      closeDelay={0}
      closeOnPointerDown={false}
      closeOnClick={false}
    >
      <Tooltip.Trigger
        asChild={(triggerProps) => props.children(triggerProps)}
      />
      <Portal>
        <Tooltip.Positioner class={s.tooltipPositioner}>
          <Tooltip.Content class={s.tooltipContent}>
            <span class={s.tooltipTitle}>{props.title}</span>
            <Show when={props.description}>
              {(description) => (
                <span class={s.tooltipDescription}>{description()}</span>
              )}
            </Show>
            <Show when={statLines().length > 0}>
              <span class={s.tooltipStats}>{statLineItems()}</span>
            </Show>
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}

function RuneEntry(props: {
  catalog: CdragonGameDataCatalog;
  perkId: number;
  selection: RawMatchSummaryPerkSelection | null;
  meta?: string | null;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const perk = createMemo(() => props.catalog.perksById[props.perkId]);
  const name = createMemo(
    () =>
      perk()?.name?.trim() ||
      t("history.matchRunes.unknownRune", {
        id: props.perkId,
        defaultValue: `Rune #${props.perkId}`,
      }),
  );
  const description = createMemo(() => perkDescription(perk()));
  const stats = createMemo(() => perkStatLines(perk(), props.selection));
  const iconSrc = createMemo(() => perkIconSrc(perk()));
  const visibleMeta = createMemo(() => stats()[0] ?? props.meta);

  return (
    <GameDataTooltip title={name()} description={description()} stats={stats()}>
      {(triggerProps) => (
        <span
          {...triggerProps({
            class: s.runeEntry,
          })}
        >
          <MatchCardAssetIcon
            src={iconSrc()}
            alt=""
            className={s.runeIcon}
            fallbackClassName={s.runeIconFallback}
          />
          <span class={s.runeText}>
            <span class={s.runeName}>{name()}</span>
            <Show when={visibleMeta()}>
              {(meta) => <span class={s.runeMeta}>{meta()}</span>}
            </Show>
          </span>
        </span>
      )}
    </GameDataTooltip>
  );
}

function RuneStyleSection(props: {
  catalog: CdragonGameDataCatalog;
  fallbackTitle: string;
  style: RawMatchSummaryStyle | null;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const styleId = createMemo(() => props.style?.style ?? 0);
  const styleData = createMemo(() =>
    styleId() > 0 ? props.catalog.perkStylesById[styleId()] : undefined,
  );
  const label = createMemo(
    () =>
      styleData()?.name?.trim() ||
      (styleId() > 0
        ? t("history.runeStyle.unknown", {
            styleId: styleId(),
            defaultValue: `Style ${styleId()}`,
          })
        : props.fallbackTitle),
  );
  const iconSources = createMemo(() =>
    styleIconSources(styleId(), styleData()),
  );
  const selections = createMemo(() =>
    (props.style?.selections ?? []).filter(
      (selection) => selection.perk !== null && selection.perk > 0,
    ),
  );
  const runeEntries = keyArray(
    selections,
    (selection) => String(selection.perk ?? 0),
    (selection) => (
      <RuneEntry
        catalog={props.catalog}
        perkId={selection().perk ?? 0}
        selection={selection()}
      />
    ),
  );

  return (
    <section class={s.section}>
      <header class={s.sectionHeader}>
        <MatchCardAssetIcon
          src={iconSources().src}
          fallbacks={iconSources().fallbacks}
          alt=""
          className={s.styleIcon}
          fallbackClassName={s.styleIconFallback}
        />
        <span>{label()}</span>
      </header>
      <Show
        when={selections().length > 0}
        fallback={
          <span class={s.emptyState}>
            {t("history.matchRunes.noData", {
              defaultValue: "No rune data",
            })}
          </span>
        }
      >
        <div class={s.runeList}>{runeEntries()}</div>
      </Show>
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
      /([+＋]?\s*\d+(?:\.\d+)?)\s*(?:Ability Power|法术强度|魔力|魔法攻击力)/i,
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
    /([+＋]?\s*\d+(?:\.\d+)?\s*[-－–—至到]\s*\d+(?:\.\d+)?)/,
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
    .replace(/[＋﹢]/g, "+")
    .replace(/[－–—至到]/g, "-")
    .replace(/\s+/g, "")
    .trim();
  if (normalized.length === 0) {
    return null;
  }

  return normalized.startsWith("+") ? normalized : `+${normalized}`;
}
function StatPerksSection(props: {
  catalog: CdragonGameDataCatalog;
  statPerks: RawMatchSummaryStatPerks | null | undefined;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const slots = createMemo(() =>
    STAT_PERK_SLOTS.map((slot) => ({
      slot,
      perkId: statPerkId(props.statPerks, slot),
      fallbackLabel: t(`history.matchRunes.statSlots.${slot}`, {
        defaultValue: slot,
      }),
    })).filter((slot) => slot.perkId > 0),
  );
  const firstStatPerk = createMemo(
    () => props.catalog.perksById[slots()[0]?.perkId ?? 0],
  );
  const statEntries = keyArray(
    slots,
    (slot) => slot.slot,
    (slot) => (
      <RuneEntry
        catalog={props.catalog}
        perkId={slot().perkId}
        selection={null}
        meta={statPerkMeta(props.catalog, slot().perkId, slot().fallbackLabel)}
      />
    ),
  );

  return (
    <Show when={slots().length > 0}>
      <section class={classNames(s.section, s.statSection)}>
        <header class={s.sectionHeader}>
          <MatchCardAssetIcon
            src={perkIconSrc(firstStatPerk())}
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
        <div class={s.statShardGrid}>{statEntries()}</div>
      </section>
    </Show>
  );
}

function NormalRunesPanel(props: {
  catalog: CdragonGameDataCatalog;
  participant: RawMatchSummaryParticipant;
}): JSX.Element {
  const { t } = useSolidTranslation();

  return (
    <Show
      when={props.participant.perks}
      fallback={
        <span class={s.emptyState}>
          {t("history.matchRunes.noData", {
            defaultValue: "No rune data",
          })}
        </span>
      }
    >
      <div class={s.sectionGrid}>
        <RuneStyleSection
          catalog={props.catalog}
          fallbackTitle={t("history.matchRunes.primaryStyle", {
            defaultValue: "Primary",
          })}
          style={primaryStyle(props.participant)}
        />
        <RuneStyleSection
          catalog={props.catalog}
          fallbackTitle={t("history.matchRunes.subStyle", {
            defaultValue: "Secondary",
          })}
          style={secondaryStyle(props.participant)}
        />
        <StatPerksSection
          catalog={props.catalog}
          statPerks={props.participant.perks?.statPerks}
        />
      </div>
    </Show>
  );
}

function AugmentPanel(props: {
  catalog: CdragonGameDataCatalog;
  participant: RawMatchSummaryParticipant;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const augmentSlots = createMemo(() => {
    const augmentIds = getParticipantAugments(props.participant);
    return AUGMENT_SLOT_KEYS.map((_slotKey, slotIndex) => ({
      slotKey: _slotKey,
      id: augmentIds[slotIndex],
    })).filter((slot) => slot.id !== null && slot.id > 0);
  });
  const augmentEntries = keyArray(
    augmentSlots,
    (slot) => slot.slotKey,
    (slot) => {
      const augmentId = () => slot().id ?? 0;
      const augment = () => props.catalog.augmentsById[augmentId()];
      const name = () =>
        augment()?.nameTRA?.trim() ||
        augment()?.simpleNameTRA?.trim() ||
        t("history.matchRunes.unknownAugment", {
          defaultValue: "Unknown augment",
        });
      const rarity = () => augment()?.rarity ?? null;
      const rarityLabel = () =>
        rarity() === null
          ? null
          : t(`history.matchRunes.rarity.${rarity()}`, {
              defaultValue: rarityDefaultLabel(rarity()),
            });
      const iconSources = () =>
        augmentIconSources(augment()?.augmentSmallIconPath);
      const description = () =>
        augment()?.tooltip?.trim() || augment()?.description?.trim() || null;

      return (
        <GameDataTooltip
          title={name()}
          description={description()}
          stats={rarityLabel() ? [rarityLabel() ?? ""] : []}
          statsRarity={rarityVariant(rarity())}
        >
          {(triggerProps) => (
            <span
              {...triggerProps({
                class: s.augmentEntry({
                  rarity: rarityVariant(rarity()),
                }),
              })}
            >
              <MatchCardAssetIcon
                src={iconSources().src}
                fallbacks={iconSources().fallbacks}
                alt=""
                className={s.augmentIcon}
                fallbackClassName={s.augmentIconFallback}
              />
              <span class={s.runeText}>
                <span class={s.runeName}>{name()}</span>
                <Show when={rarityLabel()}>
                  {(label) => <span class={s.runeMeta}>{label()}</span>}
                </Show>
              </span>
            </span>
          )}
        </GameDataTooltip>
      );
    },
  );

  return (
    <Show
      when={augmentSlots().length > 0}
      fallback={
        <span class={s.emptyState}>
          {t("history.matchRunes.noAugmentData", {
            defaultValue: "No augment data",
          })}
        </span>
      }
    >
      <div class={s.augmentPanel}>
        <header class={s.augmentHeader}>
          <span>
            {t("history.matchRunes.augments", {
              defaultValue: "Augments",
            })}
          </span>
        </header>
        <div class={s.augmentGrid}>{augmentEntries()}</div>
      </div>
    </Show>
  );
}

function SelectedParticipantContent(props: {
  catalog: CdragonGameDataCatalog;
  summary: RawMatchSummaryGame;
  participant: RawMatchSummaryParticipant;
}): JSX.Element {
  return (
    <Show
      when={
        matchUsesAugments(props.summary) ||
        participantHasAugments(props.participant)
      }
      fallback={
        <NormalRunesPanel
          catalog={props.catalog}
          participant={props.participant}
        />
      }
    >
      <AugmentPanel catalog={props.catalog} participant={props.participant} />
    </Show>
  );
}

export function MatchRunesTab(props: {
  summary: RawMatchSummaryGame;
  participant: RawMatchSummaryParticipant;
}): JSX.Element {
  const showAugmentDetails = useSolidSettingValue<boolean>(
    HISTORY_SHOW_AUGMENT_DETAILS_SETTING,
    false,
  );
  const participants = createMemo(() => props.summary.json.participants);
  const augmentIds = createMemo(() => matchAugmentIds(participants()));
  const catalog = useSolidCdragonGameDataCatalog(
    () => props.summary.json.gameMode,
    () => showAugmentDetails() ?? false,
    {
      gameVersion: () => props.summary.json.gameVersion,
      augmentIds,
    },
  );

  return (
    <SelectedParticipantContent
      catalog={catalog()}
      summary={props.summary}
      participant={props.participant}
    />
  );
}

import { Checkbox } from "@ark-ui/react/checkbox";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  Activity,
  CalendarCheck,
  Check,
  Gift,
  ListChecks,
  type LucideIcon,
  PackageX,
  Play,
} from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import type {
  ClaimToolActivityEntryDto,
  ClaimToolCategory,
  ClaimToolClaimablesDto,
  ClaimToolClaimRequestDto,
  ClaimToolItemDto,
  ClaimToolRunResultDto,
  ClaimToolSnapshotDto,
} from "@/bindings/claim_tool";
import { LcuImage } from "@/components/LcuImage";
import { RefreshButton } from "@/components/RefreshButton";
import { SummonerID } from "@/components/SummonerID";
import { SettingsToggle } from "@/components/settings-ui";
import { useSettings } from "@/features/settings/context";
import type { SettingId } from "@/features/settings/types";
import { toErrorMessage } from "@/infra/errors";
import { selectIsFocused, useLcuStore } from "@/stores/lcu";
import * as s from "./ClaimToolPanel.css";

const AUTO_CLAIM_SETTING_ID =
  "tools.claimTool.autoClaimEnabled" as const satisfies SettingId;
const CLAIM_TOOL_RUN_COMPLETED_EVENT = "claim-tool-run-completed";
const CLAIM_TOOL_SNAPSHOT_REFRESH_INTERVAL_MS = 5000;

type ClaimBucket = "rewards" | "missions" | "eventHub";
type SelectionState = Record<ClaimBucket, Set<string>>;

const emptySelection = (): SelectionState => ({
  rewards: new Set<string>(),
  missions: new Set<string>(),
  eventHub: new Set<string>(),
});

const sectionConfig = [
  {
    key: "rewards",
    icon: Gift,
    titleKey: "tools.claimTool.sections.rewards",
  },
  {
    key: "missions",
    icon: ListChecks,
    titleKey: "tools.claimTool.sections.missions",
  },
  {
    key: "eventHub",
    icon: CalendarCheck,
    titleKey: "tools.claimTool.sections.eventHub",
  },
] as const;

function useAutoClaimEnabled(): boolean {
  const settings = useSettings();
  return useSyncExternalStore(
    (onStoreChange) => settings.subscribe(AUTO_CLAIM_SETTING_ID, onStoreChange),
    () => settings.get<boolean>(AUTO_CLAIM_SETTING_ID) ?? false,
    () => settings.get<boolean>(AUTO_CLAIM_SETTING_ID) ?? false,
  );
}

function claimableIds(
  data: ClaimToolClaimablesDto | undefined,
): SelectionState {
  const next = emptySelection();
  if (!data) {
    return next;
  }

  for (const section of sectionConfig) {
    for (const item of data[section.key]) {
      if (item.status === "claimable") {
        next[section.key].add(item.id);
      }
    }
  }
  return next;
}

function selectedCount(selection: SelectionState): number {
  return Object.values(selection).reduce((count, ids) => count + ids.size, 0);
}

function requestFromSelection(
  selection: SelectionState,
): ClaimToolClaimRequestDto {
  return {
    rewards: [...selection.rewards],
    missions: [...selection.missions],
    eventHub: [...selection.eventHub],
  };
}

function categoryLabelKey(category: ClaimToolCategory | null): string {
  switch (category) {
    case "reward":
      return "tools.claimTool.sections.rewards";
    case "mission":
      return "tools.claimTool.sections.missions";
    case "eventHub":
      return "tools.claimTool.sections.eventHub";
    default:
      return "tools.claimTool.activity.system";
  }
}

function formatActivityTime(timestampMs: number, language: string): string {
  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }
  return date.toLocaleTimeString(language, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ItemIcon({ item }: { item: ClaimToolItemDto }) {
  const FallbackIcon = item.category === "eventHub" ? CalendarCheck : PackageX;

  if (!item.iconUrl) {
    return (
      <span className={s.itemImageFallback} aria-hidden="true">
        <FallbackIcon size={16} />
      </span>
    );
  }

  return (
    <LcuImage
      src={item.iconUrl}
      alt=""
      className={s.itemImage}
      fallbackClassName={s.itemImageFallback}
      loadingClassName={s.itemImageFallback}
    />
  );
}

function ClaimItemRow({
  bucket,
  checked,
  item,
  onCheckedChange,
}: {
  bucket: ClaimBucket;
  checked: boolean;
  item: ClaimToolItemDto;
  onCheckedChange: (bucket: ClaimBucket, id: string, checked: boolean) => void;
}) {
  const { t } = useTranslation();
  const claimable = item.status === "claimable";

  return (
    <div className={s.itemRow} data-status={item.status}>
      <Checkbox.Root
        aria-label={`Select claim item ${item.id}`}
        checked={checked}
        disabled={!claimable}
        className={s.checkboxRoot}
        onCheckedChange={(details) => {
          onCheckedChange(bucket, item.id, details.checked === true);
        }}
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control className={s.checkboxControl}>
          <Checkbox.Indicator className={s.checkboxIndicator}>
            <Check size={13} aria-hidden="true" />
          </Checkbox.Indicator>
        </Checkbox.Control>
      </Checkbox.Root>

      <ItemIcon item={item} />

      <div className={s.itemMain}>
        <div className={s.itemTitleLine}>
          <span className={s.itemTitle}>{item.title}</span>
          {item.quantity ? (
            <span className={s.quantity}>x{item.quantity}</span>
          ) : null}
        </div>
        <div className={s.itemMeta}>
          {item.subtitle ? (
            <span className={s.itemMetaText}>{item.subtitle}</span>
          ) : null}
          {item.choiceCount > 1 ? (
            <span className={s.itemMetaText}>
              {t("tools.claimTool.choiceCount", { count: item.choiceCount })}
            </span>
          ) : null}
          {item.reason ? (
            <span className={s.itemMetaText}>{item.reason}</span>
          ) : null}
        </div>
        {item.children.length > 0 ? (
          <div className={s.childList}>
            {item.children.map((child) => (
              <span className={s.childItem} key={child.id}>
                <LcuImage
                  src={child.iconUrl}
                  alt=""
                  className={s.childImage}
                  fallbackClassName={s.childImageFallback}
                  loadingClassName={s.childImageFallback}
                />
                <span className={s.childText}>{child.title}</span>
                {child.quantity ? (
                  <span className={s.childText}>x{child.quantity}</span>
                ) : null}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <span className={s.statusPill({ status: item.status })}>
        {t(`tools.claimTool.status.${item.status}`)}
      </span>
    </div>
  );
}

function ClaimSection({
  bucket,
  icon: Icon,
  items,
  selected,
  title,
  onCheckedChange,
}: {
  bucket: ClaimBucket;
  icon: LucideIcon;
  items: ClaimToolItemDto[];
  selected: Set<string>;
  title: string;
  onCheckedChange: (bucket: ClaimBucket, id: string, checked: boolean) => void;
}) {
  const { t } = useTranslation();
  const claimableCount = items.filter(
    (item) => item.status === "claimable",
  ).length;

  return (
    <section className={s.section}>
      <div className={s.sectionHeader}>
        <div className={s.sectionTitle}>
          <Icon size={16} aria-hidden="true" />
          <span className={s.sectionTitleText}>{title}</span>
        </div>
        <span className={s.sectionCount}>
          {claimableCount}/{items.length}
        </span>
      </div>

      <div className={s.itemList}>
        {items.length > 0 ? (
          items.map((item) => (
            <ClaimItemRow
              key={item.id}
              bucket={bucket}
              item={item}
              checked={selected.has(item.id)}
              onCheckedChange={onCheckedChange}
            />
          ))
        ) : (
          <div className={s.emptyState}>{t("tools.claimTool.empty")}</div>
        )}
      </div>
    </section>
  );
}

function ActivityList({ entries }: { entries: ClaimToolActivityEntryDto[] }) {
  const { i18n, t } = useTranslation();

  return (
    <section className={s.activitySection}>
      <div className={s.sectionHeader}>
        <div className={s.sectionTitle}>
          <Activity size={16} aria-hidden="true" />
          <span className={s.sectionTitleText}>
            {t("tools.claimTool.activity.title")}
          </span>
        </div>
      </div>
      <div className={s.activityList}>
        {entries.length > 0 ? (
          entries.map((entry) => (
            <div
              className={s.activityRow}
              data-level={entry.level}
              key={`${entry.timestampMs}-${entry.action}-${entry.message}`}
            >
              <span className={s.activityTime}>
                {formatActivityTime(entry.timestampMs, i18n.language)}
              </span>
              <span>{t(categoryLabelKey(entry.category))}</span>
              <span className={s.activityMessage}>{entry.message}</span>
            </div>
          ))
        ) : (
          <div className={s.emptyState}>
            {t("tools.claimTool.activity.empty")}
          </div>
        )}
      </div>
    </section>
  );
}

function StatusRow({
  errorMessage,
  focusedClient,
}: {
  errorMessage: string | null;
  focusedClient: ReturnType<typeof selectIsFocused>;
}) {
  const { t } = useTranslation();

  if (!focusedClient) {
    return (
      <div className={s.statusRow} data-tone="neutral">
        {t("tools.claimTool.noFocusedClient")}
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className={s.statusRow} data-tone="error">
        {errorMessage}
      </div>
    );
  }

  return (
    <div className={s.statusRow} data-tone="neutral">
      <span className={s.statusLabel}>
        {t("tools.claimTool.focusedClient")}
      </span>
      {focusedClient.summoner ? (
        <SummonerID summoner={focusedClient.summoner} />
      ) : (
        <span className={s.statusText}>PID: {focusedClient.pid}</span>
      )}
    </div>
  );
}

export function ClaimToolPanel() {
  const { t } = useTranslation();
  const settings = useSettings();
  const focusedClient = useLcuStore(selectIsFocused);
  const hasFocusedClient = focusedClient !== undefined;
  const autoClaimEnabled = useAutoClaimEnabled();
  const [selection, setSelection] = useState<SelectionState>(() =>
    emptySelection(),
  );
  const [isClaiming, setIsClaiming] = useState(false);

  const claimables = useSWR(
    hasFocusedClient ? "claim_tool_refresh" : null,
    () => invoke<ClaimToolClaimablesDto>("claim_tool_refresh"),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const snapshot = useSWR(
    "claim_tool_get_snapshot",
    () => invoke<ClaimToolSnapshotDto>("claim_tool_get_snapshot"),
    {
      refreshInterval: CLAIM_TOOL_SNAPSHOT_REFRESH_INTERVAL_MS,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const claimablesData = hasFocusedClient ? claimables.data : undefined;

  useEffect(() => {
    setSelection(claimableIds(claimablesData));
  }, [claimablesData]);

  const count = selectedCount(selection);
  const canClaim = hasFocusedClient && count > 0 && !isClaiming;
  const isBusy = isClaiming || snapshot.data?.isRunning === true;
  const errorMessage =
    hasFocusedClient && claimables.error
      ? toErrorMessage(claimables.error)
      : null;

  const toggleSelection = (
    bucket: ClaimBucket,
    id: string,
    checked: boolean,
  ) => {
    setSelection((current) => {
      const next = {
        rewards: new Set(current.rewards),
        missions: new Set(current.missions),
        eventHub: new Set(current.eventHub),
      };
      if (checked) {
        next[bucket].add(id);
      } else {
        next[bucket].delete(id);
      }
      return next;
    });
  };

  const refresh = async () => {
    if (!hasFocusedClient) {
      return;
    }
    await claimables.mutate();
    await snapshot.mutate();
  };

  const handleRunCompleted = useEffectEvent((result: ClaimToolRunResultDto) => {
    void snapshot.mutate(result.snapshot, { revalidate: false });
    if (hasFocusedClient) {
      void claimables.mutate();
    }
  });

  useEffect(() => {
    let cancelled = false;
    let unlisten: UnlistenFn | null = null;

    const setup = async () => {
      unlisten = await listen<ClaimToolRunResultDto>(
        CLAIM_TOOL_RUN_COMPLETED_EVENT,
        (event) => {
          if (cancelled) {
            return;
          }

          handleRunCompleted(event.payload);
        },
      );
    };

    void setup();

    return () => {
      cancelled = true;
      if (unlisten) {
        void unlisten();
      }
    };
  }, []);

  const applyRunResult = async (result: ClaimToolRunResultDto) => {
    await snapshot.mutate(result.snapshot, { revalidate: false });
    if (hasFocusedClient) {
      await claimables.mutate();
    }
  };

  const claimSelected = async () => {
    if (!canClaim) {
      return;
    }
    setIsClaiming(true);
    try {
      const result = await invoke<ClaimToolRunResultDto>(
        "claim_tool_claim_selected",
        { request: requestFromSelection(selection) },
      );
      await applyRunResult(result);
    } finally {
      setIsClaiming(false);
    }
  };

  const claimAll = async () => {
    if (!hasFocusedClient) {
      return;
    }
    setIsClaiming(true);
    try {
      const result = await invoke<ClaimToolRunResultDto>(
        "claim_tool_claim_all",
      );
      await applyRunResult(result);
    } finally {
      setIsClaiming(false);
    }
  };

  const sections = useMemo(
    () =>
      sectionConfig.map((section) => ({
        ...section,
        items: claimablesData?.[section.key] ?? [],
      })),
    [claimablesData],
  );

  return (
    <div className={s.root}>
      <div className={s.toolbar}>
        <div className={s.heading}>
          <span className={s.subtle}>
            {snapshot.data?.lastRunAtMs
              ? t("tools.claimTool.lastRun", {
                  time: formatActivityTime(
                    snapshot.data.lastRunAtMs,
                    window.navigator.language,
                  ),
                })
              : t("tools.claimTool.idle")}
          </span>
        </div>

        <div className={s.actions}>
          <div className={s.autoClaimControl}>
            <span>{t("tools.claimTool.autoClaimText")}</span>
            <SettingsToggle
              ariaLabel="Toggle automatic reward claim"
              checked={autoClaimEnabled}
              onCheckedChange={(checked) => {
                settings.set(AUTO_CLAIM_SETTING_ID, checked);
                void snapshot.mutate();
              }}
            />
          </div>
          <RefreshButton
            ariaLabel="Refresh claimable rewards"
            loading={claimables.isValidating}
            disabled={!hasFocusedClient || isBusy}
            onClick={() => {
              void refresh();
            }}
          />
          <button
            type="button"
            className={s.actionButton}
            disabled={!canClaim}
            onClick={() => {
              void claimSelected();
            }}
          >
            <Check size={15} aria-hidden="true" />
            <span>{t("tools.claimTool.claimSelected", { count })}</span>
          </button>
          <button
            type="button"
            className={s.actionButton}
            disabled={!hasFocusedClient || isBusy}
            onClick={() => {
              void claimAll();
            }}
          >
            <Play size={15} aria-hidden="true" />
            <span>{t("tools.claimTool.claimAll")}</span>
          </button>
        </div>
      </div>

      <StatusRow errorMessage={errorMessage} focusedClient={focusedClient} />

      <div className={s.sections}>
        {sections.map((section) => (
          <ClaimSection
            key={section.key}
            bucket={section.key}
            icon={section.icon}
            title={t(section.titleKey)}
            items={section.items}
            selected={selection[section.key]}
            onCheckedChange={toggleSelection}
          />
        ))}
      </div>

      <ActivityList entries={snapshot.data?.recentActivity ?? []} />
    </div>
  );
}

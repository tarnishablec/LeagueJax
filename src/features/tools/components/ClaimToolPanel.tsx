import { Checkbox } from "@ark-ui/react/checkbox";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  Activity,
  CalendarCheck,
  Check,
  Gift,
  ListChecks,
  Loader,
  type LucideIcon,
  Minus,
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
  ClaimToolClaimablesAvailableEventDto,
  ClaimToolClaimablesDto,
  ClaimToolItemDto,
  ClaimToolRunResultDto,
  ClaimToolSnapshotDto,
} from "@/bindings/claim_tool";
import { LcuImage } from "@/components/LcuImage";
import { RefreshButton } from "@/components/RefreshButton";
import { SummonerID } from "@/components/SummonerID";
import { SettingsToggle } from "@/components/settings-ui";
import { useSettings } from "@/features/settings/context";
import { toErrorMessage } from "@/infra/errors";
import { selectIsFocused, useLcuStore } from "@/stores/lcu";
import {
  CLAIM_TOOL_CLAIMABLES_AVAILABLE_EVENT,
  CLAIM_TOOL_NOTIFICATION_SETTING_ID,
} from "../claim-tool-notifications";
import {
  addHiddenClaimedIds,
  applyBucketSelection,
  bucketHasClaimableItems,
  bucketSelectionCheckedState,
  type ClaimBucket,
  type ClaimBucketIds,
  claimableIds,
  createEmptyClaimBucketIds,
  filterClaimablesByHiddenIds,
  pruneHiddenClaimedIds,
  requestFromSelection,
  selectedCount,
} from "../claim-tool-selection";
import * as s from "./ClaimToolPanel.css";

const CLAIM_TOOL_SNAPSHOT_REFRESH_INTERVAL_MS = 5000;
const CLAIM_TOOL_MIN_CLAIMING_MS = 1000;

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

function useClaimNotificationEnabled(): boolean {
  const settings = useSettings();
  return useSyncExternalStore(
    (onStoreChange) =>
      settings.subscribe(CLAIM_TOOL_NOTIFICATION_SETTING_ID, onStoreChange),
    () => settings.get<boolean>(CLAIM_TOOL_NOTIFICATION_SETTING_ID) ?? false,
    () => settings.get<boolean>(CLAIM_TOOL_NOTIFICATION_SETTING_ID) ?? false,
  );
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

function bucketSelectAllAriaLabel(bucket: ClaimBucket): string {
  switch (bucket) {
    case "rewards":
      return "Toggle all reward claim items";
    case "missions":
      return "Toggle all mission claim items";
    case "eventHub":
      return "Toggle all event hub claim items";
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

// Fast claim requests can otherwise flash the busy overlay too briefly to read as a stable state.
async function waitForMinimumClaimingDuration(startedAtMs: number) {
  const elapsedMs = performance.now() - startedAtMs;
  const remainingMs = Math.max(0, CLAIM_TOOL_MIN_CLAIMING_MS - elapsedMs);
  if (remainingMs <= 0) {
    return;
  }

  await new Promise((resolve) => {
    window.setTimeout(resolve, remainingMs);
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
  disabled,
  item,
  onCheckedChange,
}: {
  bucket: ClaimBucket;
  checked: boolean;
  disabled: boolean;
  item: ClaimToolItemDto;
  onCheckedChange: (bucket: ClaimBucket, id: string, checked: boolean) => void;
}) {
  const { t } = useTranslation();
  const claimable = item.status === "claimable";
  const hasMeta = Boolean(item.subtitle || item.choiceCount > 1 || item.reason);

  return (
    <div className={s.itemRow} data-status={item.status}>
      <Checkbox.Root
        aria-label={`Select claim item ${item.id}`}
        checked={checked}
        disabled={!claimable || disabled}
        className={s.checkboxRoot}
        onCheckedChange={(details) => {
          if (disabled) {
            return;
          }
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
        {hasMeta ? (
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
        ) : null}
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
  busy,
  icon: Icon,
  items,
  selected,
  title,
  onBucketCheckedChange,
  onCheckedChange,
}: {
  bucket: ClaimBucket;
  busy: boolean;
  icon: LucideIcon;
  items: ClaimToolItemDto[];
  selected: Set<string>;
  title: string;
  onBucketCheckedChange: (
    bucket: ClaimBucket,
    items: ClaimToolItemDto[],
    checked: boolean,
  ) => void;
  onCheckedChange: (bucket: ClaimBucket, id: string, checked: boolean) => void;
}) {
  const { t } = useTranslation();
  const claimableCount = items.filter(
    (item) => item.status === "claimable",
  ).length;
  const bucketCheckedState = bucketSelectionCheckedState(items, selected);
  const canToggleBucket = !busy && bucketHasClaimableItems(items);

  return (
    <section className={s.section} aria-busy={busy} data-busy={busy}>
      <div className={s.sectionHeader}>
        <div className={s.sectionTitle}>
          <Checkbox.Root
            aria-label={bucketSelectAllAriaLabel(bucket)}
            checked={bucketCheckedState}
            disabled={!canToggleBucket}
            className={s.checkboxRoot}
            onCheckedChange={() => {
              if (!canToggleBucket) {
                return;
              }
              onBucketCheckedChange(
                bucket,
                items,
                bucketCheckedState === false,
              );
            }}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control className={s.checkboxControl}>
              <Checkbox.Indicator className={s.checkboxIndicator}>
                {bucketCheckedState === "indeterminate" ? (
                  <Minus size={13} aria-hidden="true" />
                ) : (
                  <Check size={13} aria-hidden="true" />
                )}
              </Checkbox.Indicator>
            </Checkbox.Control>
          </Checkbox.Root>
          <Icon size={16} aria-hidden="true" />
          <span className={s.sectionTitleText}>{title}</span>
        </div>
        <span className={s.sectionCount}>
          {claimableCount}/{items.length}
        </span>
      </div>

      {items.length > 0 ? (
        <div className={s.itemList}>
          {items.map((item) => (
            <ClaimItemRow
              key={item.id}
              bucket={bucket}
              disabled={busy}
              item={item}
              checked={selected.has(item.id)}
              onCheckedChange={onCheckedChange}
            />
          ))}
        </div>
      ) : busy ? (
        <div className={s.emptyPlaceholder} />
      ) : (
        <div className={s.emptyState}>{t("tools.claimTool.empty")}</div>
      )}
      {busy ? (
        <div className={s.panelBusyOverlay} aria-hidden="true">
          <Loader size={18} className={s.busyIcon} />
        </div>
      ) : null}
    </section>
  );
}

function ActivityList({
  busy,
  entries,
}: {
  busy: boolean;
  entries: ClaimToolActivityEntryDto[];
}) {
  const { i18n, t } = useTranslation();

  return (
    <section className={s.activitySection} aria-busy={busy} data-busy={busy}>
      <div className={s.sectionHeader}>
        <div className={s.sectionTitle}>
          <Activity size={16} aria-hidden="true" />
          <span className={s.sectionTitleText}>
            {t("tools.claimTool.activity.title")}
          </span>
        </div>
      </div>
      {entries.length > 0 ? (
        <div className={s.activityList}>
          {entries.map((entry) => (
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
          ))}
        </div>
      ) : busy ? (
        <div className={s.emptyPlaceholder} />
      ) : (
        <div className={s.emptyState}>
          {t("tools.claimTool.activity.empty")}
        </div>
      )}
      {busy ? (
        <div className={s.panelBusyOverlay} aria-hidden="true">
          <Loader size={18} className={s.busyIcon} />
        </div>
      ) : null}
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
  const claimNotificationEnabled = useClaimNotificationEnabled();
  const [selection, setSelection] = useState<ClaimBucketIds>(() =>
    createEmptyClaimBucketIds(),
  );
  const [hiddenClaimedIds, setHiddenClaimedIds] = useState<ClaimBucketIds>(() =>
    createEmptyClaimBucketIds(),
  );
  const [isClaiming, setIsClaiming] = useState(false);
  const focusedClientKey = focusedClient ? String(focusedClient.pid) : null;

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
  const rawClaimablesData = hasFocusedClient ? claimables.data : undefined;
  const claimablesData = useMemo(
    () => filterClaimablesByHiddenIds(rawClaimablesData, hiddenClaimedIds),
    [hiddenClaimedIds, rawClaimablesData],
  );

  useEffect(() => {
    if (focusedClientKey === null) {
      setHiddenClaimedIds(createEmptyClaimBucketIds());
      return;
    }
    setHiddenClaimedIds(createEmptyClaimBucketIds());
  }, [focusedClientKey]);

  useEffect(() => {
    setHiddenClaimedIds((current) =>
      pruneHiddenClaimedIds(current, rawClaimablesData),
    );
  }, [rawClaimablesData]);

  useEffect(() => {
    setSelection(claimableIds(claimablesData));
  }, [claimablesData]);

  const count = selectedCount(selection);
  const isBusy = isClaiming || snapshot.data?.isRunning === true;
  const canClaim = hasFocusedClient && count > 0 && !isBusy;
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

  const toggleBucketSelection = (
    bucket: ClaimBucket,
    items: ClaimToolItemDto[],
    checked: boolean,
  ) => {
    setSelection((current) =>
      applyBucketSelection(current, bucket, items, checked),
    );
  };

  const refresh = async () => {
    if (!hasFocusedClient) {
      return;
    }
    await claimables.mutate();
    await snapshot.mutate();
  };

  const handleClaimablesAvailable = useEffectEvent(
    (payload: ClaimToolClaimablesAvailableEventDto) => {
      void snapshot.mutate(payload.snapshot, { revalidate: false });
      void claimables.mutate(payload.claimables, { revalidate: false });
    },
  );

  useEffect(() => {
    let cancelled = false;
    let unlisten: UnlistenFn | null = null;

    const setup = async () => {
      unlisten = await listen<ClaimToolClaimablesAvailableEventDto>(
        CLAIM_TOOL_CLAIMABLES_AVAILABLE_EVENT,
        (event) => {
          if (cancelled) {
            return;
          }

          handleClaimablesAvailable(event.payload);
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

  const applyRunResult = async (
    result: ClaimToolRunResultDto,
    requestedIds: ClaimBucketIds,
  ) => {
    const request = requestFromSelection(requestedIds);
    setHiddenClaimedIds((current) =>
      addHiddenClaimedIds(current, request, result),
    );
    await snapshot.mutate(result.snapshot, { revalidate: false });
    if (hasFocusedClient) {
      await claimables.mutate();
    }
  };

  const claimSelected = async () => {
    if (!canClaim) {
      return;
    }
    const requestedIds = {
      rewards: new Set(selection.rewards),
      missions: new Set(selection.missions),
      eventHub: new Set(selection.eventHub),
    };
    const claimingStartedAtMs = performance.now();
    setIsClaiming(true);
    try {
      const result = await invoke<ClaimToolRunResultDto>(
        "claim_tool_claim_selected",
        { request: requestFromSelection(requestedIds) },
      );
      await applyRunResult(result, requestedIds);
    } finally {
      await waitForMinimumClaimingDuration(claimingStartedAtMs);
      setIsClaiming(false);
    }
  };

  const claimAll = async () => {
    if (!hasFocusedClient) {
      return;
    }
    const requestedIds = claimableIds(claimablesData);
    const claimingStartedAtMs = performance.now();
    setIsClaiming(true);
    try {
      const result = await invoke<ClaimToolRunResultDto>(
        "claim_tool_claim_all",
      );
      await applyRunResult(result, requestedIds);
    } finally {
      await waitForMinimumClaimingDuration(claimingStartedAtMs);
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
          <div className={s.notificationControl}>
            <span>{t("tools.claimTool.claimNotificationText")}</span>
            <SettingsToggle
              ariaLabel="Toggle claim notifications"
              checked={claimNotificationEnabled}
              disabled={isBusy}
              onCheckedChange={(checked) => {
                settings.set(CLAIM_TOOL_NOTIFICATION_SETTING_ID, checked);
                void snapshot.mutate();
              }}
            />
          </div>
          <RefreshButton
            ariaLabel="Refresh claimable rewards"
            loading={claimables.isValidating || isClaiming}
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
            busy={isBusy}
            icon={section.icon}
            title={t(section.titleKey)}
            items={section.items}
            selected={selection[section.key]}
            onBucketCheckedChange={toggleBucketSelection}
            onCheckedChange={toggleSelection}
          />
        ))}
      </div>

      <ActivityList
        busy={isBusy}
        entries={snapshot.data?.recentActivity ?? []}
      />
    </div>
  );
}

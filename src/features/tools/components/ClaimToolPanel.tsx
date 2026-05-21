/** @jsxImportSource solid-js */
import { Checkbox } from "@ark-ui/solid/checkbox";
import { keyArray } from "@solid-primitives/keyed";
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
} from "lucide-solid";
import type { Accessor, JSX } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import type {
  ClaimToolActivityEntryDto,
  ClaimToolCategory,
  ClaimToolClaimablesAvailableEventDto,
  ClaimToolClaimablesDto,
  ClaimToolItemDto,
  ClaimToolRunResultDto,
  ClaimToolSnapshotDto,
} from "@/bindings/claim_tool";
import type { LcuInstanceInfo } from "@/bindings/lcu";
import { LcuImage } from "@/components/LcuImage";
import { RefreshButton } from "@/components/RefreshButton";
import { SummonerID } from "@/components/SummonerID";
import { SettingsToggle } from "@/components/settings-ui";
import { useSolidSettings } from "@/features/settings/solid-context.solid";
import { useSolidTranslation } from "@/i18n/solid";
import { toErrorMessage } from "@/infra/errors";
import { createSolidQuery } from "@/infra/solid-query";
import { selectIsFocused, useSolidLcuStore } from "@/stores/lcu.solid";
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
import * as s from "./ClaimToolPanel.css.ts";

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

function useClaimNotificationEnabled(): Accessor<boolean> {
  const settings = useSolidSettings();
  const [enabled, setEnabled] = createSignal(
    settings.get<boolean>(CLAIM_TOOL_NOTIFICATION_SETTING_ID) ?? false,
  );

  onMount(() => {
    const sync = () => {
      setEnabled(
        settings.get<boolean>(CLAIM_TOOL_NOTIFICATION_SETTING_ID) ?? false,
      );
    };
    const unsubscribe = settings.subscribe(
      CLAIM_TOOL_NOTIFICATION_SETTING_ID,
      sync,
    );
    sync();
    onCleanup(unsubscribe);
  });

  return enabled;
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

function cloneClaimBucketIds(ids: ClaimBucketIds): ClaimBucketIds {
  return {
    rewards: new Set(ids.rewards),
    missions: new Set(ids.missions),
    eventHub: new Set(ids.eventHub),
  };
}

async function fetchClaimables(): Promise<ClaimToolClaimablesDto> {
  return invoke<ClaimToolClaimablesDto>("claim_tool_refresh");
}

async function fetchSnapshot(): Promise<ClaimToolSnapshotDto> {
  return invoke<ClaimToolSnapshotDto>("claim_tool_get_snapshot");
}

function ItemIcon(props: { item: ClaimToolItemDto }): JSX.Element {
  const FallbackIcon =
    props.item.category === "eventHub" ? CalendarCheck : PackageX;

  return (
    <Show
      when={props.item.iconUrl}
      fallback={
        <span class={s.itemImageFallback} aria-hidden="true">
          <FallbackIcon size={16} />
        </span>
      }
    >
      {(iconUrl) => (
        <LcuImage
          src={iconUrl()}
          alt=""
          className={s.itemImage}
          fallbackClassName={s.itemImageFallback}
          loadingClassName={s.itemImageFallback}
        />
      )}
    </Show>
  );
}

function ClaimItemRow(props: {
  bucket: ClaimBucket;
  checked: boolean;
  disabled: boolean;
  item: ClaimToolItemDto;
  onCheckedChange: (bucket: ClaimBucket, id: string, checked: boolean) => void;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const claimable = () => props.item.status === "claimable";
  const hasMeta = () =>
    Boolean(
      props.item.subtitle || props.item.choiceCount > 1 || props.item.reason,
    );
  const childItems = keyArray(
    () => props.item.children,
    (child) => child.id,
    (child) => (
      <span class={s.childItem}>
        <LcuImage
          src={child().iconUrl}
          alt=""
          className={s.childImage}
          fallbackClassName={s.childImageFallback}
          loadingClassName={s.childImageFallback}
        />
        <span class={s.childText}>{child().title}</span>
        <Show when={child().quantity}>
          {(quantity) => <span class={s.childText}>x{quantity()}</span>}
        </Show>
      </span>
    ),
  );

  return (
    <div class={s.itemRow} data-status={props.item.status}>
      <Checkbox.Root
        aria-label={`Select claim item ${props.item.id}`}
        checked={props.checked}
        disabled={!claimable() || props.disabled}
        class={s.checkboxRoot}
        onCheckedChange={(details) => {
          if (props.disabled) {
            return;
          }
          props.onCheckedChange(
            props.bucket,
            props.item.id,
            details.checked === true,
          );
        }}
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control class={s.checkboxControl}>
          <Checkbox.Indicator class={s.checkboxIndicator}>
            <Check size={13} aria-hidden="true" />
          </Checkbox.Indicator>
        </Checkbox.Control>
      </Checkbox.Root>

      <ItemIcon item={props.item} />

      <div class={s.itemMain}>
        <div class={s.itemTitleLine}>
          <span class={s.itemTitle}>{props.item.title}</span>
          <Show when={props.item.quantity}>
            {(quantity) => <span class={s.quantity}>x{quantity()}</span>}
          </Show>
        </div>
        <Show when={hasMeta()}>
          <div class={s.itemMeta}>
            <Show when={props.item.subtitle}>
              {(subtitle) => <span class={s.itemMetaText}>{subtitle()}</span>}
            </Show>
            <Show when={props.item.choiceCount > 1}>
              <span class={s.itemMetaText}>
                {t("tools.claimTool.choiceCount", {
                  count: props.item.choiceCount,
                })}
              </span>
            </Show>
            <Show when={props.item.reason}>
              {(reason) => <span class={s.itemMetaText}>{reason()}</span>}
            </Show>
          </div>
        </Show>
        <Show when={props.item.children.length > 0}>
          <div class={s.childList}>{childItems()}</div>
        </Show>
      </div>

      <span class={s.statusPill({ status: props.item.status })}>
        {t(`tools.claimTool.status.${props.item.status}`)}
      </span>
    </div>
  );
}

function ClaimSection(props: {
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
}): JSX.Element {
  const { t } = useSolidTranslation();
  const claimableCount = createMemo(
    () => props.items.filter((item) => item.status === "claimable").length,
  );
  const bucketCheckedState = createMemo(() =>
    bucketSelectionCheckedState(props.items, props.selected),
  );
  const canToggleBucket = createMemo(
    () => !props.busy && bucketHasClaimableItems(props.items),
  );
  const itemRows = keyArray(
    () => props.items,
    (item) => item.id,
    (item) => (
      <ClaimItemRow
        bucket={props.bucket}
        disabled={props.busy}
        item={item()}
        checked={props.selected.has(item().id)}
        onCheckedChange={props.onCheckedChange}
      />
    ),
  );

  return (
    <section class={s.section} aria-busy={props.busy} data-busy={props.busy}>
      <div class={s.sectionHeader}>
        <div class={s.sectionTitle}>
          <props.icon size={16} aria-hidden="true" />
          <span class={s.sectionTitleText}>{props.title}</span>
        </div>
        <span class={s.sectionCount}>
          <Checkbox.Root
            aria-label={bucketSelectAllAriaLabel(props.bucket)}
            checked={bucketCheckedState()}
            disabled={!canToggleBucket()}
            class={s.checkboxRoot}
            onCheckedChange={() => {
              if (!canToggleBucket()) {
                return;
              }
              props.onBucketCheckedChange(
                props.bucket,
                props.items,
                bucketCheckedState() === false,
              );
            }}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control class={s.checkboxControl}>
              <Checkbox.Indicator class={s.checkboxIndicator}>
                {bucketCheckedState() === "indeterminate" ? (
                  <Minus size={13} aria-hidden="true" />
                ) : (
                  <Check size={13} aria-hidden="true" />
                )}
              </Checkbox.Indicator>
            </Checkbox.Control>
          </Checkbox.Root>
          <span>
            {claimableCount()}/{props.items.length}
          </span>
        </span>
      </div>

      <Show
        when={props.items.length > 0}
        fallback={
          props.busy ? (
            <div class={s.emptyPlaceholder} />
          ) : (
            <div class={s.emptyState}>{t("tools.claimTool.empty")}</div>
          )
        }
      >
        <div class={s.itemList}>{itemRows()}</div>
      </Show>
      <Show when={props.busy}>
        <div class={s.panelBusyOverlay} aria-hidden="true">
          <Loader size={18} class={s.busyIcon} />
        </div>
      </Show>
    </section>
  );
}

function ActivityList(props: {
  busy: boolean;
  entries: ClaimToolActivityEntryDto[];
}): JSX.Element {
  const { language, t } = useSolidTranslation();
  const activityRows = keyArray(
    () => props.entries,
    (entry) => `${entry.timestampMs}-${entry.action}-${entry.message}`,
    (entry) => (
      <div
        class={s.activityRow}
        data-level={entry().level}
        data-key={`${entry().timestampMs}-${entry().action}-${entry().message}`}
      >
        <span class={s.activityTime}>
          {formatActivityTime(entry().timestampMs, language())}
        </span>
        <span>{t(categoryLabelKey(entry().category))}</span>
        <span class={s.activityMessage}>{entry().message}</span>
      </div>
    ),
  );

  return (
    <section
      class={s.activitySection}
      aria-busy={props.busy}
      data-busy={props.busy}
    >
      <div class={s.sectionHeader}>
        <div class={s.sectionTitle}>
          <Activity size={16} aria-hidden="true" />
          <span class={s.sectionTitleText}>
            {t("tools.claimTool.activity.title")}
          </span>
        </div>
      </div>
      <Show
        when={props.entries.length > 0}
        fallback={
          props.busy ? (
            <div class={s.emptyPlaceholder} />
          ) : (
            <div class={s.emptyState}>
              {t("tools.claimTool.activity.empty")}
            </div>
          )
        }
      >
        <div class={s.activityList}>{activityRows()}</div>
      </Show>
      <Show when={props.busy}>
        <div class={s.panelBusyOverlay} aria-hidden="true">
          <Loader size={18} class={s.busyIcon} />
        </div>
      </Show>
    </section>
  );
}

function StatusRow(props: {
  connectionLabelKey: string | null;
  errorMessage: string | null;
  focusedClient: LcuInstanceInfo | undefined;
}): JSX.Element {
  const { t } = useSolidTranslation();

  return (
    <Show
      when={props.focusedClient}
      fallback={
        <div class={s.statusRow} data-tone="neutral">
          {t("tools.claimTool.noFocusedClient")}
        </div>
      }
    >
      {(focusedClient) => (
        <Show
          when={!props.connectionLabelKey}
          fallback={
            <div class={s.statusRow} data-tone="neutral">
              {t(props.connectionLabelKey ?? "")}
            </div>
          }
        >
          <Show
            when={!props.errorMessage}
            fallback={
              <div class={s.statusRow} data-tone="error">
                {props.errorMessage}
              </div>
            }
          >
            <div class={s.statusRow} data-tone="neutral">
              <span class={s.statusLabel}>
                {t("tools.claimTool.focusedClient")}
              </span>
              <Show
                when={focusedClient().summoner}
                fallback={
                  <span class={s.statusText}>PID: {focusedClient().pid}</span>
                }
              >
                {(summoner) => <SummonerID summoner={summoner()} />}
              </Show>
            </div>
          </Show>
        </Show>
      )}
    </Show>
  );
}

function useClaimToolClientState() {
  const focusedInstance = useSolidLcuStore((state) =>
    state.instances.find((instance) => instance.isFocused),
  );
  const focusedReadyClient = useSolidLcuStore(selectIsFocused);
  const connectingInstance = useSolidLcuStore((state) =>
    state.instances.find(
      (instance) => instance.state !== "ready" && instance.state !== "closing",
    ),
  );
  const displayClient = createMemo(
    () => focusedReadyClient() ?? focusedInstance() ?? connectingInstance(),
  );

  return {
    displayClient,
    focusedReadyClient,
    focusedClientKey: createMemo(() =>
      displayClient() ? String(displayClient()?.pid) : null,
    ),
    hasFocusedClient: createMemo(() => focusedReadyClient() !== undefined),
    hasVisibleClient: createMemo(() => displayClient() !== undefined),
  };
}

function claimToolConnectionLabelKey(
  client: LcuInstanceInfo | undefined,
  hasFocusedClient: boolean,
  hasVisibleClient: boolean,
  isClaimablesInitializing: boolean,
): string | null {
  if (client?.state === "closing") {
    return "clientStatus.closing";
  }

  if (hasVisibleClient && (!hasFocusedClient || isClaimablesInitializing)) {
    return "clientStatus.authenticating";
  }

  return null;
}

export function ClaimToolPanel(): JSX.Element {
  const { t } = useSolidTranslation();
  const settings = useSolidSettings();
  const {
    displayClient,
    focusedClientKey,
    focusedReadyClient,
    hasFocusedClient,
    hasVisibleClient,
  } = useClaimToolClientState();
  const claimNotificationEnabled = useClaimNotificationEnabled();
  const [selection, setSelection] = createSignal<ClaimBucketIds>(
    createEmptyClaimBucketIds(),
    { equals: false },
  );
  const [hiddenClaimedIds, setHiddenClaimedIds] = createSignal<ClaimBucketIds>(
    createEmptyClaimBucketIds(),
    {
      equals: false,
    },
  );
  const [isClaiming, setIsClaiming] = createSignal(false);
  const [isRefreshing, setIsRefreshing] = createSignal(false);

  const claimables = createSolidQuery<ClaimToolClaimablesDto>(
    () =>
      focusedReadyClient()
        ? (["claim_tool_refresh", focusedReadyClient()?.pid] as const)
        : null,
    () => fetchClaimables(),
  );
  const snapshot = createSolidQuery<ClaimToolSnapshotDto>(
    () => "claim_tool_get_snapshot",
    () => fetchSnapshot(),
  );
  const isClaimablesInitializing = createMemo(
    () => hasFocusedClient() && !claimables.data(),
  );
  const connectionLabelKey = createMemo(() =>
    claimToolConnectionLabelKey(
      displayClient(),
      hasFocusedClient(),
      hasVisibleClient(),
      isClaimablesInitializing(),
    ),
  );
  const rawClaimablesData = createMemo(() =>
    hasFocusedClient() && !isClaimablesInitializing()
      ? claimables.data()
      : undefined,
  );
  const claimablesData = createMemo(() =>
    filterClaimablesByHiddenIds(rawClaimablesData(), hiddenClaimedIds()),
  );

  createEffect(() => {
    focusedClientKey();
    setHiddenClaimedIds(createEmptyClaimBucketIds());
  });

  createEffect(() => {
    setHiddenClaimedIds((current) =>
      pruneHiddenClaimedIds(current, rawClaimablesData()),
    );
  });

  createEffect(() => {
    setSelection(claimableIds(claimablesData()));
  });

  const count = createMemo(() => selectedCount(selection()));
  const isBusy = createMemo(
    () => isClaiming() || snapshot.data()?.isRunning === true,
  );
  const canClaim = createMemo(
    () => hasFocusedClient() && count() > 0 && !isBusy(),
  );
  const errorMessage = createMemo(() =>
    hasFocusedClient() && !isClaimablesInitializing() && claimables.error()
      ? toErrorMessage(claimables.error())
      : null,
  );

  const toggleSelection = (
    bucket: ClaimBucket,
    id: string,
    checked: boolean,
  ) => {
    setSelection((current) => {
      const next = cloneClaimBucketIds(current);
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
    if (!hasFocusedClient() || isRefreshing()) {
      return;
    }

    setIsRefreshing(true);
    try {
      await Promise.all([claimables.refetch(), snapshot.refetch()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  onMount(() => {
    const intervalId = window.setInterval(() => {
      void snapshot.mutate(fetchSnapshot());
    }, CLAIM_TOOL_SNAPSHOT_REFRESH_INTERVAL_MS);
    onCleanup(() => window.clearInterval(intervalId));
  });

  onMount(() => {
    let cancelled = false;
    let unlisten: UnlistenFn | null = null;

    const setup = async () => {
      unlisten = await listen<ClaimToolClaimablesAvailableEventDto>(
        CLAIM_TOOL_CLAIMABLES_AVAILABLE_EVENT,
        (event) => {
          if (cancelled) {
            return;
          }
          void snapshot.mutate(event.payload.snapshot);
          void claimables.mutate(event.payload.claimables);
        },
      );
    };

    void setup();

    onCleanup(() => {
      cancelled = true;
      if (unlisten) {
        void unlisten();
      }
    });
  });

  const applyRunResult = async (
    result: ClaimToolRunResultDto,
    requestedIds: ClaimBucketIds,
  ) => {
    const request = requestFromSelection(requestedIds);
    setHiddenClaimedIds((current) =>
      addHiddenClaimedIds(current, request, result),
    );
    await snapshot.mutate(result.snapshot);
    if (hasFocusedClient()) {
      await claimables.mutate(fetchClaimables());
    }
  };

  const claimSelected = async () => {
    if (!canClaim()) {
      return;
    }
    const requestedIds = cloneClaimBucketIds(selection());
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
    if (!hasFocusedClient()) {
      return;
    }
    const requestedIds = claimableIds(claimablesData());
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

  const sections = createMemo(() =>
    sectionConfig.map((section) => ({
      ...section,
      items: claimablesData()?.[section.key] ?? [],
    })),
  );
  const sectionNodes = keyArray(
    sections,
    (section) => section.key,
    (section) => (
      <ClaimSection
        bucket={section().key}
        busy={isBusy()}
        icon={section().icon}
        title={t(section().titleKey)}
        items={section().items}
        selected={selection()[section().key]}
        onBucketCheckedChange={toggleBucketSelection}
        onCheckedChange={toggleSelection}
      />
    ),
  );

  return (
    <div class={s.root}>
      <div class={s.toolbar}>
        <div class={s.heading}>
          <span class={s.subtle}>
            {snapshot.data()?.lastRunAtMs
              ? t("tools.claimTool.lastRun", {
                  time: formatActivityTime(
                    snapshot.data()?.lastRunAtMs ?? 0,
                    window.navigator.language,
                  ),
                })
              : t("tools.claimTool.idle")}
          </span>
        </div>

        <div class={s.actions}>
          <div class={s.notificationControl}>
            <span>{t("tools.claimTool.claimNotificationText")}</span>
            <SettingsToggle
              ariaLabel="Toggle claim notifications"
              checked={claimNotificationEnabled()}
              disabled={isBusy()}
              onCheckedChange={(checked) => {
                settings.set(CLAIM_TOOL_NOTIFICATION_SETTING_ID, checked);
                void snapshot.mutate(fetchSnapshot());
              }}
            />
          </div>
          <RefreshButton
            ariaLabel="Refresh claimable rewards"
            loading={isRefreshing()}
            disabled={!hasFocusedClient() || isBusy() || isRefreshing()}
            minLoadingMs={350}
            onClick={() => {
              void refresh();
            }}
          />
          <button
            type="button"
            class={s.actionButton}
            disabled={!canClaim()}
            onClick={() => {
              void claimSelected();
            }}
          >
            <Check size={15} aria-hidden="true" />
            <span>
              {t("tools.claimTool.claimSelected", { count: count() })}
            </span>
          </button>
          <button
            type="button"
            class={s.actionButton}
            disabled={!hasFocusedClient() || isBusy()}
            onClick={() => {
              void claimAll();
            }}
          >
            <Play size={15} aria-hidden="true" />
            <span>{t("tools.claimTool.claimAll")}</span>
          </button>
        </div>
      </div>

      <StatusRow
        connectionLabelKey={connectionLabelKey()}
        errorMessage={errorMessage()}
        focusedClient={displayClient()}
      />

      <div class={s.sections}>{sectionNodes()}</div>

      <ActivityList
        busy={isBusy()}
        entries={snapshot.data()?.recentActivity ?? []}
      />
    </div>
  );
}

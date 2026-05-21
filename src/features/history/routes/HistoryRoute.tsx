/** @jsxImportSource solid-js */
import type { Accessor, JSX } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Show,
} from "solid-js";
import { ProfileIcon } from "@/components/ProfileIcon";
import { useSolidSettingValue } from "@/features/settings/use-setting-value";
import { useSolidTranslation } from "@/i18n/solid";
import { selectIsFocused, useSolidLcuStore } from "@/stores/lcu.solid";
import { useSolidTabStore } from "@/stores/tabs.solid";
import { ConnectionGuard } from "../components/ConnectionGuard";
import { MatchList } from "../components/MatchList";
import { SummaryBar } from "../components/SummaryBar";
import { useSolidOpenHistoryTab } from "../hooks/use-open-history-tab";
import { useSolidSummonerInfo } from "../hooks/use-summoner";
import { HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING } from "../settings-ids";
import {
  deriveSgpServerIdFromClientArgs,
  deriveSgpServerIdFromRegion,
  formatHistoryServerBadgeLabel,
  resolveHistoryServerId,
} from "../utils/server-display";
import * as s from "./HistoryRoute.css";

function useDeferredListMount(key: Accessor<string | null>): Accessor<boolean> {
  const [readyKey, setReadyKey] = createSignal<string | null>(null);

  createEffect(() => {
    const currentKey = key();
    if (!currentKey) {
      setReadyKey(null);
      return;
    }

    const frameId = requestAnimationFrame(() => {
      setReadyKey(currentKey);
    });

    onCleanup(() => {
      cancelAnimationFrame(frameId);
    });
  });

  return () => readyKey() === key();
}

function OwnSummonerButton(props: {
  serverId: string | null;
}): JSX.Element | null {
  const { t } = useSolidTranslation();
  const connected = useSolidLcuStore(selectIsFocused);
  const openHistoryTab = useSolidOpenHistoryTab();
  const summoner = createMemo(() => connected()?.summoner ?? null);
  const gameName = () => summoner()?.gameName || summoner()?.name || "Summoner";
  const tagLine = () => summoner()?.tagLine || "";

  return (
    <Show when={summoner()}>
      {(resolvedSummoner) => (
        <div class={s.focusPicker}>
          <button
            type="button"
            class={s.focusPickerCard}
            onClick={() =>
              openHistoryTab(resolvedSummoner().puuid, props.serverId, {
                gameName: gameName(),
                tagLine: tagLine(),
                profileIconId: resolvedSummoner().profileIconId,
                summonerLevel: resolvedSummoner().summonerLevel,
                privacy: resolvedSummoner().privacy,
              })
            }
          >
            <div class={s.focusPickerHeader}>
              <div class={s.focusPickerAvatarWrap}>
                <ProfileIcon
                  profileIconId={resolvedSummoner().profileIconId}
                  alt="Profile icon"
                  className={s.focusPickerAvatar}
                  fallbackClassName={s.focusPickerAvatarFallback}
                />
              </div>
              <div class={s.focusPickerInfo}>
                <span class={s.focusPickerName}>
                  {gameName()}
                  {tagLine() ? `#${tagLine()}` : ""}
                </span>
                <span class={s.focusPickerDetail}>
                  {t("history.viewOwnHistory")}
                </span>
              </div>
            </div>
          </button>
        </div>
      )}
    </Show>
  );
}

export default function HistoryRoute(): JSX.Element {
  const { t } = useSolidTranslation();
  const connected = useSolidLcuStore(selectIsFocused);
  const instances = useSolidLcuStore((state) => state.instances);
  const tabs = useSolidTabStore((state) => state.tabs);
  const activeTabId = useSolidTabStore((state) => state.activeTabId);
  const activeTab = createMemo(() =>
    tabs().find((tab) => tab.id === activeTabId()),
  );
  const listReady = useDeferredListMount(() => activeTab()?.id ?? null);
  const activeTabServerId = createMemo(() =>
    resolveHistoryServerId(activeTab()?.sgpServerId),
  );
  const focusedServerId = createMemo(
    () =>
      deriveSgpServerIdFromClientArgs(connected()?.cmdArgs) ??
      deriveSgpServerIdFromRegion(connected()?.region),
  );
  const activeSummonerQuery = useSolidSummonerInfo(
    () => activeTab()?.puuid,
    () => activeTabServerId(),
    () => activeTab()?.identity,
  );
  const activeOwnSummoner = createMemo(
    () =>
      activeTab()?.puuid !== undefined &&
      connected()?.summoner?.puuid === activeTab()?.puuid,
  );
  const derivedOwnServerId = createMemo(() =>
    activeOwnSummoner() ? focusedServerId() : null,
  );
  const effectiveActiveTabServerId = createMemo(
    () => activeTabServerId() ?? derivedOwnServerId(),
  );
  const rankUnavailable = createMemo(
    () =>
      activeTabServerId() !== null &&
      focusedServerId() !== null &&
      activeTabServerId() !== focusedServerId(),
  );
  const summaryServerLabel = createMemo(() =>
    formatHistoryServerBadgeLabel(effectiveActiveTabServerId(), t),
  );
  const autoRefreshOnSwitch = useSolidSettingValue<boolean>(
    HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING,
    false,
  );

  return (
    <Show
      when={connected()}
      fallback={<ConnectionGuard instances={instances()} />}
    >
      <Show
        when={activeTab()}
        fallback={<OwnSummonerButton serverId={focusedServerId()} />}
      >
        {(resolvedActiveTab) => (
          <div class={s.page}>
            <Show
              when={activeSummonerQuery.data()}
              fallback={<div class={s.summaryPlaceholder} />}
            >
              {(activeSummoner) => (
                <SummaryBar
                  summoner={activeSummoner()}
                  rankedPuuid={resolvedActiveTab().puuid}
                  rankUnavailable={rankUnavailable()}
                  serverLabel={summaryServerLabel()}
                  autoRefresh={autoRefreshOnSwitch() ?? false}
                />
              )}
            </Show>
            <Show
              when={listReady()}
              fallback={<div class={s.listPlaceholder} />}
            >
              <MatchList
                puuid={resolvedActiveTab().puuid}
                sgpServerId={effectiveActiveTabServerId()}
              />
            </Show>
          </div>
        )}
      </Show>
    </Show>
  );
}

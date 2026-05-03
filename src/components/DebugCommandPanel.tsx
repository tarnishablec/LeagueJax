import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { RawMatchSummariesResponse } from "@/bindings/matches.ts";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import { showUpdateSettingsToast } from "@/features/updater/toasts";
import type { HistoryTab } from "@/stores/tabs";
import { useTabStore } from "@/stores/tabs";
import * as s from "./DebugCommandPanel.css";

type DebugCommand = {
  id: string;
  label: string;
  run: () => Promise<unknown>;
};

function requireActiveTab(activeTab: HistoryTab | undefined): HistoryTab {
  if (!activeTab) {
    throw new Error("No active history tab. Select a summoner tab first.");
  }

  return activeTab;
}

function formatDebugPayload(payload: unknown): string {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

function parseGameIdFromMatchId(
  matchId: string | null | undefined,
): number | null {
  if (!matchId) {
    return null;
  }
  const suffix = matchId.split("_").at(-1);
  if (!suffix) {
    return null;
  }
  const parsed = Number(suffix);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstGameIdFromRawSummary(
  payload: RawMatchSummariesResponse,
): number | null {
  const firstGame = payload.games[0];
  if (!firstGame) {
    return null;
  }
  return (
    firstGame.json.gameId ?? parseGameIdFromMatchId(firstGame.metadata.match_id)
  );
}

function buildDebugCommands(activeTab: HistoryTab | undefined): DebugCommand[] {
  const defaultRankedQueueTypes = ["RANKED_SOLO_5x5", "RANKED_FLEX_SR"];

  return [
    {
      id: "get-current-summoner",
      label: "get_current_summoner",
      run: () => invoke<unknown>("get_current_summoner"),
    },
    {
      id: "search-summoners-active-tab",
      label: "search_summoners(active tab)",
      run: async () => {
        const tab = requireActiveTab(activeTab);
        return invoke<unknown>("search_summoners", {
          query: tab.puuid,
          sgpServerId: tab.sgpServerId,
        });
      },
    },
    {
      id: "get-summoner-by-puuid-active-tab",
      label: "get_summoner_by_puuid(active tab)",
      run: async () => {
        const tab = requireActiveTab(activeTab);
        return invoke<unknown>("get_summoner_by_puuid", {
          puuid: tab.puuid,
          sgpServerId: tab.sgpServerId,
        });
      },
    },
    {
      id: "get-ranked-summary-active-tab",
      label: "get_ranked_summary(active tab)",
      run: async () => {
        const tab = requireActiveTab(activeTab);
        return invoke<unknown>("get_ranked_summary", {
          puuid: tab.puuid,
        });
      },
    },
    {
      id: "lcu-get-ranked-tiers-active-tab",
      label: "lcu_get_ranked_tiers(active tab)",
      run: async () => {
        const tab = requireActiveTab(activeTab);
        const summoner = await invoke<SummonerInfo>("get_summoner_by_puuid", {
          puuid: tab.puuid,
          sgpServerId: tab.sgpServerId,
        });
        const rankedSummonerId =
          summoner.summonerId || summoner.id || summoner.accountId;
        const rankedTiers = await invoke<unknown>("lcu_get_ranked_tiers", {
          summonerIds: [rankedSummonerId],
          queueTypes: defaultRankedQueueTypes,
        });
        return {
          puuid: tab.puuid,
          sgpServerId: tab.sgpServerId,
          summonerId: summoner.summonerId,
          id: summoner.id,
          accountId: summoner.accountId,
          rankedSummonerId,
          rankedTiers,
        };
      },
    },
    {
      id: "get-match-summaries-active-tab",
      label: "get_match_summaries(active tab, 1 page)",
      run: async () => {
        const tab = requireActiveTab(activeTab);
        return invoke<RawMatchSummariesResponse>("get_match_summaries", {
          puuid: tab.puuid,
          beginIndex: 0,
          endIndex: 1,
          tag: null,
          sgpServerId: tab.sgpServerId,
        });
      },
    },
    {
      id: "get-match-summary-first",
      label: "get_match_summary(first summary)",
      run: async () => {
        const tab = requireActiveTab(activeTab);
        const raw = await invoke<RawMatchSummariesResponse>(
          "get_match_summaries",
          {
            puuid: tab.puuid,
            beginIndex: 0,
            endIndex: 1,
            tag: null,
            sgpServerId: tab.sgpServerId,
          },
        );

        const gameId = firstGameIdFromRawSummary(raw);
        if (!gameId || gameId <= 0) {
          throw new Error(
            "No match summary gameId available for get_match_summary.",
          );
        }

        return invoke<unknown>("get_match_summary", {
          gameId,
          sgpServerId: tab.sgpServerId,
        });
      },
    },
    {
      id: "get-cherry-augments",
      label: "get_cherry_augments",
      run: () => invoke<unknown>("get_cherry_augments"),
    },
    {
      id: "lcu-get-queues",
      label: "lcu_get_queues",
      run: () => invoke<unknown>("lcu_get_queues"),
    },
    {
      id: "lcu-get-maps",
      label: "lcu_get_maps",
      run: () => invoke<unknown>("lcu_get_maps"),
    },
    {
      id: "lcu-get-platform-config-namespaces",
      label: "lcu_get_platform_config_namespaces",
      run: () => invoke<unknown>("lcu_get_platform_config_namespaces"),
    },
    {
      id: "lcu-get-help",
      label: "lcu_get_help",
      run: () => invoke<unknown>("lcu_get_help"),
    },
  ];
}

type EventListener = {
  id: string;
  label: string;
  eventName: string;
};

const EVENT_LISTENERS: EventListener[] = [
  {
    id: "lcu-ws-event",
    label: "lcu-ws-event",
    eventName: "lcu-ws-event",
  },
  {
    id: "ongoing-game-phase-changed",
    label: "ongoing-game-phase-changed",
    eventName: "ongoing-game-phase-changed",
  },
  {
    id: "ongoing-game-snapshot-updated",
    label: "ongoing-game-snapshot-updated",
    eventName: "ongoing-game-snapshot-updated",
  },
  {
    id: "lcu-focus-changed",
    label: "lcu-focus-changed",
    eventName: "lcu-focus-changed",
  },
];

export function DebugCommandPanel() {
  const { t } = useTranslation();
  const { tabs, activeTabId } = useTabStore();
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const debugCommands = useMemo(
    () => [
      ...buildDebugCommands(activeTab),
      {
        id: "test-update-toast",
        label: "test_update_toast",
        run: async () => {
          showUpdateSettingsToast({
            id: `debug:update-toast:${Date.now()}`,
            title: t("settings.update.status.updateAvailable"),
            closable: false,
            hideIcon: true,
          });

          return {
            ok: true,
            message: "Toast triggered.",
            target: "/main/settings/system",
          };
        },
      },
    ],
    [activeTab, t],
  );
  const [open, setOpen] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [output, setOutput] = useState<string>(
    "No debug command executed yet.",
  );
  const [copyLabel, setCopyLabel] = useState("Copy");
  const [activeListeners, setActiveListeners] = useState<Set<string>>(
    () => new Set(),
  );
  const unlistenRefs = useRef<Map<string, UnlistenFn>>(new Map());

  const runCommand = async (command: DebugCommand) => {
    setOpen(true);
    setRunningId(command.id);
    try {
      const payload = await command.run();
      const serialized = formatDebugPayload(payload);
      setOutput(serialized);
      console.info(`[debug:${command.id}]`, payload);
    } catch (error) {
      const message = formatDebugPayload(error);
      setOutput(`ERROR\n${message}`);
      console.error(`[debug:${command.id}]`, error);
    } finally {
      setRunningId(null);
    }
  };

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopyLabel("Copied");
    } catch {
      setCopyLabel("Copy Failed");
    } finally {
      window.setTimeout(() => {
        setCopyLabel("Copy");
      }, 1200);
    }
  };

  const toggleListener = useCallback((listener: EventListener) => {
    const existing = unlistenRefs.current.get(listener.id);
    if (existing) {
      existing();
      unlistenRefs.current.delete(listener.id);
      setActiveListeners((prev) => {
        const next = new Set(prev);
        next.delete(listener.id);
        return next;
      });
      return;
    }

    listen<unknown>(listener.eventName, (e) => {
      const line = `[${new Date().toLocaleTimeString()}] ${listener.eventName}\n${formatDebugPayload(e.payload)}`;
      setOutput(line);
      console.info(`[event:${listener.eventName}]`, e.payload);
    }).then((unlisten) => {
      unlistenRefs.current.set(listener.id, unlisten);
    });

    setActiveListeners((prev) => {
      const next = new Set(prev);
      next.add(listener.id);
      return next;
    });
  }, []);

  return (
    <div className={s.debugDock}>
      {open ? (
        <div className={s.debugPanel}>
          <div className={s.debugHeader}>
            <span className={s.debugTitle}>Debug Command Panel</span>
            <button
              type="button"
              className={s.debugToggle}
              aria-label="Close debug panel"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
          {debugCommands.length > 0 ? (
            <div className={s.debugButtons}>
              {debugCommands.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={s.debugButton}
                  aria-label={`Run ${item.label}`}
                  disabled={runningId !== null}
                  onClick={() => {
                    void runCommand(item);
                  }}
                >
                  {runningId === item.id ? "Running..." : item.label}
                </button>
              ))}
            </div>
          ) : (
            <div className={s.debugEmpty}>No debug command configured.</div>
          )}
          <div className={s.debugButtons}>
            {EVENT_LISTENERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={s.debugButton}
                aria-label={`Toggle ${item.label} listener`}
                style={
                  activeListeners.has(item.id)
                    ? { borderColor: "oklch(0.7 0.15 150)" }
                    : undefined
                }
                onClick={() => toggleListener(item)}
              >
                {activeListeners.has(item.id) ? `● ${item.label}` : item.label}
              </button>
            ))}
          </div>
          <div className={s.debugOutputCard}>
            <div className={s.debugOutputHeader}>
              <span className={s.debugOutputTitle}>Result</span>
              <button
                type="button"
                className={s.debugCopyButton}
                aria-label="Copy debug output"
                onClick={() => {
                  void copyOutput();
                }}
              >
                {copyLabel}
              </button>
            </div>
            <pre className={s.debugOutput}>{output}</pre>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        className={s.debugToggle}
        aria-label="Open debug panel"
        onClick={() => setOpen((current) => !current)}
      >
        Debug
      </button>
    </div>
  );
}

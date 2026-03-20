import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import type { MatchSummary } from "@/bindings/matches.ts";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import { selectIsFocused, useLcuStore } from "@/stores/lcu";
import type { HistoryTab } from "@/stores/tabs";
import { useTabStore } from "@/stores/tabs";
import { MatchList } from "../components/MatchList";
import { SummaryBar } from "../components/SummaryBar";
import * as s from "./HistoryRoute.css";

const ConnectionGuard = ({ instances }: { instances: LcuInstanceInfo[] }) => {
  const { t } = useTranslation();
  const readyInstances = instances.filter(
    (instance) => instance.state === "ready",
  );

  if (readyInstances.length === 0) {
    return <div className={s.emptyState}>{t("common.disconnected")}</div>;
  }

  return (
    <div className={s.focusPicker}>
      <div className={s.focusPickerTitle}>{t("history.selectClient")}</div>
      {readyInstances.map((instance) => (
        <button
          type="button"
          key={instance.pid}
          className={s.focusPickerCard}
          onClick={() => invoke("lcu_update_focus", { pid: instance.pid })}
        >
          <span className={s.focusPickerName}>
            {instance.summoner?.gameName
              ? `${instance.summoner.gameName}#${instance.summoner.tagLine}`
              : `PID: ${instance.pid}`}
          </span>
          <span className={s.focusPickerDetail}>
            <span>{instance.region}</span>
            <span>PID: {instance.pid}</span>
          </span>
          <span>{instance.installDir}</span>
        </button>
      ))}
    </div>
  );
};

const EmptyState = () => {
  const { t } = useTranslation();
  return <div className={s.emptyState}>{t("history.emptyState")}</div>;
};

type DebugCommand = {
  id: string;
  label: string;
  run: () => Promise<unknown>;
};

const requireActiveTab = (activeTab: HistoryTab | undefined): HistoryTab => {
  if (!activeTab) {
    throw new Error("No active history tab. Select a summoner tab first.");
  }

  return activeTab;
};

function formatDebugPayload(payload: unknown): string {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

const buildDebugCommands = (
  activeTab: HistoryTab | undefined,
): DebugCommand[] => [
  {
    id: "get-current-summoner",
    label: "get_current_summoner",
    run: () => invoke<unknown>("get_current_summoner"),
  },
  {
    id: "search-summoner-active-tab",
    label: "search_summoner(active tab)",
    run: async () => {
      const tab = requireActiveTab(activeTab);
      return invoke<unknown>("search_summoner", {
        gameName: tab.summoner.gameName,
        tagLine: tab.summoner.tagLine,
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
    id: "get-match-summaries-active-tab",
    label: "get_match_summaries(active tab, 0-20)",
    run: async () => {
      const tab = requireActiveTab(activeTab);
      return invoke<unknown>("get_match_summaries", {
        puuid: tab.puuid,
        beginIndex: 0,
        endIndex: 20,
        tag: null,
        sgpServerId: tab.sgpServerId,
      });
    },
  },
  {
    id: "get-match-detail-first-summary",
    label: "get_match_detail(first summary)",
    run: async () => {
      const tab = requireActiveTab(activeTab);
      const summaries = await invoke<MatchSummary[]>("get_match_summaries", {
        puuid: tab.puuid,
        beginIndex: 0,
        endIndex: 1,
        tag: null,
        sgpServerId: tab.sgpServerId,
      });

      const gameId = summaries[0]?.gameId;
      if (!gameId || gameId <= 0) {
        throw new Error(
          "No match summary gameId available for get_match_detail.",
        );
      }

      return invoke<unknown>("get_match_detail", {
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
    id: "get-lcu-maps",
    label: "get_lcu_maps",
    run: () => invoke<unknown>("get_lcu_maps"),
  },
];

const HistoryDebugTools = ({
  activeTab,
}: {
  activeTab: HistoryTab | undefined;
}) => {
  const debugCommands = useMemo(
    () => buildDebugCommands(activeTab),
    [activeTab],
  );
  const [open, setOpen] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [output, setOutput] = useState<string>(
    "No debug command executed yet.",
  );
  const [copyLabel, setCopyLabel] = useState("Copy");

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
};

export function HistoryRoute() {
  const connected = useLcuStore(selectIsFocused);
  const { instances } = useLcuStore();
  const { tabs, activeTabId, openTab } = useTabStore();
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const activePuuid = activeTab?.puuid;
  const activeSgpServerId = activeTab?.sgpServerId ?? null;
  const activeProfileIconId = activeTab?.summoner.profileIconId ?? 0;
  const activeSummonerLevel = activeTab?.summoner.summonerLevel ?? 0;
  const activeGameName = activeTab?.summoner.gameName ?? "";
  const activeTagLine = activeTab?.summoner.tagLine ?? "";

  useEffect(() => {
    if (!connected || !activePuuid) {
      return;
    }

    const shouldHydrate =
      activeProfileIconId <= 0 ||
      activeSummonerLevel <= 0 ||
      activeGameName.trim().length === 0 ||
      activeTagLine.trim().length === 0;
    if (!shouldHydrate) {
      return;
    }

    let cancelled = false;
    void invoke<SummonerInfo>("get_summoner_by_puuid", {
      puuid: activePuuid,
    })
      .then((summoner) => {
        if (cancelled) {
          return;
        }
        openTab(summoner, activeSgpServerId);
      })
      .catch(() => {
        // no-op: keep last known summary when lookup fails
      });

    return () => {
      cancelled = true;
    };
  }, [
    connected,
    activePuuid,
    activeSgpServerId,
    activeProfileIconId,
    activeSummonerLevel,
    activeGameName,
    activeTagLine,
    openTab,
  ]);

  if (!connected) {
    return (
      <>
        <ConnectionGuard instances={instances} />
        <HistoryDebugTools activeTab={activeTab} />
      </>
    );
  }

  if (!activeTab) {
    return (
      <>
        <EmptyState />
        <HistoryDebugTools activeTab={activeTab} />
      </>
    );
  }

  return (
    <>
      <div className={s.page}>
        <SummaryBar summoner={activeTab.summoner} />
        <MatchList
          puuid={activeTab.puuid}
          sgpServerId={activeTab.sgpServerId}
        />
      </div>
      <HistoryDebugTools activeTab={activeTab} />
    </>
  );
}

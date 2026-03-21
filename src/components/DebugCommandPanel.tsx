import { invoke } from "@tauri-apps/api/core";
import { useMemo, useState } from "react";
import type { RawMatchSummariesResponse } from "@/bindings/matches.ts";
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
  return [
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
        return invoke<RawMatchSummariesResponse>("get_match_summaries", {
          puuid: tab.puuid,
          beginIndex: 0,
          endIndex: 20,
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
      id: "get-lcu-maps",
      label: "get_lcu_maps",
      run: () => invoke<unknown>("get_lcu_maps"),
    },
  ];
}

export function DebugCommandPanel() {
  const { tabs, activeTabId } = useTabStore();
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
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
}

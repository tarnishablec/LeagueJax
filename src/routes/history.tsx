import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import { MatchCard } from "../features/history/components/MatchCard";
import { SearchBar } from "../features/history/components/SearchBar";
import { useMatchHistory } from "../features/history/hooks/use-match-history";
import { useSearchSummoner } from "../features/history/hooks/use-summoner";
import { selectIsFocused, useLcuStore } from "../stores/lcu";
import * as s from "./history.css";

const ConnectionGuard = ({ instances }: { instances: LcuInstanceInfo[] }) => {
  const { t } = useTranslation();
  const readyInstances = instances.filter((i) => i.state === "ready");

  if (readyInstances.length === 0) {
    return <div className={s.emptyState}>{t("common.disconnected")}</div>;
  }

  return (
    <div className={s.focusPicker}>
      <div className={s.focusPickerTitle}>{t("history.selectClient")}</div>
      {readyInstances.map((inst) => (
        <button
          type={"button"}
          key={inst.pid}
          className={s.focusPickerCard}
          onClick={() => invoke("lcu_switch_focus", { pid: inst.pid })}
        >
          <span className={s.focusPickerName}>
            {inst.summoner?.gameName
              ? `${inst.summoner.gameName}#${inst.summoner.tagLine}`
              : `PID: ${inst.pid}`}
          </span>
          <span className={s.focusPickerDetail}>
            <span>{inst.region}</span>
            <span>PID: {inst.pid}</span>
          </span>
          <span>{inst.installDir}</span>
        </button>
      ))}
    </div>
  );
};

export function History() {
  const { t } = useTranslation();
  const connected = useLcuStore(selectIsFocused);
  const { instances } = useLcuStore();

  const [searchParams, setSearchParams] = useState<{
    gameName: string;
    tagLine: string;
  } | null>(null);

  const { data: searchResult, isFetching: isSearching } = useSearchSummoner(
    searchParams?.gameName ?? "",
    searchParams?.tagLine ?? "",
    !!searchParams,
  );

  const activeSummoner = searchResult;
  const { data: matches, isLoading: isLoadingMatches } = useMatchHistory(
    activeSummoner?.puuid,
  );

  useEffect(() => {
    if (searchResult?.puuid) {
      invoke("save_search_history", {
        puuid: searchResult.puuid,
        gameName: searchResult.gameName,
        tagLine: searchResult.tagLine,
      }).catch(() => {});
    }
  }, [searchResult?.puuid, searchResult?.gameName, searchResult?.tagLine]);

  if (!connected) return <ConnectionGuard instances={instances} />;

  return (
    <div className={s.page}>
      <SearchBar
        onSearch={(gameName, tagLine) => setSearchParams({ gameName, tagLine })}
        isLoading={isSearching}
      />

      {activeSummoner && (
        <div className={s.summaryBar}>
          <div />
          <div>
            <div className={s.summonerName}>
              {activeSummoner.gameName}#{activeSummoner.tagLine}
            </div>
            <div className={s.summonerLevel}>
              Lv. {activeSummoner.summonerLevel}
            </div>
          </div>
        </div>
      )}

      <div className={s.matchList}>
        {isLoadingMatches ? (
          <div className={s.emptyState}>{t("common.loading")}</div>
        ) : (
          matches?.map((match) => (
            <MatchCard key={match.gameId} match={match} />
          ))
        )}

        {matches?.length === 0 && !isLoadingMatches && (
          <div className={s.emptyState}>{t("history.noMatches")}</div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/history")({ component: History });

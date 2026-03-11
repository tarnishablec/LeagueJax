import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MatchCard } from "../features/history/components/MatchCard";
import { SearchBar } from "../features/history/components/SearchBar";
import { useMatchHistory } from "../features/history/hooks/use-match-history";
import { useSearchSummoner } from "../features/history/hooks/use-summoner";
import type { SummonerInfo } from "../features/history/types";
import { selectIsConnected, useLcuStore } from "../stores/lcu";
import * as s from "./history.css";

function History() {
  const { t } = useTranslation();
  const currentSummoner = useLcuStore((st) => st.summoner);
  const connected = useLcuStore(selectIsConnected);

  const [searchTarget, setSearchTarget] = useState<{
    gameName: string;
    tagLine: string;
  } | null>(null);
  const [viewingSummoner, setViewingSummoner] = useState<SummonerInfo | null>(
    null,
  );

  const { data: searchResult, isFetching: isSearching } = useSearchSummoner(
    searchTarget?.gameName ?? "",
    searchTarget?.tagLine ?? "",
    searchTarget !== null,
  );

  // When a search result arrives, update viewing summoner and save history
  useEffect(() => {
    if (searchResult && searchResult !== viewingSummoner) {
      setViewingSummoner(searchResult);
      invoke("save_search_history", {
        puuid: searchResult.puuid,
        gameName: searchResult.gameName,
        tagLine: searchResult.tagLine,
      }).catch(() => {});
    }
  }, [searchResult, viewingSummoner]);

  const activeSummoner = viewingSummoner ?? (searchResult || null);
  const puuid = activeSummoner?.puuid ?? currentSummoner?.puuid;
  const displayName = activeSummoner
    ? `${activeSummoner.gameName}#${activeSummoner.tagLine}`
    : currentSummoner
      ? `${currentSummoner.gameName}#${currentSummoner.tagLine}`
      : null;

  const { data: matches, isLoading: isLoadingMatches } = useMatchHistory(puuid);

  const handleSearch = (gameName: string, tagLine: string) => {
    setSearchTarget({ gameName, tagLine });
    setViewingSummoner(null);
  };

  if (!connected) {
    return <div className={s.emptyState}>{t("common.disconnected")}</div>;
  }

  return (
    <div className={s.page}>
      <SearchBar onSearch={handleSearch} isLoading={isSearching} />

      {displayName && (
        <div className={s.summaryBar}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              background: "var(--accent)",
            }}
          />
          <div>
            <div className={s.summonerName}>{displayName}</div>
            <div className={s.summonerLevel}>
              Lv.{" "}
              {activeSummoner?.summonerLevel ?? currentSummoner?.summonerLevel}
            </div>
          </div>
        </div>
      )}

      <div className={s.matchList}>
        {isLoadingMatches && (
          <div className={s.emptyState}>{t("common.loading")}</div>
        )}
        {matches?.map((match) => (
          <MatchCard key={match.gameId} match={match} />
        ))}
        {matches?.length === 0 && !isLoadingMatches && (
          <div className={s.emptyState}>{t("history.noMatches")}</div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/history")({ component: History });

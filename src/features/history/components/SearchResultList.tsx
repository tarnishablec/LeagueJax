import { useTranslation } from "react-i18next";
import type { SummonerSearchResult } from "@/bindings/summoner";
import * as s from "./HistoryToolbar.css";
import { SearchResultItem } from "./SearchResultItem";

export function SearchResultList({
  results,
  searched,
  isSearching,
  hasError,
  onOpenResult,
}: {
  results: SummonerSearchResult[];
  searched: boolean;
  isSearching: boolean;
  hasError: boolean;
  onOpenResult: (result: SummonerSearchResult) => void;
}) {
  const { t } = useTranslation();

  if (results.length > 0) {
    return (
      <div className={s.resultList}>
        {results.map((result) => (
          <SearchResultItem
            key={`${result.puuid}:${result.sgpServerId}`}
            result={result}
            onClick={() => onOpenResult(result)}
          />
        ))}
      </div>
    );
  }

  if (searched && !isSearching && !hasError) {
    return (
      <div className={s.emptyText}>{t("history.searchDialog.noResults")}</div>
    );
  }

  return <div className={s.emptyText}>{t("history.searchDialog.hint")}</div>;
}

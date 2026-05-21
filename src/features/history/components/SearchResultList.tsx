/** @jsxImportSource solid-js */
import { keyArray } from "@solid-primitives/keyed";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import type { SummonerSearchResult } from "@/bindings/summoner";
import { useSolidTranslation } from "@/i18n/solid";
import * as s from "./HistoryToolbar.css";
import { SearchResultItem } from "./SearchResultItem";

export function SearchResultList(props: {
  results: SummonerSearchResult[];
  searched: boolean;
  isSearching: boolean;
  hasError: boolean;
  onOpenResult: (result: SummonerSearchResult) => void;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const resultItems = keyArray(
    () => props.results,
    (result) => `${result.sgpServerId}:${result.puuid}`,
    (result) => (
      <SearchResultItem
        result={result()}
        onClick={() => props.onOpenResult(result())}
      />
    ),
  );

  return (
    <Show
      when={props.results.length > 0}
      fallback={
        <Show
          when={props.searched && !props.isSearching && !props.hasError}
          fallback={
            <div class={s.emptyText}>{t("history.searchDialog.hint")}</div>
          }
        >
          <div class={s.emptyText}>{t("history.searchDialog.noResults")}</div>
        </Show>
      }
    >
      <div class={s.resultList}>{resultItems()}</div>
    </Show>
  );
}

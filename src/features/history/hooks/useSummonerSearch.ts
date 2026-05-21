import { invoke } from "@tauri-apps/api/core";
import type { Accessor, Setter } from "solid-js";
import { createSignal } from "solid-js";
import type { SummonerSearchResult } from "@/bindings/summoner";

type UseSummonerSearchResult = {
  query: Accessor<string>;
  setQuery: Setter<string>;
  results: Accessor<SummonerSearchResult[]>;
  isSearching: Accessor<boolean>;
  searchError: Accessor<string | null>;
  lastQuery: Accessor<string>;
  handleSearch: () => Promise<void>;
};

export function useSolidSummonerSearch(params: {
  effectiveServerCode: Accessor<string | null>;
}): UseSummonerSearchResult {
  const [query, setQuery] = createSignal("");
  const [results, setResults] = createSignal<SummonerSearchResult[]>([]);
  const [isSearching, setIsSearching] = createSignal(false);
  const [searchError, setSearchError] = createSignal<string | null>(null);
  const [lastQuery, setLastQuery] = createSignal("");

  const handleSearch = async () => {
    const trimmed = query().trim();
    if (trimmed.length === 0) {
      setResults([]);
      setLastQuery("");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const effectiveServerCode = params.effectiveServerCode();
      const payload = await invoke<SummonerSearchResult[]>("search_summoners", {
        query: trimmed,
        ...(effectiveServerCode ? { sgpServerId: effectiveServerCode } : {}),
      });
      setResults(payload);
      setLastQuery(trimmed);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Summoner search failed.";
      setResults([]);
      setLastQuery(trimmed);
      setSearchError(message);
    } finally {
      setIsSearching(false);
    }
  };

  return {
    query,
    setQuery,
    results,
    isSearching,
    searchError,
    lastQuery,
    handleSearch,
  };
}

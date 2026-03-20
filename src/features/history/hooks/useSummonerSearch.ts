import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import type { SummonerSearchResult } from "@/bindings/summoner";

type UseSummonerSearchParams = {
  effectiveServerCode: string | null;
};

type UseSummonerSearchResult = {
  query: string;
  setQuery: (query: string) => void;
  results: SummonerSearchResult[];
  isSearching: boolean;
  searchError: string | null;
  lastQuery: string;
  handleSearch: () => Promise<void>;
};

export function useSummonerSearch({
  effectiveServerCode,
}: UseSummonerSearchParams): UseSummonerSearchResult {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SummonerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState("");

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setResults([]);
      setLastQuery("");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
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

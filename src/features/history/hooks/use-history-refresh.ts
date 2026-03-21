import { useState } from "react";
import { useSWRConfig } from "swr";

function isHistorySWRKey(key: unknown): boolean {
  if (typeof key === "string") {
    return key === "history:cdragon-static-catalog";
  }

  if (Array.isArray(key)) {
    const command = key[0];
    if (typeof command !== "string") {
      return false;
    }

    return (
      command === "history:ddragon-static-catalog" ||
      command === "history:lcu-cherry-augments" ||
      command === "get_match_summaries" ||
      command === "get_match_summary" ||
      command === "get_ranked_summary"
    );
  }

  return false;
}

export function useHistoryRefresh() {
  const { cache, mutate } = useSWRConfig();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    const targetKeys = [...cache.keys()].filter((key) => isHistorySWRKey(key));
    setRefreshing(true);
    try {
      if (import.meta.env.DEV) {
        for (const key of targetKeys) {
          cache.delete(key);
        }
      }

      await Promise.all(
        targetKeys.map((key) => mutate(key, undefined, { revalidate: true })),
      );
    } finally {
      setRefreshing(false);
    }
  };

  return {
    refreshing,
    refresh,
  };
}

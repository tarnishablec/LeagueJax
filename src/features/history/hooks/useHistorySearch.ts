import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { SgpServersConfig } from "@/bindings/sgp";
import { createListCollection } from "@/components/settings-ui";
import { useHistorySearchServerContext } from "./useHistorySearchServerContext";
import { useSummonerSearch } from "./useSummonerSearch";

function serverDisplayName(
  config: SgpServersConfig,
  serverId: string,
  language: string,
): string {
  const names = config.serverNames ?? {};
  return names[language]?.[serverId] ?? names.en?.[serverId] ?? serverId;
}

type UseHistorySearchParams = {
  open: boolean;
  config: SgpServersConfig;
};

export function useHistorySearch({ open, config }: UseHistorySearchParams) {
  const { t, i18n } = useTranslation();

  const serverContext = useHistorySearchServerContext({ open, config });
  const search = useSummonerSearch({
    effectiveServerCode: serverContext.region.effectiveServerCode,
  });

  const serverCollection = useMemo(() => {
    if (!serverContext.region.focusedServerCode) {
      return createListCollection({
        items: [{ value: "", label: t("history.searchDialog.focused") }],
      });
    }

    const lang = i18n.language;
    const focused = serverContext.region.focusedServerCode;
    const items = [
      {
        value: focused,
        label: `${serverDisplayName(config, focused, lang)} (${focused})`,
      },
    ];

    for (const code of serverContext.region.availableServerCodes) {
      if (code === focused) continue;
      items.push({
        value: code,
        label: `${serverDisplayName(config, code, lang)} (${code})`,
      });
    }

    return createListCollection({ items });
  }, [
    serverContext.region.availableServerCodes,
    serverContext.region.focusedServerCode,
    config,
    i18n.language,
    t,
  ]);

  const errorMessage = search.searchError ?? serverContext.bootstrapError;

  return {
    server: {
      collection: serverCollection,
      selectedId: serverContext.selectedServerId,
      setSelectedId: serverContext.setSelectedServerId,
      show: serverContext.showServerSelect,
      disabled: serverContext.serverSelectDisabled,
      isBootstrapping: serverContext.isBootstrapping,
      reset: serverContext.resetServerContext,
    },
    search: {
      query: search.query,
      setQuery: search.setQuery,
      handleSearch: search.handleSearch,
      isSearching: search.isSearching,
      results: search.results,
      searched: search.lastQuery.length > 0,
    },
    errorMessage,
  };
}

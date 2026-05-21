import { createMemo } from "solid-js";
import type { SgpServersConfig } from "@/bindings/sgp";
import { createListCollection } from "@/components/settings-ui/index";
import { useSolidTranslation } from "@/i18n/solid";
import { useSolidHistorySearchServerContext } from "./useHistorySearchServerContext";
import { useSolidSummonerSearch } from "./useSummonerSearch";

function serverDisplayName(
  config: SgpServersConfig,
  serverId: string,
  language: string,
): string {
  const names = config.serverNames ?? {};
  return names[language]?.[serverId] ?? names.en?.[serverId] ?? serverId;
}

function serverDisplayCode(code: string): string {
  return code.startsWith("TENCENT_") ? code.slice("TENCENT_".length) : code;
}

export function useSolidHistorySearch(params: {
  open: () => boolean;
  config: () => SgpServersConfig;
  enabled: () => boolean;
}) {
  const { language, t } = useSolidTranslation();
  const serverContext = useSolidHistorySearchServerContext(params);
  const search = useSolidSummonerSearch({
    effectiveServerCode: () => serverContext.region().effectiveServerCode,
  });

  const serverCollection = createMemo(() => {
    const focusedServerCode = serverContext.region().focusedServerCode;
    if (!focusedServerCode) {
      return createListCollection({
        items: [{ value: "", label: t("history.searchDialog.focused") }],
      });
    }

    const config = params.config();
    const items = [
      {
        value: focusedServerCode,
        label: `${serverDisplayName(config, focusedServerCode, language())} (${serverDisplayCode(
          focusedServerCode,
        )})`,
      },
    ];

    for (const code of serverContext.region().availableServerCodes) {
      if (code === focusedServerCode) {
        continue;
      }
      items.push({
        value: code,
        label: `${serverDisplayName(config, code, language())} (${serverDisplayCode(code)})`,
      });
    }

    return createListCollection({ items });
  });

  const serverGroups = createMemo(() => {
    const focused = serverContext.region().focusedServerCode;
    if (!focused) {
      return undefined;
    }

    const focusedItem = serverCollection().items.find(
      (item) => item.value === focused,
    );
    const otherItems = serverCollection().items.filter(
      (item) => item.value !== focused,
    );

    if (!focusedItem || otherItems.length === 0) {
      return undefined;
    }

    return [
      { id: "focused-server", items: [focusedItem] },
      { id: "other-servers", items: otherItems },
    ];
  });

  const errorMessage = createMemo(
    () =>
      search.searchError() ??
      (serverContext.bootstrapError()
        ? t("history.searchDialog.noClient")
        : null),
  );

  return {
    server: {
      collection: serverCollection,
      groups: serverGroups,
      selectedId: serverContext.selectedServerId,
      setSelectedId: serverContext.setSelectedServerId,
      focusedServerCode: () => serverContext.region().focusedServerCode,
      effectiveServerCode: () => serverContext.region().effectiveServerCode,
      show: serverContext.showServerSelect,
      disabled: serverContext.serverSelectDisabled,
      isBootstrapping: serverContext.isBootstrapping,
    },
    search: {
      query: search.query,
      setQuery: search.setQuery,
      handleSearch: search.handleSearch,
      isSearching: search.isSearching,
      results: search.results,
      searched: () => search.lastQuery().length > 0,
    },
    errorMessage,
  };
}

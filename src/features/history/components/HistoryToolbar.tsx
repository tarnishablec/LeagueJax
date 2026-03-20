import { invoke } from "@tauri-apps/api/core";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SgpServersConfig } from "@/bindings/sgp";
import type {
  SummonerInfo,
  SummonerSearchResult,
} from "@/bindings/summoner.ts";
import { useHistorySearchServerContext } from "@/features/history/hooks/useHistorySearchServerContext";
import { useSummonerSearch } from "@/features/history/hooks/useSummonerSearch";
import { useTabStore } from "@/stores/tabs";
import sgpServersConfigJson from "../../../../resources/league-servers.json";
import { HistorySearchDialog } from "./HistorySearchDialog";
import * as s from "./HistoryToolbar.css";

const SGP_SERVERS_CONFIG: SgpServersConfig = sgpServersConfigJson;

function serverDisplayName(config: SgpServersConfig, serverId: string): string {
  const names = config.serverNames ?? {};
  return (
    names["zh-CN"]?.[serverId] ??
    names.zh_CN?.[serverId] ??
    names["en-US"]?.[serverId] ??
    names.en_US?.[serverId] ??
    names.en?.[serverId] ??
    serverId
  );
}

export function HistoryToolbar() {
  const { t } = useTranslation();
  const openTab = useTabStore((st) => st.openTab);

  const [open, setOpen] = useState(false);
  const serverContext = useHistorySearchServerContext({
    open,
    config: SGP_SERVERS_CONFIG,
  });
  const search = useSummonerSearch({
    effectiveServerCode: serverContext.region.effectiveServerCode,
  });

  const serverOptions = useMemo(() => {
    if (!serverContext.region.focusedServerCode) {
      return [
        {
          value: "",
          label: "Focused",
        },
      ];
    }

    const focusedLabel = `${serverDisplayName(SGP_SERVERS_CONFIG, serverContext.region.focusedServerCode)} (${serverContext.region.focusedServerCode})`;
    const options = [
      {
        value: serverContext.region.focusedServerCode,
        label: `${t("history.search.focusedServer", { defaultValue: "Focused Server" })}: ${focusedLabel}`,
      },
    ];

    for (const serverCode of serverContext.region.availableServerCodes) {
      if (serverCode === serverContext.region.focusedServerCode) {
        continue;
      }
      options.push({
        value: serverCode,
        label: `${serverDisplayName(SGP_SERVERS_CONFIG, serverCode)} (${serverCode})`,
      });
    }

    return options;
  }, [
    serverContext.region.availableServerCodes,
    serverContext.region.focusedServerCode,
    t,
  ]);

  const openResult = async (result: SummonerSearchResult) => {
    const summoner: SummonerInfo = {
      puuid: result.puuid,
      gameName: result.gameName,
      tagLine: result.tagLine,
      profileIconId: result.profileIconId,
      summonerLevel: result.summonerLevel,
    };
    openTab(summoner, result.sgpServerId);

    await invoke("save_search_history", {
      puuid: summoner.puuid,
      gameName: summoner.gameName,
      tagLine: summoner.tagLine,
    }).catch(() => {});

    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      serverContext.resetServerContext();
    }
    setOpen(nextOpen);
  };

  const errorMessage = search.searchError ?? serverContext.bootstrapError;
  const searched = search.lastQuery.length > 0;

  return (
    <div className={s.wrapper}>
      <HistorySearchDialog
        open={open}
        onOpenChange={handleOpenChange}
        showServerSelect={serverContext.showServerSelect}
        selectedServerId={serverContext.selectedServerId}
        onSelectedServerIdChange={serverContext.setSelectedServerId}
        serverOptions={serverOptions}
        query={search.query}
        onQueryChange={search.setQuery}
        onSearch={search.handleSearch}
        isSearching={search.isSearching}
        isBootstrapping={serverContext.isBootstrapping}
        errorMessage={errorMessage}
        results={search.results}
        searched={searched}
        onOpenResult={(result) => {
          void openResult(result);
        }}
      />
    </div>
  );
}

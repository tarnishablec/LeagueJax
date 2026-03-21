import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import type { SgpServersConfig } from "@/bindings/sgp";
import type {
  SummonerInfo,
  SummonerSearchResult,
} from "@/bindings/summoner.ts";
import { useTabStore } from "@/stores/tabs";
import sgpServersConfigJson from "../../../../resources/league-servers.json";
import { HistorySearchDialog } from "./HistorySearchDialog";
import * as s from "./HistoryToolbar.css";

const SGP_SERVERS_CONFIG: SgpServersConfig = sgpServersConfigJson;

export function HistoryToolbar() {
  const openTab = useTabStore((st) => st.openTab);
  const [open, setOpen] = useState(false);

  const openResult = (result: SummonerSearchResult) => {
    const summoner: SummonerInfo = {
      puuid: result.puuid,
      gameName: result.gameName,
      tagLine: result.tagLine,
      profileIconId: result.profileIconId,
      summonerLevel: result.summonerLevel,
    };
    openTab(summoner, result.sgpServerId);

    void invoke("save_search_history", {
      puuid: summoner.puuid,
      gameName: summoner.gameName,
      tagLine: summoner.tagLine,
    }).catch(() => {});

    setOpen(false);
  };

  return (
    <div className={s.wrapper}>
      <HistorySearchDialog
        open={open}
        onOpenChange={setOpen}
        config={SGP_SERVERS_CONFIG}
        onOpenResult={openResult}
      />
    </div>
  );
}

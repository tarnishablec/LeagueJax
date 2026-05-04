import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import type { LcuChatFriend } from "@/bindings/lcu_chat";
import type { SgpServersConfig } from "@/bindings/sgp";
import type { SummonerSearchResult } from "@/bindings/summoner.ts";
import { useOpenHistoryTab } from "@/features/history/hooks/use-open-history-tab";
import { selectIsFocused, useLcuStore } from "@/stores/lcu";
import sgpServersConfigJson from "../../../../resources/league-servers.json";
import { HistorySearchDialog } from "./HistorySearchDialog";
import * as s from "./HistoryToolbar.css";

const SGP_SERVERS_CONFIG: SgpServersConfig = sgpServersConfigJson;

export function HistoryToolbar() {
  const openHistoryTab = useOpenHistoryTab();
  const focusedClient = useLcuStore(selectIsFocused);
  const [open, setOpen] = useState(false);
  const canOpenSearch = focusedClient != null;

  useEffect(() => {
    if (!canOpenSearch) {
      setOpen(false);
    }
  }, [canOpenSearch]);

  const openResult = (result: SummonerSearchResult) => {
    openHistoryTab(result.puuid, result.sgpServerId, {
      gameName: result.gameName,
      tagLine: result.tagLine,
      profileIconId: result.profileIconId,
      summonerLevel: result.summonerLevel,
      privacy: result.privacy,
    });

    void invoke("save_search_history", {
      puuid: result.puuid,
      gameName: result.gameName,
      tagLine: result.tagLine,
    }).catch(() => {});

    setOpen(false);
  };

  const openFriend = (friend: LcuChatFriend, sgpServerId: string | null) => {
    const gameName = friend.gameName.trim() || friend.name.trim();
    const tagLine = friend.gameTag.trim();

    openHistoryTab(friend.puuid, sgpServerId, {
      gameName,
      tagLine,
      profileIconId: friend.icon,
    });

    void invoke("save_search_history", {
      puuid: friend.puuid,
      gameName,
      tagLine,
    }).catch(() => {});

    setOpen(false);
  };

  return (
    <div className={s.wrapper}>
      <HistorySearchDialog
        open={open}
        onOpenChange={setOpen}
        config={SGP_SERVERS_CONFIG}
        disabled={!canOpenSearch}
        onOpenResult={openResult}
        onOpenFriend={openFriend}
      />
    </div>
  );
}

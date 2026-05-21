/** @jsxImportSource solid-js */
import { invoke } from "@tauri-apps/api/core";
import type { JSX } from "solid-js";
import { createEffect, createSignal } from "solid-js";
import type { LcuChatFriend } from "@/bindings/lcu_chat";
import type { SgpServersConfig } from "@/bindings/sgp";
import type { SummonerSearchResult } from "@/bindings/summoner.ts";
import { useSolidOpenHistoryTab } from "@/features/history/hooks/use-open-history-tab";
import { selectIsFocused, useSolidLcuStore } from "@/stores/lcu";
import sgpServersConfigJson from "../../../../resources/league-servers.json";
import { HistorySearchDialog } from "./HistorySearchDialog";
import * as s from "./HistoryToolbar.css";

const SGP_SERVERS_CONFIG: SgpServersConfig = sgpServersConfigJson;

export function HistoryToolbar(): JSX.Element {
  const openHistoryTab = useSolidOpenHistoryTab();
  const focusedClient = useSolidLcuStore(selectIsFocused);
  const [open, setOpen] = createSignal(false);
  const canOpenSearch = () => focusedClient() != null;

  createEffect(() => {
    if (!canOpenSearch()) {
      setOpen(false);
    }
  });

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
    <div class={s.wrapper}>
      <HistorySearchDialog
        open={open()}
        onOpenChange={setOpen}
        config={SGP_SERVERS_CONFIG}
        disabled={!canOpenSearch()}
        onOpenResult={openResult}
        onOpenFriend={openFriend}
      />
    </div>
  );
}

import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import { useTabStore } from "@/stores/tabs";
import * as s from "./HistoryToolbar.css";

export function HistoryToolbar() {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const openTab = useTabStore((st) => st.openTab);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed.includes("#")) return;
    const [gameName, tagLine] = trimmed.split("#");
    setLoading(true);
    try {
      const summoner = await invoke<SummonerInfo>("search_summoner", {
        gameName,
        tagLine,
      });
      openTab(summoner);
      await invoke("save_search_history", {
        puuid: summoner.puuid,
        gameName: summoner.gameName,
        tagLine: summoner.tagLine,
      }).catch(() => {});
      setValue("");
    } catch {
      // search failed — leave input as-is
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.wrapper}>
      <input
        type="text"
        className={s.input}
        placeholder={t("history.searchPlaceholder")}
        value={value}
        disabled={loading}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void handleSubmit();
        }}
      />
    </div>
  );
}

import type { SummonerInfo } from "@/bindings/summoner.ts";
import { useProfileIcon } from "@/hooks/use-profile-icon.ts";
import * as s from "./SummaryBar.css";

export function SummaryBar({ summoner }: { summoner: SummonerInfo }) {
  const avatarUrl = useProfileIcon(summoner.profileIconId);

  return (
    <div className={s.bar}>
      <div className={s.iconFallback}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile icon"
            style={{ width: "100%", height: "100%", borderRadius: "50%" }}
          />
        ) : null}
      </div>
      <div>
        <div className={s.name}>
          {summoner.gameName}#{summoner.tagLine}
        </div>
        <div className={s.level}>Lv. {summoner.summonerLevel}</div>
      </div>
    </div>
  );
}

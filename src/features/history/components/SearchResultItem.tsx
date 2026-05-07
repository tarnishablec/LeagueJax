import type { SummonerSearchResult } from "@/bindings/summoner";
import { ProfileIcon } from "@/components/ProfileIcon";
import * as s from "./HistoryToolbar.css";

function ResultAvatar({ profileIconId }: { profileIconId: number }) {
  return (
    <ProfileIcon
      profileIconId={profileIconId}
      alt=""
      className={s.resultAvatar}
      fallbackClassName={s.resultAvatarFallback}
    />
  );
}

export function SearchResultItem({
  result,
  onClick,
}: {
  result: SummonerSearchResult;
  onClick: () => void;
}) {
  return (
    <button type="button" className={s.resultButton} onClick={onClick}>
      <ResultAvatar profileIconId={result.profileIconId} />
      <span className={s.resultName}>
        {result.gameName}
        {result.tagLine.length > 0 ? `#${result.tagLine}` : ""}
      </span>
      <span className={s.resultMeta}>
        <span>{result.sgpServerId}</span>
        <span>Lv.{result.summonerLevel}</span>
      </span>
    </button>
  );
}

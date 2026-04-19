import type { SummonerSearchResult } from "@/bindings/summoner";
import { useCdragonStaticData } from "@/hooks/use-cdragon-static-data";
import * as s from "./HistoryToolbar.css";

function ResultAvatar({ profileIconId }: { profileIconId: number }) {
  const { src } = useCdragonStaticData({
    type: "profile-icon",
    profileIconId,
  });

  if (!src) {
    return <span className={s.resultAvatarFallback} aria-hidden="true" />;
  }

  return <img src={src} alt="" className={s.resultAvatar} />;
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

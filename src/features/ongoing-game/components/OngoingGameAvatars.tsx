import { useChampionIcon } from "@/hooks/use-champion-icon.ts";
import * as s from "../routes/OngoingGameRoute.css.ts";

export function ChampionAvatar({ championId }: { championId: number | null }) {
  const iconUrl = useChampionIcon(championId);

  if (!iconUrl) {
    return <div className={s.championAvatarFallback} />;
  }

  return (
    <img
      src={iconUrl}
      alt="Champion icon"
      className={s.championAvatar}
      loading="lazy"
      decoding="async"
    />
  );
}

export function HistoryChampionAvatar({
  championId,
}: {
  championId: number | null;
}) {
  const iconUrl = useChampionIcon(championId);

  if (!iconUrl) {
    return <div className={s.historyChampionFallback} />;
  }

  return (
    <img
      src={iconUrl}
      alt="Champion icon"
      className={s.historyChampionAvatar}
      loading="lazy"
      decoding="async"
    />
  );
}

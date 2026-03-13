import { useTranslation } from "react-i18next";
import { useMatchHistory } from "../hooks/use-match-history";
import { MatchCard } from "./MatchCard";
import * as s from "./MatchList.css";

export function MatchList({ puuid }: { puuid: string }) {
  const { t } = useTranslation();
  const { data: matches, isLoading } = useMatchHistory(puuid);

  if (isLoading) {
    return <div className={s.emptyState}>{t("common.loading")}</div>;
  }

  if (matches?.length === 0) {
    return <div className={s.emptyState}>{t("history.noMatches")}</div>;
  }

  return (
    <div className={s.list}>
      {matches?.map((match) => (
        <MatchCard key={match.gameId} match={match} />
      ))}
    </div>
  );
}

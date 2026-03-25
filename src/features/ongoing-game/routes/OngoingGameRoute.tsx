import { useTranslation } from "react-i18next";
import type { OngoingGamePlayerSnapshot } from "@/bindings/ongoing_game";
import { useOngoingGameStore } from "../store";
import * as s from "./OngoingGameRoute.css";

function formatName(player: OngoingGamePlayerSnapshot): string {
  const gameName = player.summoner.gameName?.trim();
  const tagLine = player.summoner.tagLine?.trim();

  if (gameName && tagLine) {
    return `${gameName}#${tagLine}`;
  }

  if (gameName) {
    return gameName;
  }

  if (player.summoner.name?.trim()) {
    return player.summoner.name;
  }

  return player.puuid;
}

function formatRank(player: OngoingGamePlayerSnapshot): string {
  const entry =
    player.ranked?.highestRankedEntrySr ?? player.ranked?.highestRankedEntry;
  if (!entry || !entry.tier || entry.tier === "NONE") {
    return "";
  }
  if (entry.division === "NA") {
    return `${entry.tier} ${entry.leaguePoints}LP`;
  }
  return `${entry.tier} ${entry.division} ${entry.leaguePoints}LP`;
}

// function sideLabel(side: Side | null): string {
//   if (side === "Blue") {
//     return "Blue";
//   }
//   if (side === "Red") {
//     return "Red";
//   }
//   return "-";
// }

function TeamPanel(props: {
  title: string;
  players: OngoingGamePlayerSnapshot[];
  noDataText: string;
  noRankedText: string;
  recentGamesText: string;
  levelText: string;
}) {
  const {
    title,
    players,
    noDataText,
    noRankedText,
    recentGamesText,
    levelText,
  } = props;

  return (
    <section className={s.teamPanel}>
      <h2 className={s.teamTitle}>{title}</h2>
      {players.length === 0 ? (
        <div className={s.emptyState}>{noDataText}</div>
      ) : (
        <div className={s.playerList}>
          {players.map((player) => {
            const rank = formatRank(player);
            const level = player.summoner.summonerLevel || 0;
            const recentGames = player.match_history?.games.length ?? 0;
            return (
              <article key={player.puuid} className={s.playerCard}>
                <div className={s.playerName}>{formatName(player)}</div>
                <div className={s.playerMeta}>
                  <span>
                    {levelText}: {level}
                  </span>
                  <span>
                    {recentGamesText}: {recentGames}
                  </span>
                </div>
                <div className={s.playerStats}>{rank || noRankedText}</div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function OngoingGameRoute() {
  const { t } = useTranslation();
  const { bluePlayers, redPlayers } = useOngoingGameStore();

  return (
    <div className={s.page}>
      {/*<section className={s.statusCard}>*/}
      {/*  <div className={s.statusItem}>*/}
      {/*    <span className={s.statusLabel}>{t("ongoingGame.status")}</span>*/}
      {/*    <span className={s.statusValue}>*/}
      {/*      {loading ? t("ongoingGame.loading") : "Ready"}*/}
      {/*    </span>*/}
      {/*  </div>*/}
      {/*  <div className={s.statusItem}>*/}
      {/*    <span className={s.statusLabel}>{t("ongoingGame.phase")}</span>*/}
      {/*    <span className={s.statusValue}>{phase}</span>*/}
      {/*  </div>*/}
      {/*  <div className={s.statusItem}>*/}
      {/*    <span className={s.statusLabel}>{t("ongoingGame.ourSide")}</span>*/}
      {/*    <span className={s.statusValue}>{sideLabel(ourSide)}</span>*/}
      {/*  </div>*/}
      {/*</section>*/}

      <section className={s.teamsGrid}>
        <TeamPanel
          title={t("ongoingGame.blueTeam")}
          players={bluePlayers}
          noDataText={t("ongoingGame.noData")}
          noRankedText={t("ongoingGame.noRanked")}
          recentGamesText={t("ongoingGame.recentGames")}
          levelText={t("ongoingGame.level")}
        />
        <TeamPanel
          title={t("ongoingGame.redTeam")}
          players={redPlayers}
          noDataText={t("ongoingGame.noData")}
          noRankedText={t("ongoingGame.noRanked")}
          recentGamesText={t("ongoingGame.recentGames")}
          levelText={t("ongoingGame.level")}
        />
      </section>
    </div>
  );
}

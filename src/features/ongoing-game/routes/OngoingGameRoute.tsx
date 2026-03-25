import { assignInlineVars } from "@vanilla-extract/dynamic";
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

function isBotPlayer(player: OngoingGamePlayerSnapshot): boolean {
  const puuid = player.puuid.trim().toUpperCase();
  if (!puuid || puuid === "BOT" || puuid.startsWith("BOT_")) {
    return true;
  }

  const gameName = (player.summoner.gameName ?? "").trim().toUpperCase();
  const summonerName = (player.summoner.name ?? "").trim().toUpperCase();

  if (gameName === "BOT" || gameName.startsWith("BOT_")) {
    return true;
  }

  return summonerName === "BOT" || summonerName.startsWith("BOT_");
}

function TeamRow(props: {
  title: string;
  titleClassName: string;
  players: OngoingGamePlayerSnapshot[];
  noDataText: string;
  noRankedText: string;
  recentGamesText: string;
  levelText: string;
}) {
  const { players, noDataText, noRankedText, recentGamesText, levelText } =
    props;

  const visiblePlayers = players.filter((player) => !isBotPlayer(player));
  const teamCols = Math.max(5, visiblePlayers.length);

  return (
    <section className={s.teamSection}>
      <div
        className={s.teamRow}
        style={assignInlineVars({
          [s.teamColsVar]: String(teamCols),
        })}
      >
        {visiblePlayers.length === 0 ? (
          <div className={s.emptyState}>{noDataText}</div>
        ) : (
          visiblePlayers.map((player) => {
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
          })
        )}
      </div>
    </section>
  );
}

export function OngoingGameRoute() {
  const { t } = useTranslation();
  const { bluePlayers, redPlayers } = useOngoingGameStore();

  return (
    <div className={s.page}>
      <TeamRow
        title={t("ongoingGame.blueTeam")}
        titleClassName={s.blueTitle}
        players={bluePlayers}
        noDataText={t("ongoingGame.noData")}
        noRankedText={t("ongoingGame.noRanked")}
        recentGamesText={t("ongoingGame.recentGames")}
        levelText={t("ongoingGame.level")}
      />
      <TeamRow
        title={t("ongoingGame.redTeam")}
        titleClassName={s.redTitle}
        players={redPlayers}
        noDataText={t("ongoingGame.noData")}
        noRankedText={t("ongoingGame.noRanked")}
        recentGamesText={t("ongoingGame.recentGames")}
        levelText={t("ongoingGame.level")}
      />
    </div>
  );
}

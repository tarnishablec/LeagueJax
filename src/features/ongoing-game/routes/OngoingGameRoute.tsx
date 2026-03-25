import { assignInlineVars } from "@vanilla-extract/dynamic";
import { useTranslation } from "react-i18next";
import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches";
import type {
  OngoingGameMatchHistoryFilter,
  OngoingGamePlayerSnapshot,
} from "@/bindings/ongoing_game";
import { useChampionIcon } from "@/hooks/use-champion-icon";
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

type RecentGameResult = "Win" | "Lose" | "Remake" | "Terminated";

type RecentGameSummary = {
  gameId: number;
  result: RecentGameResult;
  championId: number | null;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  durationSec: number;
};

type MatchHistoryModeContext = {
  filter: OngoingGameMatchHistoryFilter;
  queueId: number | null;
  mapId: number | null;
  gameMode: string | null;
};

function normalizeMode(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.toUpperCase();
}

function matchHistoryGameInCurrentMode(
  game: RawMatchSummaryGame,
  context: MatchHistoryModeContext,
): boolean {
  if (context.filter === "All") {
    return true;
  }

  let hasCondition = false;

  if (context.queueId && context.queueId > 0) {
    hasCondition = true;
    if (game.json.queueId !== context.queueId) {
      return false;
    }
  }

  if (context.mapId && context.mapId > 0) {
    hasCondition = true;
    if (game.json.mapId !== context.mapId) {
      return false;
    }
  }

  const currentMode = normalizeMode(context.gameMode);
  if (currentMode) {
    hasCondition = true;
    const gameMode = normalizeMode(game.json.gameMode);
    if (gameMode !== currentMode) {
      return false;
    }
  }

  if (!hasCondition) {
    return true;
  }

  return true;
}

function normalizeChampionId(
  championId: number | null | undefined,
): number | null {
  if (!championId || championId <= 0) {
    return null;
  }
  return championId;
}

function resolveRecentGameResult(
  game: RawMatchSummaryGame,
  participant: RawMatchSummaryParticipant | null,
): RecentGameResult {
  const endOfGameResult = game.json.endOfGameResult ?? "";

  if (endOfGameResult.startsWith("Abort_")) {
    return "Terminated";
  }

  if (participant?.gameEndedInEarlySurrender) {
    return "Remake";
  }

  if (participant?.win === true) {
    return "Win";
  }

  if (participant?.win === false) {
    return "Lose";
  }

  return "Terminated";
}

function toRecentGames(
  player: OngoingGamePlayerSnapshot,
  context: MatchHistoryModeContext,
): RecentGameSummary[] {
  const games = player.match_history?.games ?? [];

  return games
    .filter((game) => matchHistoryGameInCurrentMode(game, context))
    .map((game) => {
      const participant =
        game.json.participants.find((item) => item.puuid === player.puuid) ??
        null;

      return {
        gameId: game.json.gameId,
        result: resolveRecentGameResult(game, participant),
        championId: normalizeChampionId(participant?.championId),
        kills: participant?.kills ?? 0,
        deaths: participant?.deaths ?? 0,
        assists: participant?.assists ?? 0,
        cs:
          (participant?.totalMinionsKilled ?? 0) +
          (participant?.neutralMinionsKilled ?? 0),
        durationSec: game.json.gameDuration ?? 0,
      };
    });
}

function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minute = Math.floor(totalSeconds / 60);
  const second = totalSeconds % 60;
  const secondText = second.toString().padStart(2, "0");
  return `${minute}m${secondText}`;
}

function historyResultLabel(
  result: RecentGameResult,
  t: (key: string, options?: { defaultValue?: string }) => string,
): string {
  if (result === "Win") {
    return t("ongoingGame.historyResultWin", { defaultValue: "Win" });
  }
  if (result === "Lose") {
    return t("ongoingGame.historyResultLose", { defaultValue: "Lose" });
  }
  if (result === "Remake") {
    return t("ongoingGame.historyResultRemake", { defaultValue: "Remake" });
  }
  return t("ongoingGame.historyResultTerminated", {
    defaultValue: "Terminated",
  });
}

function historyResultClassName(result: RecentGameResult): string {
  if (result === "Win") {
    return s.winText;
  }
  if (result === "Lose") {
    return s.loseText;
  }
  if (result === "Remake") {
    return s.remakeText;
  }
  return s.terminatedText;
}

function ChampionAvatar({ championId }: { championId: number | null }) {
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

function HistoryChampionAvatar({ championId }: { championId: number | null }) {
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

function HistoryRow(props: {
  game: RecentGameSummary;
  csLabel: string;
  t: (key: string, options?: { defaultValue?: string }) => string;
}) {
  const { game, csLabel, t } = props;

  return (
    <div className={s.historyRow}>
      <HistoryChampionAvatar championId={game.championId} />
      <span className={historyResultClassName(game.result)}>
        {historyResultLabel(game.result, t)}
      </span>
      <span className={s.kdaText}>
        {game.kills}/{game.deaths}/{game.assists}
      </span>
      <span className={s.historyMeta}>
        {csLabel} {game.cs} · {formatDuration(game.durationSec)}
      </span>
    </div>
  );
}

function PlayerHistory(props: {
  rows: RecentGameSummary[];
  noHistoryText: string;
  csLabel: string;
  t: (key: string, options?: { defaultValue?: string }) => string;
}) {
  const { rows, noHistoryText, csLabel, t } = props;

  if (rows.length === 0) {
    return <div className={s.historyEmpty}>{noHistoryText}</div>;
  }

  return rows.map((game) => (
    <HistoryRow key={game.gameId} game={game} csLabel={csLabel} t={t} />
  ));
}

function TeamRow(props: {
  title: string;
  titleClassName: string;
  players: OngoingGamePlayerSnapshot[];
  modeContext: MatchHistoryModeContext;
  noDataText: string;
  noRankedText: string;
  recentGamesText: string;
  noHistoryText: string;
  csText: string;
  levelText: string;
}) {
  const {
    players,
    modeContext,
    noDataText,
    noRankedText,
    recentGamesText,
    noHistoryText,
    csText,
    levelText,
  } = props;
  const { t } = useTranslation();

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
            const recentGameRows = toRecentGames(player, modeContext);
            const recentGames = recentGameRows.length;

            return (
              <article key={player.puuid} className={s.playerCard}>
                <div className={s.playerHeader}>
                  <ChampionAvatar championId={player.champion_id} />
                  <div className={s.playerName}>{formatName(player)}</div>
                </div>
                <div className={s.playerMeta}>
                  <span>
                    {levelText}: {level}
                  </span>
                  <span>
                    {recentGamesText}: {recentGames}
                  </span>
                </div>
                <div className={s.playerStats}>{rank || noRankedText}</div>
                <div className={s.historyList}>
                  <PlayerHistory
                    rows={recentGameRows}
                    noHistoryText={noHistoryText}
                    csLabel={csText}
                    t={t}
                  />
                </div>
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
  const {
    bluePlayers,
    redPlayers,
    matchHistoryFilter,
    queueId,
    mapId,
    gameMode,
  } = useOngoingGameStore();

  const modeContext: MatchHistoryModeContext = {
    filter: matchHistoryFilter,
    queueId,
    mapId,
    gameMode,
  };

  return (
    <div className={s.page}>
      <TeamRow
        title={t("ongoingGame.blueTeam")}
        titleClassName={s.blueTitle}
        players={bluePlayers}
        modeContext={modeContext}
        noDataText={t("ongoingGame.noData")}
        noRankedText={t("ongoingGame.noRanked")}
        recentGamesText={t("ongoingGame.recentGames")}
        noHistoryText={t("ongoingGame.noHistory", {
          defaultValue: "No match history",
        })}
        csText={t("ongoingGame.cs", { defaultValue: "CS" })}
        levelText={t("ongoingGame.level")}
      />
      <TeamRow
        title={t("ongoingGame.redTeam")}
        titleClassName={s.redTitle}
        players={redPlayers}
        modeContext={modeContext}
        noDataText={t("ongoingGame.noData")}
        noRankedText={t("ongoingGame.noRanked")}
        recentGamesText={t("ongoingGame.recentGames")}
        noHistoryText={t("ongoingGame.noHistory", {
          defaultValue: "No match history",
        })}
        csText={t("ongoingGame.cs", { defaultValue: "CS" })}
        levelText={t("ongoingGame.level")}
      />
    </div>
  );
}

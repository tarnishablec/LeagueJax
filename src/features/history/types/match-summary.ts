export type MatchOutcome = "victory" | "defeat" | "remake" | "terminated";

export type MatchSummaryParticipant = {
  puuid: string;
  championId: number;
  gameName: string;
  tagLine: string;
  teamId: number;
};

export type MatchSummary = {
  gameId: number;
  championId: number;
  win: boolean;
  outcome: MatchOutcome;
  teamId: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  totalDamageDealtToChampions: number;
  damageShare: number;
  spell1Id: number;
  spell2Id: number;
  perkPrimaryRuneId: number;
  perkSubStyleId: number;
  playerAugments: [number, number, number, number, number, number];
  items: [number, number, number, number, number, number, number];
  mapId: number;
  gameDuration: number;
  gameMode: string;
  gameMutator: string;
  gameCreation: number;
  queueId: number;
  participants: MatchSummaryParticipant[];
};

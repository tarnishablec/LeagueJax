export interface SummonerInfo {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconId: number;
  summonerLevel: number;
}

export interface MatchSummary {
  gameId: number;
  championId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gameDuration: number;
  gameMode: string;
  gameCreation: number;
  queueId: number;
}

export interface Participant {
  puuid: string;
  championId: number;
  summonerName: string;
  teamId: number;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  goldEarned: number;
  visionScore: number;
  cs: number;
  items: [number, number, number, number, number, number, number];
  spell1Id: number;
  spell2Id: number;
  perkPrimaryStyle: number;
  perkSubStyle: number;
  win: boolean;
}

export interface MatchDetail {
  gameId: number;
  gameDuration: number;
  gameMode: string;
  gameCreation: number;
  queueId: number;
  participants: Participant[];
}

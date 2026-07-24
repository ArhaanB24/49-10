export type PlayerRole = 'Batsman' | 'All-rounder' | 'Wicketkeeper' | 'Bowler';

export type BattingStyle = 'Right-Hand Bat' | 'Left-Hand Bat';

export type BowlingStyle = 
  | 'Right-Arm Fast' 
  | 'Right-Arm Medium' 
  | 'Right-Arm Fast-Medium'
  | 'Right-Arm Off-Spin' 
  | 'Right-Arm Off-Break'
  | 'Right-Arm Leg-Spin' 
  | 'Left-Arm Fast' 
  | 'Left-Arm Medium' 
  | 'Left-Arm Fast-Medium'
  | 'Left-Arm Orthodox' 
  | 'Left-Arm Unorthodox'
  | 'None';

export interface Player {
  id: string;
  canonicalId: string; // Unique person identifier e.g. 'virat_kohli' to block duplicate selection across session
  name: string;
  role: PlayerRole;
  teamEra: string; // e.g. "RCB 2016" or "India 2011"
  year: number; // e.g. 2016, 2011, 1975, 1950
  ovr: number; // Overall Rating (60-99)
  battingAvg: number;
  strikeRate: number;
  bowlingAvg: number;
  economy: number;
  wickets: number;
  highScore: string;
  bestBowling: string;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
}

export interface IconicSquad {
  id: string;
  name: string;
  year: number;
  category: 'International' | 'IPL' | 'Historic Classic';
  description: string;
  colorClass: string;
  players: Player[];
}

export interface TeamComposition {
  batsmen: number;
  allRounders: number;
  wicketKeepers: number; // strictly 1
  bowlers: number;
}

export interface UserTeam {
  id: 'p1' | 'p2';
  name: string;
  isAi: boolean;
  composition: TeamComposition;
  squad: Player[];
  battingOrder: Player[];
  openingBowlers: Player[];
  battingPower: number;
  bowlingPower: number;
  allRounderPower: number;
  keeperPower: number;
  overallRating: number;
}

export type MatchFormat = 'T20' | 'ODI';
export type GameFormat = MatchFormat;

export type PitchType = 'BATTING' | 'BOWLING' | 'SPIN' | 'BALANCED';

export type AppStage = 'SETUP' | 'DRAFT' | 'SUMMARY' | 'TOSS' | 'SIMULATION' | 'SCORECARD';

export interface BallEvent {
  id: string;
  over: number;
  ball: number;
  totalBallsElapsed: number;
  runs: number;
  isWicket: boolean;
  wicketType?: 'Bowled' | 'Caught' | 'LBW' | 'Run Out' | 'Stumped';
  dismissedBatsman?: string;
  isExtra: boolean;
  extraType?: 'Wide' | 'No Ball';
  commentary: string;
  batsmanOnStrike: string;
  nonStriker: string;
  bowler: string;
  teamTotalScore: number;
  teamWickets: number;
  isFour: boolean;
  isSix: boolean;
}

export interface PlayerBattingStats {
  player: Player;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissalInfo?: string;
  strikeRate: number;
}

export interface PlayerBowlingStats {
  player: Player;
  overs: number;
  balls: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;
}

export interface InningsState {
  battingTeamId: 'p1' | 'p2';
  bowlingTeamId: 'p1' | 'p2';
  totalRuns: number;
  totalWickets: number;
  totalOvers: number;
  totalBallsInOver: number;
  currentOverBalls: BallEvent[];
  allBallEvents: BallEvent[];
  battingStats: Map<string, PlayerBattingStats>;
  bowlingStats: Map<string, PlayerBowlingStats>;
  currentStrikerIndex: number;
  currentNonStrikerIndex: number;
  currentBowlerIndex: number;
  nextBatsmanIndex: number;
  fallOfWickets: Array<{ wicketNum: number; runs: number; over: string; batsman: string }>;
  extras: {
    wides: number;
    noBalls: number;
    total: number;
  };
  isCompleted: boolean;
}

export interface MatchSimulationResult {
  format: MatchFormat;
  pitch: PitchType;
  tossWinner: 'p1' | 'p2';
  tossDecision: 'Bat' | 'Bowl';
  firstInnings: InningsState;
  secondInnings: InningsState;
  winner: 'p1' | 'p2' | 'Tie';
  winningMargin: string;
  manOfTheMatch: {
    player: Player;
    reason: string;
  };
  keyHighlights: string[];
}

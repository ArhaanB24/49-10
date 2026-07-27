import {
  BallEvent,
  InningsState,
  MatchFormat,
  MatchSimulationResult,
  PitchType,
  Player,
  PlayerBattingStats,
  PlayerBowlingStats,
  UserTeam,
} from '../types';

export function calculateTeamPower(squad: Player[]) {
  if (!squad || squad.length === 0) {
    return {
      battingPower: 0,
      bowlingPower: 0,
      allRounderPower: 0,
      keeperPower: 0,
      overallRating: 0,
    };
  }

  const batsmen = squad.filter((p) => p.role === 'Batsman' || p.role === 'Wicketkeeper' || p.role === 'All-rounder');
  const bowlers = squad.filter((p) => p.role === 'Bowler' || p.role === 'All-rounder');
  const allRounders = squad.filter((p) => p.role === 'All-rounder');
  const keepers = squad.filter((p) => p.role === 'Wicketkeeper');

  const battingPower = Math.round(
    batsmen.reduce((acc, p) => acc + (p.ovr * 0.6 + p.battingAvg * 0.4), 0) / (batsmen.length || 1)
  );

  const bowlingPower = Math.round(
    bowlers.reduce((acc, p) => acc + (p.ovr * 0.6 + (100 - (p.bowlingAvg || 30)) * 0.4), 0) / (bowlers.length || 1)
  );

  const allRounderPower = allRounders.length > 0
    ? Math.round(allRounders.reduce((acc, p) => acc + p.ovr, 0) / allRounders.length)
    : 70;

  const keeperPower = keepers.length > 0 ? keepers[0].ovr : 75;

  const overallRating = Math.round(
    squad.reduce((acc, p) => acc + p.ovr, 0) / squad.length
  );

  return {
    battingPower,
    bowlingPower,
    allRounderPower,
    keeperPower,
    overallRating,
  };
}

export function initializeInnings(
  battingTeam: UserTeam,
  bowlingTeam: UserTeam
): InningsState {
  const battingStatsMap = new Map<string, PlayerBattingStats>();
  battingTeam.battingOrder.forEach((player) => {
    battingStatsMap.set(player.id, {
      player,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      strikeRate: 0,
    });
  });

  const bowlingStatsMap = new Map<string, PlayerBowlingStats>();
  // Identify key bowlers from bowling rotation or bowler/all-rounder roles
  const activeBowlers = bowlingTeam.squad.filter(
    (p) => p.role === 'Bowler' || p.role === 'All-rounder'
  );
  
  // If fewer than 5 bowlers, include batsmen who bowl
  const finalBowlers = activeBowlers.length >= 4 
    ? activeBowlers 
    : bowlingTeam.squad.filter((p) => p.bowlingAvg > 0 || p.role === 'Bowler');

  finalBowlers.forEach((player) => {
    bowlingStatsMap.set(player.id, {
      player,
      overs: 0,
      balls: 0,
      maidens: 0,
      runsConceded: 0,
      wickets: 0,
      economy: 0,
    });
  });

  return {
    battingTeamId: battingTeam.id,
    bowlingTeamId: bowlingTeam.id,
    totalRuns: 0,
    totalWickets: 0,
    totalOvers: 0,
    totalBallsInOver: 0,
    currentOverBalls: [],
    allBallEvents: [],
    battingStats: battingStatsMap,
    bowlingStats: bowlingStatsMap,
    currentStrikerIndex: 0,
    currentNonStrikerIndex: 1,
    currentBowlerIndex: 0,
    nextBatsmanIndex: 2,
    fallOfWickets: [],
    extras: {
      wides: 0,
      noBalls: 0,
      total: 0,
    },
    isCompleted: false,
  };
}

// Generate commentary for ball event
function generateCommentary(
  runs: number,
  isWicket: boolean,
  wicketType: string | undefined,
  isExtra: boolean,
  extraType: string | undefined,
  striker: Player,
  bowler: Player,
  pitch: PitchType
): string {
  if (isExtra) {
    if (extraType === 'Wide') {
      return `${bowler.name} loses control down the leg side — wide called by the umpire!`;
    }
    return `${bowler.name} oversteps the crease — NO BALL! Free hit coming up!`;
  }

  if (isWicket) {
    switch (wicketType) {
      case 'Bowled':
        return `OUT! ${bowler.name} produces a absolute beauty! Knocks the off-stump right out of the ground! ${striker.name} departs!`;
      case 'LBW':
        return `OUT! Huge appeal for LBW and UP GOES THE FINGER! ${bowler.name} traps ${striker.name} right in front of middle!`;
      case 'Caught':
        return `OUT! ${striker.name} tries to clear the boundary but finds the fielder in the deep! Comfortably taken!`;
      case 'Stumped':
        return `OUT! ${striker.name} steps out, misses the flight completely, and the keeper whipped off the bails in a flash!`;
      case 'Run Out':
        return `OUT! Brilliant direct hit at the bowler's end! ${striker.name} is caught well short of his crease!`;
      default:
        return `OUT! ${bowler.name} gets the breakthrough as ${striker.name} is dismissed!`;
    }
  }

  if (runs === 6) {
    const sixPhrases = [
      `BOOM! ${striker.name} dances down the track and lofts it high over long-on for a MONSTROUS SIX!`,
      `MAXIMUM! ${striker.name} picks the length early and deposits it into the top tier! What a hit!`,
      `INTO THE STANDS! Pure power from ${striker.name}! Clean as a whistle over deep mid-wicket!`,
    ];
    return sixPhrases[Math.floor(Math.random() * sixPhrases.length)];
  }

  if (runs === 4) {
    const fourPhrases = [
      `SHOT! ${striker.name} leans into the cover drive and threads the gap beautifully for FOUR!`,
      `FOUR! Crisp timing from ${striker.name}! Races away past backward point to the boundary ropes!`,
      `FOUR MORE! ${striker.name} pulls it authoritatively through square leg! No chance for the fielder!`,
    ];
    return fourPhrases[Math.floor(Math.random() * fourPhrases.length)];
  }

  if (runs === 3) {
    return `Great running between the wickets! ${striker.name} drives into the deep gap and they push hard for THREE!`;
  }

  if (runs === 2) {
    return `${striker.name} clips it off his pads into vacant deep mid-wicket and comes back comfortably for TWO.`;
  }

  if (runs === 1) {
    return `${striker.name} nudges it softly to mid-on and takes a quick single.`;
  }

  // 0 runs
  const dotPhrases = [
    `Dot ball. ${bowler.name} fires in a tight line, defended cleanly back down the pitch by ${striker.name}.`,
    `No run. Lovely seam movement from ${bowler.name}, beaten outside the off stump!`,
    `Dot ball. ${striker.name} plays with a straight bat straight to extra cover.`,
  ];
  return dotPhrases[Math.floor(Math.random() * dotPhrases.length)];
}

// Single Ball Simulator Step
export function simulateNextBall(
  innings: InningsState,
  battingTeam: UserTeam,
  bowlingTeam: UserTeam,
  format: MatchFormat,
  pitch: PitchType,
  targetScore?: number
): { updatedInnings: InningsState; ballEvent: BallEvent } {
  const maxOvers = format === 'T20' ? 20 : 50;
  const maxBowlerOvers = format === 'T20' ? 4 : 10;

  // Check if innings already completed
  if (
    innings.isCompleted ||
    innings.totalWickets >= 10 ||
    innings.totalOvers >= maxOvers ||
    (targetScore !== undefined && innings.totalRuns >= targetScore)
  ) {
    innings.isCompleted = true;
    return {
      updatedInnings: innings,
      ballEvent: innings.allBallEvents[innings.allBallEvents.length - 1],
    };
  }

  const strikerPlayer = battingTeam.battingOrder[innings.currentStrikerIndex];
  const nonStrikerPlayer = battingTeam.battingOrder[innings.currentNonStrikerIndex];

  // Pick bowler from bowling rotation
  const availableBowlers = bowlingTeam.squad.filter(
    (p) => p.role === 'Bowler' || p.role === 'All-rounder' || p.bowlingAvg > 0
  );
  
  const bowlerPlayer = availableBowlers[innings.currentBowlerIndex % availableBowlers.length];

  // Get current batting stats & bowling stats
  const strikerStats = innings.battingStats.get(strikerPlayer.id)!;
  const bowlerStats = innings.bowlingStats.get(bowlerPlayer.id) || {
    player: bowlerPlayer,
    overs: 0,
    balls: 0,
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    economy: 0,
  };

  // Determine over phase
  const isPowerplay = format === 'T20' ? innings.totalOvers < 6 : innings.totalOvers < 10;
  const isDeathOvers = format === 'T20' ? innings.totalOvers >= 15 : innings.totalOvers >= 40;

  // Calculate Required Run Rate pressure in 2nd Innings
  let rrr = 0;
  let requiredRisk = 0;
  if (targetScore !== undefined) {
    const runsNeeded = targetScore - innings.totalRuns;
    const totalBallsRemaining = maxOvers * 6 - (innings.totalOvers * 6 + innings.totalBallsInOver);
    if (totalBallsRemaining > 0) {
      rrr = (runsNeeded / totalBallsRemaining) * 6;
      if (rrr > 10) requiredRisk = 0.25;
      else if (rrr > 8) requiredRisk = 0.15;
    }
  }

  // Pitch Modifiers
  let pitchBattingFactor = 1.0;
  let pitchWicketFactor = 1.0;
  if (pitch === 'BATTING') {
    pitchBattingFactor = 1.25;
    pitchWicketFactor = 0.8;
  } else if (pitch === 'BOWLING') {
    pitchBattingFactor = 0.82;
    pitchWicketFactor = 1.3;
  } else if (pitch === 'SPIN') {
    if (bowlerPlayer.bowlingStyle.includes('Spin')) {
      pitchWicketFactor = 1.4;
      pitchBattingFactor = 0.85;
    }
  }

  // Calculate realistic Batting Rating vs Bowling Rating comparison
  let batterOvr = strikerPlayer.ovr;
  if (strikerPlayer.role === 'Bowler') {
    // Tailenders have lower effective batting OVR based on battingAvg
    batterOvr = Math.min(strikerPlayer.ovr * 0.55, strikerPlayer.battingAvg > 15 ? 65 : 45);
  } else if (strikerPlayer.role === 'All-rounder') {
    batterOvr = strikerPlayer.ovr * 0.92;
  }

  let bowlerOvr = bowlerPlayer.ovr;
  if (bowlerPlayer.role === 'Batsman' || bowlerPlayer.role === 'Wicketkeeper') {
    bowlerOvr = Math.min(bowlerPlayer.ovr * 0.6, 58);
  } else if (bowlerPlayer.role === 'All-rounder') {
    bowlerOvr = bowlerPlayer.ovr * 0.93;
  }

  const effectiveBatterOvr = batterOvr * pitchBattingFactor;
  const effectiveBowlerOvr = bowlerOvr * pitchWicketFactor;

  // Net difference between batter & bowler
  const ratingDiff = effectiveBatterOvr - effectiveBowlerOvr;

  // Probability outcome simulation
  const rand = Math.random();
  let isWicket = false;
  let runs = 0;
  let isExtra = false;
  let extraType: 'Wide' | 'No Ball' | undefined = undefined;
  let wicketType: 'Bowled' | 'Caught' | 'LBW' | 'Run Out' | 'Stumped' | undefined = undefined;

  // Extra probability (~3%)
  const extraProb = 0.03;

  // Calculate Wicket Probability based directly on ratingDiff & required risk
  let wicketProb = 0.04;
  if (ratingDiff < 0) {
    // Weak batter vs Strong bowler (e.g., 45 vs 99 => ratingDiff = -54 => +0.27 wicket prob = 31% chance per ball!)
    wicketProb += Math.abs(ratingDiff) * 0.0055 + requiredRisk * 0.06;
  } else {
    // Top batter vs Weak bowler => low wicket chance
    wicketProb = Math.max(0.012, 0.04 - ratingDiff * 0.001) + requiredRisk * 0.03;
  }
  wicketProb *= pitchWicketFactor;

  if (rand < extraProb) {
    // Extra
    isExtra = true;
    extraType = Math.random() > 0.5 ? 'Wide' : 'No Ball';
    runs = 1;
  } else if (rand < extraProb + Math.min(0.40, wicketProb)) {
    // Wicket
    isWicket = true;
    const wRand = Math.random();
    if (wRand < 0.45) wicketType = 'Caught';
    else if (wRand < 0.70) wicketType = 'Bowled';
    else if (wRand < 0.88) wicketType = 'LBW';
    else if (wRand < 0.95) wicketType = 'Run Out';
    else wicketType = 'Stumped';
  } else {
    // Scoring outcome - Strictly dictated by ratingDiff & phase
    const scoreRand = Math.random();

    let sixProb = 0.04;
    let fourProb = 0.12;
    let twoProb = 0.08;
    let singleProb = 0.42;

    if (ratingDiff < -20) {
      // Very weak batter vs Great Bowler (e.g., Tailender 45 vs Bumrah 99)
      // Six probability is basically 0.1%, four is 1%, high dot ball rate (75%)
      sixProb = 0.001;
      fourProb = 0.01;
      twoProb = 0.03;
      singleProb = 0.22;
      // Remaining ~73.9% is dot ball!
    } else if (ratingDiff < 0) {
      // Slightly weaker batter
      sixProb = (isDeathOvers ? 0.06 : 0.02) * (effectiveBatterOvr / 85);
      fourProb = (isPowerplay ? 0.12 : 0.07) * (effectiveBatterOvr / 85);
      twoProb = 0.06;
      singleProb = 0.38;
    } else if (ratingDiff > 20) {
      // Dominant batter vs Weaker bowler (e.g. 98 Kohli vs 70 bowler)
      sixProb = (isDeathOvers ? 0.22 : isPowerplay ? 0.15 : 0.10);
      fourProb = (isPowerplay ? 0.30 : 0.22);
      twoProb = 0.10;
      singleProb = 0.28;
    } else {
      // Balanced matchup (e.g. 90 vs 90)
      sixProb = isDeathOvers ? 0.10 : isPowerplay ? 0.06 : 0.04;
      fourProb = isPowerplay ? 0.20 : 0.14;
      twoProb = 0.09;
      singleProb = 0.43;
    }

    // Adjust six probability directly based on batsman's strike rate
    const playerSR = strikerPlayer.strikeRate && strikerPlayer.strikeRate > 0 ? strikerPlayer.strikeRate : 125;
    // Benchmark strike rate is ~130. High SR power-hitters (e.g. 150-200+) get a boost in six probability,
    // while anchor or lower SR players (e.g. 80-110) have lower six chance.
    const srFactor = playerSR / 130;
    sixProb = Math.min(0.35, Math.max(0.0005, sixProb * Math.pow(srFactor, 1.3)));

    if (scoreRand < sixProb) {
      runs = 6;
    } else if (scoreRand < sixProb + fourProb) {
      runs = 4;
    } else if (scoreRand < sixProb + fourProb + singleProb) {
      runs = 1;
    } else if (scoreRand < sixProb + fourProb + singleProb + twoProb) {
      runs = 2;
    } else if (scoreRand < sixProb + fourProb + singleProb + twoProb + 0.01) {
      runs = 3;
    } else {
      runs = 0;
    }
  }

  // Update Score & Balls
  if (!isExtra) {
    innings.totalBallsInOver += 1;
    strikerStats.balls += 1;
    bowlerStats.balls += 1;
  } else {
    if (extraType === 'Wide') innings.extras.wides += 1;
    if (extraType === 'No Ball') innings.extras.noBalls += 1;
    innings.extras.total += 1;
  }

  innings.totalRuns += runs;
  bowlerStats.runsConceded += runs;

  if (runs === 4 && !isExtra) strikerStats.fours += 1;
  if (runs === 6 && !isExtra) strikerStats.sixes += 1;
  if (!isExtra) strikerStats.runs += runs;

  if (strikerStats.balls > 0) {
    strikerStats.strikeRate = Number(((strikerStats.runs / strikerStats.balls) * 100).toFixed(1));
  }

  const ballCommentary = generateCommentary(
    runs,
    isWicket,
    wicketType,
    isExtra,
    extraType,
    strikerPlayer,
    bowlerPlayer,
    pitch
  );

  const ballEvent: BallEvent = {
    id: `ball-${innings.totalOvers}.${innings.totalBallsInOver}-${Date.now()}`,
    over: innings.totalOvers,
    ball: innings.totalBallsInOver,
    totalBallsElapsed: innings.totalOvers * 6 + innings.totalBallsInOver,
    runs,
    isWicket,
    wicketType,
    dismissedBatsman: isWicket ? strikerPlayer.name : undefined,
    isExtra,
    extraType,
    commentary: ballCommentary,
    batsmanOnStrike: strikerPlayer.name,
    nonStriker: nonStrikerPlayer.name,
    bowler: bowlerPlayer.name,
    teamTotalScore: innings.totalRuns,
    teamWickets: innings.totalWickets + (isWicket ? 1 : 0),
    isFour: runs === 4 && !isExtra,
    isSix: runs === 6 && !isExtra,
  };

  innings.currentOverBalls.push(ballEvent);
  innings.allBallEvents.push(ballEvent);

  if (isWicket) {
    innings.totalWickets += 1;
    strikerStats.isOut = true;
    strikerStats.dismissalInfo = `${wicketType} b. ${bowlerPlayer.name}`;
    bowlerStats.wickets += 1;

    innings.fallOfWickets.push({
      wicketNum: innings.totalWickets,
      runs: innings.totalRuns,
      over: `${innings.totalOvers}.${innings.totalBallsInOver}`,
      batsman: strikerPlayer.name,
    });

    if (innings.totalWickets < 10 && innings.nextBatsmanIndex < battingTeam.battingOrder.length) {
      innings.currentStrikerIndex = innings.nextBatsmanIndex;
      innings.nextBatsmanIndex += 1;
    } else {
      innings.isCompleted = true;
    }
  } else {
    // Rotate strike on odd runs
    if (runs % 2 !== 0 && !isExtra) {
      const temp = innings.currentStrikerIndex;
      innings.currentStrikerIndex = innings.currentNonStrikerIndex;
      innings.currentNonStrikerIndex = temp;
    }
  }

  // Check Over completion (6 legal balls)
  if (innings.totalBallsInOver >= 6) {
    innings.totalOvers += 1;
    innings.totalBallsInOver = 0;
    bowlerStats.overs += 1;
    innings.currentOverBalls = [];

    // Calculate maiden over
    const lastOverBalls = innings.allBallEvents.slice(-6);
    const runsInLastOver = lastOverBalls.reduce((acc, b) => acc + b.runs, 0);
    if (runsInLastOver === 0) {
      bowlerStats.maidens += 1;
    }

    // Switch strike at end of over
    const temp = innings.currentStrikerIndex;
    innings.currentStrikerIndex = innings.currentNonStrikerIndex;
    innings.currentNonStrikerIndex = temp;

    // Rotate bowler for next over
    innings.currentBowlerIndex = (innings.currentBowlerIndex + 1) % availableBowlers.length;
  }

  // Update Economy Rate
  const totalBowlerOversFloat = bowlerStats.overs + bowlerStats.balls / 6;
  if (totalBowlerOversFloat > 0) {
    bowlerStats.economy = Number((bowlerStats.runsConceded / totalBowlerOversFloat).toFixed(2));
  }

  // Check target score or all overs finished
  if (
    targetScore !== undefined && innings.totalRuns >= targetScore
  ) {
    innings.isCompleted = true;
  }

  if (innings.totalOvers >= maxOvers || innings.totalWickets >= 10) {
    innings.isCompleted = true;
  }

  innings.battingStats.set(strikerPlayer.id, strikerStats);
  innings.bowlingStats.set(bowlerPlayer.id, bowlerStats);

  return { updatedInnings: innings, ballEvent };
}

// Full Match Simulation Engine Helper (runs whole match or remaining balls)
export function runFullSimulation(
  p1: UserTeam,
  p2: UserTeam,
  format: MatchFormat,
  pitch: PitchType,
  tossWinner: 'p1' | 'p2',
  tossDecision: 'Bat' | 'Bowl'
): MatchSimulationResult {
  const firstBattingTeam = tossDecision === 'Bat'
    ? (tossWinner === 'p1' ? p1 : p2)
    : (tossWinner === 'p1' ? p2 : p1);

  const secondBattingTeam = firstBattingTeam.id === 'p1' ? p2 : p1;

  // Simulate First Innings
  let firstInnings = initializeInnings(firstBattingTeam, secondBattingTeam);
  while (!firstInnings.isCompleted) {
    const { updatedInnings } = simulateNextBall(
      firstInnings,
      firstBattingTeam,
      secondBattingTeam,
      format,
      pitch
    );
    firstInnings = updatedInnings;
  }

  const targetScore = firstInnings.totalRuns + 1;

  // Simulate Second Innings
  let secondInnings = initializeInnings(secondBattingTeam, firstBattingTeam);
  while (!secondInnings.isCompleted) {
    const { updatedInnings } = simulateNextBall(
      secondInnings,
      secondBattingTeam,
      firstBattingTeam,
      format,
      pitch,
      targetScore
    );
    secondInnings = updatedInnings;
  }

  // Calculate Winner
  let winner: 'p1' | 'p2' | 'Tie' = 'Tie';
  let winningMargin = 'Match Tied!';

  if (secondInnings.totalRuns >= targetScore) {
    winner = secondBattingTeam.id;
    const wicketsLeft = 10 - secondInnings.totalWickets;
    winningMargin = `${secondBattingTeam.name} won by ${wicketsLeft} wicket${wicketsLeft > 1 ? 's' : ''}`;
  } else if (firstInnings.totalRuns > secondInnings.totalRuns) {
    winner = firstBattingTeam.id;
    const runMargin = firstInnings.totalRuns - secondInnings.totalRuns;
    winningMargin = `${firstBattingTeam.name} won by ${runMargin} run${runMargin > 1 ? 's' : ''}`;
  }

  // Find Player of the Match
  let topPerfPlayer: Player = p1.squad[0];
  let topPerfScore = -1;
  let reason = '';

  const allPlayersMap = new Map<string, Player>();
  p1.squad.forEach((p) => allPlayersMap.set(p.id, p));
  p2.squad.forEach((p) => allPlayersMap.set(p.id, p));

  // Combine batting & bowling scores
  [firstInnings, secondInnings].forEach((inn) => {
    inn.battingStats.forEach((batStat, pId) => {
      const bowlStat = inn.bowlingStats.get(pId);
      const perfVal = batStat.runs + (batStat.fours * 2) + (batStat.sixes * 4) + (bowlStat ? bowlStat.wickets * 25 - bowlStat.runsConceded * 0.5 : 0);
      if (perfVal > topPerfScore) {
        topPerfScore = perfVal;
        topPerfPlayer = allPlayersMap.get(pId) || p1.squad[0];
        reason = `${batStat.runs} runs (${batStat.balls}b)` + (bowlStat && bowlStat.wickets > 0 ? ` & ${bowlStat.wickets}/${bowlStat.runsConceded}` : '');
      }
    });
  });

  const keyHighlights = [
    `Innings 1: ${firstBattingTeam.name} set a target of ${targetScore} runs (${firstInnings.totalRuns}/${firstInnings.totalWickets}).`,
    `Innings 2: ${secondBattingTeam.name} scored ${secondInnings.totalRuns}/${secondInnings.totalWickets} in ${secondInnings.totalOvers}.${secondInnings.totalBallsInOver} overs.`,
    `Player of the Match: ${topPerfPlayer.name} with ${reason}.`,
  ];

  return {
    format,
    pitch,
    tossWinner,
    tossDecision,
    firstInnings,
    secondInnings,
    winner,
    winningMargin,
    manOfTheMatch: {
      player: topPerfPlayer,
      reason,
    },
    keyHighlights,
  };
}

export function serializeMatchResult(result: MatchSimulationResult): any {
  if (!result) return result;
  const serializeInn = (inn: InningsState) => {
    if (!inn) return inn;
    const battingStatsObj: Record<string, PlayerBattingStats> = {};
    if (inn.battingStats instanceof Map) {
      inn.battingStats.forEach((v, k) => { battingStatsObj[k] = v; });
    } else if (inn.battingStats && typeof inn.battingStats === 'object') {
      Object.assign(battingStatsObj, inn.battingStats);
    }

    const bowlingStatsObj: Record<string, PlayerBowlingStats> = {};
    if (inn.bowlingStats instanceof Map) {
      inn.bowlingStats.forEach((v, k) => { bowlingStatsObj[k] = v; });
    } else if (inn.bowlingStats && typeof inn.bowlingStats === 'object') {
      Object.assign(bowlingStatsObj, inn.bowlingStats);
    }

    return {
      ...inn,
      battingStatsObj,
      bowlingStatsObj,
    };
  };

  return {
    ...result,
    firstInnings: serializeInn(result.firstInnings),
    secondInnings: serializeInn(result.secondInnings),
  };
}

export function deserializeMatchResult(result: any): MatchSimulationResult {
  if (!result) return result;
  const deserializeInn = (inn: any): InningsState => {
    if (!inn) return inn;
    const battingStats = new Map<string, PlayerBattingStats>();
    const rawBat = inn.battingStatsObj || inn.battingStats;
    if (rawBat instanceof Map) {
      rawBat.forEach((v, k) => battingStats.set(k, v));
    } else if (rawBat && typeof rawBat === 'object') {
      Object.keys(rawBat).forEach((k) => battingStats.set(k, rawBat[k]));
    }

    const bowlingStats = new Map<string, PlayerBowlingStats>();
    const rawBowl = inn.bowlingStatsObj || inn.bowlingStats;
    if (rawBowl instanceof Map) {
      rawBowl.forEach((v, k) => bowlingStats.set(k, v));
    } else if (rawBowl && typeof rawBowl === 'object') {
      Object.keys(rawBowl).forEach((k) => bowlingStats.set(k, rawBowl[k]));
    }

    return {
      ...inn,
      battingStats,
      bowlingStats,
    };
  };

  return {
    ...result,
    firstInnings: deserializeInn(result.firstInnings),
    secondInnings: deserializeInn(result.secondInnings),
  };
}

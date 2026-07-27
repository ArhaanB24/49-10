import React, { useState, useEffect, useRef } from 'react';
import {
  GameFormat,
  InningsState,
  MatchSimulationResult,
  PitchType,
  UserTeam,
  Player,
  PlayerBowlingStats,
} from '../types';
import { initializeInnings, simulateNextBall, formatOvers, selectActiveBowler } from '../services/matchEngine';
import {
  Play,
  Pause,
  SkipForward,
  Zap,
  Activity,
  UserCheck,
  Bot,
  User,
  ShieldAlert,
} from 'lucide-react';

interface SimulationStepProps {
  format: GameFormat;
  pitch: PitchType;
  p1Team: UserTeam;
  p2Team: UserTeam;
  tossWinner: 'p1' | 'p2';
  tossDecision: 'Bat' | 'Bowl';
  isMuted: boolean;
  precalculatedResult?: MatchSimulationResult | null;
  onSimulationComplete: (result: MatchSimulationResult) => void;
}

export const SimulationStep: React.FC<SimulationStepProps> = ({
  format,
  pitch,
  p1Team,
  p2Team,
  tossWinner,
  tossDecision,
  isMuted,
  precalculatedResult,
  onSimulationComplete,
}) => {
  // Determine 1st and 2nd batting teams
  const firstBattingTeam = tossDecision === 'Bat'
    ? (tossWinner === 'p1' ? p1Team : p2Team)
    : (tossWinner === 'p1' ? p2Team : p1Team);

  const secondBattingTeam = firstBattingTeam.id === 'p1' ? p2Team : p1Team;

  // Innings state
  const [currentInningsNum, setCurrentInningsNum] = useState<1 | 2>(1);
  const [firstInnings, setFirstInnings] = useState<InningsState>(() =>
    initializeInnings(firstBattingTeam, secondBattingTeam)
  );
  const [secondInnings, setSecondInnings] = useState<InningsState | null>(null);

  // Bowler selection mode: 'manual' (default) or 'auto'
  const [bowlingMode, setBowlingMode] = useState<'manual' | 'auto'>('manual');
  const [selectedBowlerId, setSelectedBowlerId] = useState<string | null>(null);
  const [showBowlerModal, setShowBowlerModal] = useState<boolean>(false);

  // Simulation controls
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(800);

  // Audio Context
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = (type: 'HIT' | 'BOUNDARY' | 'SIX' | 'WICKET') => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'HIT') {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'SIX' || type === 'BOUNDARY') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'WICKET') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // Audio fallback
    }
  };

  const activeInnings = currentInningsNum === 1 ? firstInnings : secondInnings!;
  const battingTeam = currentInningsNum === 1 ? firstBattingTeam : secondBattingTeam;
  const bowlingTeam = currentInningsNum === 1 ? secondBattingTeam : firstBattingTeam;

  const maxOvers = format === 'T20' ? 20 : 50;
  const maxBowlerOvers = format === 'T20' ? 4 : 10;

  // Single Ball Step Execution
  const stepOneBall = () => {
    // Check if manual bowler selection is required
    if (bowlingMode === 'manual' && !selectedBowlerId) {
      setIsPlaying(false);
      setShowBowlerModal(true);
      return;
    }

    if (currentInningsNum === 1) {
      if (firstInnings.isCompleted) {
        setCurrentInningsNum(2);
        setSelectedBowlerId(null);
        if (!secondInnings) {
          setSecondInnings(initializeInnings(secondBattingTeam, firstBattingTeam));
        }
        if (bowlingMode === 'manual') {
          setIsPlaying(false);
          setShowBowlerModal(true);
        }
        return;
      }

      const { updatedInnings, ballEvent } = simulateNextBall(
        { ...firstInnings },
        firstBattingTeam,
        secondBattingTeam,
        format,
        pitch,
        undefined,
        selectedBowlerId || undefined
      );

      setFirstInnings({ ...updatedInnings });

      if (ballEvent.isWicket) playSound('WICKET');
      else if (ballEvent.isSix) playSound('SIX');
      else if (ballEvent.isFour) playSound('BOUNDARY');
      else playSound('HIT');

      if (updatedInnings.isCompleted) {
        setCurrentInningsNum(2);
        setSelectedBowlerId(null);
        setSecondInnings(initializeInnings(secondBattingTeam, firstBattingTeam));
        if (bowlingMode === 'manual') {
          setIsPlaying(false);
          setShowBowlerModal(true);
        }
      } else if (updatedInnings.totalBallsInOver === 0) {
        // Over completed! Reset bowler selection for next over
        setSelectedBowlerId(null);
        if (bowlingMode === 'manual') {
          setIsPlaying(false);
          setShowBowlerModal(true);
        }
      }
    } else if (currentInningsNum === 2 && secondInnings) {
      if (secondInnings.isCompleted) {
        finishMatch(firstInnings, secondInnings);
        return;
      }

      const targetScore = firstInnings.totalRuns + 1;
      const { updatedInnings, ballEvent } = simulateNextBall(
        { ...secondInnings },
        secondBattingTeam,
        firstBattingTeam,
        format,
        pitch,
        targetScore,
        selectedBowlerId || undefined
      );

      setSecondInnings({ ...updatedInnings });

      if (ballEvent.isWicket) playSound('WICKET');
      else if (ballEvent.isSix) playSound('SIX');
      else if (ballEvent.isFour) playSound('BOUNDARY');
      else playSound('HIT');

      if (updatedInnings.isCompleted) {
        finishMatch(firstInnings, updatedInnings);
      } else if (updatedInnings.totalBallsInOver === 0) {
        // Over completed! Reset bowler selection for next over
        setSelectedBowlerId(null);
        if (bowlingMode === 'manual') {
          setIsPlaying(false);
          setShowBowlerModal(true);
        }
      }
    }
  };

  // Finish match helper
  const finishMatch = (inn1: InningsState, inn2: InningsState) => {
    setIsPlaying(false);
    setShowBowlerModal(false);

    let winner: 'p1' | 'p2' | 'Tie' = 'Tie';
    let winningMargin = 'Match Tied!';
    const target = inn1.totalRuns + 1;

    if (inn2.totalRuns >= target) {
      winner = secondBattingTeam.id;
      const wicketsLeft = 10 - inn2.totalWickets;
      winningMargin = `${secondBattingTeam.name} won by ${wicketsLeft} wicket${wicketsLeft > 1 ? 's' : ''}`;
    } else if (inn1.totalRuns > inn2.totalRuns) {
      winner = firstBattingTeam.id;
      const runMargin = inn1.totalRuns - inn2.totalRuns;
      winningMargin = `${firstBattingTeam.name} won by ${runMargin} run${runMargin > 1 ? 's' : ''}`;
    }

    let topPerfPlayer = p1Team.squad[0];
    let topScore = -1;
    let reason = '';

    const allPlayersMap = new Map<string, any>();
    p1Team.squad.forEach((p) => allPlayersMap.set(p.id, p));
    p2Team.squad.forEach((p) => allPlayersMap.set(p.id, p));

    [inn1, inn2].forEach((inn) => {
      inn.battingStats.forEach((batStat, pId) => {
        const bowlStat = inn.bowlingStats.get(pId);
        const score = batStat.runs + (bowlStat ? bowlStat.wickets * 25 - bowlStat.runsConceded * 0.5 : 0);
        if (score > topScore) {
          topScore = score;
          topPerfPlayer = allPlayersMap.get(pId) || p1Team.squad[0];
          reason = `${batStat.runs} runs (${batStat.balls}b)` + (bowlStat && bowlStat.wickets > 0 ? ` & ${bowlStat.wickets}/${bowlStat.runsConceded}` : '');
        }
      });
    });

    onSimulationComplete({
      format,
      pitch,
      tossWinner,
      tossDecision,
      firstInnings: inn1,
      secondInnings: inn2,
      winner,
      winningMargin,
      manOfTheMatch: {
        player: topPerfPlayer,
        reason,
      },
      keyHighlights: [
        `Innings 1: ${firstBattingTeam.name} scored ${inn1.totalRuns}/${inn1.totalWickets} in ${formatOvers(inn1.totalOvers, inn1.totalBallsInOver)} overs.`,
        `Innings 2: ${secondBattingTeam.name} scored ${inn2.totalRuns}/${inn2.totalWickets} in ${formatOvers(inn2.totalOvers, inn2.totalBallsInOver)} overs.`,
        `Player of the Match: ${topPerfPlayer.name} (${reason}).`,
      ],
    });
  };

  const handleInstantFinish = () => {
    if (precalculatedResult) {
      setFirstInnings(precalculatedResult.firstInnings);
      setSecondInnings(precalculatedResult.secondInnings);
      onSimulationComplete(precalculatedResult);
      return;
    }

    let inn1 = { ...firstInnings };
    while (!inn1.isCompleted) {
      const { updatedInnings } = simulateNextBall(inn1, firstBattingTeam, secondBattingTeam, format, pitch);
      inn1 = updatedInnings;
    }

    const targetScore = inn1.totalRuns + 1;
    let inn2 = secondInnings ? { ...secondInnings } : initializeInnings(secondBattingTeam, firstBattingTeam);
    while (!inn2.isCompleted) {
      const { updatedInnings } = simulateNextBall(inn2, secondBattingTeam, firstBattingTeam, format, pitch, targetScore);
      inn2 = updatedInnings;
    }

    setFirstInnings(inn1);
    setSecondInnings(inn2);
    finishMatch(inn1, inn2);
  };

  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        stepOneBall();
      }, speedMs);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speedMs, currentInningsNum, firstInnings, secondInnings, bowlingMode, selectedBowlerId]);

  // Handle Play toggle
  const togglePlay = () => {
    if (!isPlaying && bowlingMode === 'manual' && !selectedBowlerId) {
      setShowBowlerModal(true);
      return;
    }
    setIsPlaying(!isPlaying);
  };

  const strikerPlayer = battingTeam.battingOrder[activeInnings.currentStrikerIndex] || battingTeam.squad[0];
  const nonStrikerPlayer = battingTeam.battingOrder[activeInnings.currentNonStrikerIndex] || battingTeam.squad[1];

  // Pick display bowler
  let bowlerPlayer: Player;
  if (selectedBowlerId) {
    bowlerPlayer = bowlingTeam.squad.find((p) => p.id === selectedBowlerId) || bowlingTeam.squad[10];
  } else {
    bowlerPlayer = selectActiveBowler(bowlingTeam, activeInnings, format);
  }

  const strikerStats = activeInnings.battingStats.get(strikerPlayer.id);
  const nonStrikerStats = activeInnings.battingStats.get(nonStrikerPlayer.id);
  const bowlerStats = activeInnings.bowlingStats.get(bowlerPlayer.id);

  const totalOversElapsedFloat = activeInnings.totalOvers + activeInnings.totalBallsInOver / 6;
  const crr = totalOversElapsedFloat > 0 ? (activeInnings.totalRuns / totalOversElapsedFloat).toFixed(2) : '0.00';

  let target = 0;
  let rrr = '0.00';
  if (currentInningsNum === 2) {
    target = firstInnings.totalRuns + 1;
    const runsNeeded = Math.max(0, target - activeInnings.totalRuns);
    const ballsRemaining = maxOvers * 6 - (activeInnings.totalOvers * 6 + activeInnings.totalBallsInOver);
    rrr = ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : '0.00';
  }

  const lastEvent = activeInnings.allBallEvents[activeInnings.allBallEvents.length - 1];

  // Helper to handle manual bowler pick
  const handleSelectBowler = (pId: string) => {
    setSelectedBowlerId(pId);
    setShowBowlerModal(false);
    setIsPlaying(true);
  };

  const handleAutoPickBowler = () => {
    const autoB = selectActiveBowler(bowlingTeam, activeInnings, format);
    setSelectedBowlerId(autoB.id);
    setShowBowlerModal(false);
    setIsPlaying(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 text-slate-900 space-y-6">
      {/* Stadium Top Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-600 animate-ping" />
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>LIVE MATCH SIMULATION</span>
              <span className="text-xs bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-full font-bold">
                Innings {currentInningsNum} of 2
              </span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            {/* Single Ball Step */}
            <button
              onClick={stepOneBall}
              disabled={isPlaying}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 text-xs font-bold"
              title="Simulate 1 Ball"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {/* Speed selection */}
            {[
              { label: '1x', ms: 800 },
              { label: '2x', ms: 400 },
              { label: '5x', ms: 150 },
            ].map((sp) => (
              <button
                key={sp.label}
                onClick={() => setSpeedMs(sp.ms)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                  speedMs === sp.ms ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sp.label}
              </button>
            ))}

            {/* Bowler Mode Toggle Button */}
            <div className="flex items-center gap-1 pl-2 border-l border-slate-300">
              <button
                onClick={() => {
                  if (bowlingMode === 'manual') {
                    setBowlingMode('auto');
                    setShowBowlerModal(false);
                  } else {
                    setBowlingMode('manual');
                    if (!selectedBowlerId) setShowBowlerModal(true);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 border transition-all ${
                  bowlingMode === 'manual'
                    ? 'bg-emerald-700 text-white border-emerald-800'
                    : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300'
                }`}
                title="Toggle between Manual & Auto Bowler selection"
              >
                {bowlingMode === 'manual' ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Manual Bowler</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5" />
                    <span>Auto Bowler</span>
                  </>
                )}
              </button>

              {bowlingMode === 'manual' && (
                <button
                  onClick={() => setShowBowlerModal(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all"
                  title="Change Bowler for current over"
                >
                  Change Bowler
                </button>
              )}
            </div>

            <button
              onClick={handleInstantFinish}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold transition-all ml-1"
            >
              Instant Finish ⚡
            </button>
          </div>
        </div>

        {/* Digital Scoreboard Display */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-xs uppercase font-extrabold text-slate-500">
              Batting: {battingTeam.name}
            </div>
            <div className="text-4xl md:text-5xl font-black text-slate-900 flex items-baseline gap-2">
              <span>{activeInnings.totalRuns}/{activeInnings.totalWickets}</span>
              <span className="text-sm text-slate-500 font-bold">
                ({formatOvers(activeInnings.totalOvers, activeInnings.totalBallsInOver)} / {maxOvers} Overs)
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600 font-semibold">
              <span>CRR: <strong className="text-slate-900">{crr}</strong></span>
              {currentInningsNum === 2 && (
                <>
                  <span>Target: <strong className="text-slate-900">{target}</strong></span>
                  <span>RRR: <strong className="text-rose-700">{rrr}</strong></span>
                </>
              )}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase">
              Current Over ({activeInnings.currentOverBalls.length} / 6)
            </div>

            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: 6 }).map((_, idx) => {
                const ball = activeInnings.currentOverBalls[idx];
                if (!ball) {
                  return (
                    <div key={idx} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs text-slate-400 font-bold">
                      •
                    </div>
                  );
                }

                let badgeColor = 'bg-white text-slate-800 border-slate-300';
                if (ball.isWicket) badgeColor = 'bg-rose-600 text-white font-black border-rose-700';
                else if (ball.isSix) badgeColor = 'bg-slate-900 text-white font-black border-slate-900';
                else if (ball.isFour) badgeColor = 'bg-slate-800 text-white font-black border-slate-800';
                else if (ball.runs > 0) badgeColor = 'bg-slate-200 text-slate-900 font-bold border-slate-300';

                return (
                  <div
                    key={ball.id}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border shadow-2xs ${badgeColor}`}
                  >
                    {ball.isWicket ? 'W' : ball.runs}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-xs uppercase font-extrabold text-slate-500">
              Match Situation
            </div>

            {currentInningsNum === 1 ? (
              <div className="text-xs font-bold text-slate-700">
                1st Innings: Setting target score for {secondBattingTeam.name}.
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-base font-black text-slate-900">
                  Needs {Math.max(0, target - activeInnings.totalRuns)} runs in {maxOvers * 6 - (activeInnings.totalOvers * 6 + activeInnings.totalBallsInOver)} balls
                </div>
                <div className="text-xs text-slate-500">
                  Target: {target} runs
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Striker */}
        <div className="p-5 rounded-2xl bg-white border-2 border-slate-900 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 font-bold text-slate-900">
              <Zap className="w-3.5 h-3.5 fill-current text-slate-900" /> Striker (On Strike)
            </span>
            <span className="text-slate-500">{strikerPlayer.role}</span>
          </div>

          <div className="text-base font-black text-slate-900">{strikerPlayer.name}</div>

          <div className="grid grid-cols-4 gap-2 text-center p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Runs</div>
              <div className="font-bold text-slate-900">{strikerStats?.runs || 0}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Balls</div>
              <div className="font-bold text-slate-700">{strikerStats?.balls || 0}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">4s / 6s</div>
              <div className="font-bold text-slate-900">{strikerStats?.fours || 0} / {strikerStats?.sixes || 0}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">SR</div>
              <div className="font-bold text-slate-900">{strikerStats?.strikeRate || 0}</div>
            </div>
          </div>
        </div>

        {/* Non-Striker */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold">Non-Striker</span>
            <span className="text-slate-500">{nonStrikerPlayer.role}</span>
          </div>

          <div className="text-base font-black text-slate-900">{nonStrikerPlayer.name}</div>

          <div className="grid grid-cols-4 gap-2 text-center p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Runs</div>
              <div className="font-bold text-slate-900">{nonStrikerStats?.runs || 0}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Balls</div>
              <div className="font-bold text-slate-700">{nonStrikerStats?.balls || 0}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">4s / 6s</div>
              <div className="font-bold text-slate-900">{nonStrikerStats?.fours || 0} / {nonStrikerStats?.sixes || 0}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">SR</div>
              <div className="font-bold text-slate-900">{nonStrikerStats?.strikeRate || 0}</div>
            </div>
          </div>
        </div>

        {/* Bowler */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-900 font-bold flex items-center gap-1">
              <span>Bowler</span>
              {bowlingMode === 'manual' && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                  Manual Pick
                </span>
              )}
            </span>
            <span className="text-slate-500">{bowlerPlayer.bowlingStyle}</span>
          </div>

          <div className="text-base font-black text-slate-900">{bowlerPlayer.name}</div>

          <div className="grid grid-cols-4 gap-2 text-center p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Overs</div>
              <div className="font-bold text-slate-700">{formatOvers(bowlerStats?.overs || 0, bowlerStats?.balls || 0)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Runs</div>
              <div className="font-bold text-slate-900">{bowlerStats?.runsConceded || 0}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Wickets</div>
              <div className="font-bold text-slate-900">{bowlerStats?.wickets || 0}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Econ</div>
              <div className="font-bold text-slate-900">{bowlerStats?.economy || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Ball Commentary Stream Feed */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs">
        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-700" />
          <span>Live Commentary Feed</span>
        </h3>

        {lastEvent ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">Over {formatOvers(lastEvent.over, lastEvent.ball)}</span>
              <span className="text-slate-500">{lastEvent.bowler} to {lastEvent.batsmanOnStrike}</span>
            </div>

            <div className="text-sm font-bold text-slate-900">
              {lastEvent.commentary}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic">Press Play or Step Ball to start live simulation...</div>
        )}

        {/* Historic Ball Log */}
        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
          {activeInnings.allBallEvents
            .slice()
            .reverse()
            .map((b) => (
              <div key={b.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-3">
                <span className="font-bold text-slate-500 shrink-0">[{formatOvers(b.over, b.ball)}]</span>
                <span className="text-slate-800 line-clamp-1">{b.commentary}</span>
                <span
                  className={`px-2 py-0.5 rounded font-black text-[10px] shrink-0 ${
                    b.isWicket
                      ? 'bg-rose-600 text-white'
                      : b.isSix
                      ? 'bg-slate-900 text-white'
                      : b.isFour
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-200 text-slate-900'
                  }`}
                >
                  {b.isWicket ? 'W' : b.runs}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Manual Bowler Selection Modal */}
      {showBowlerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="text-xs font-extrabold uppercase text-emerald-800">
                  Over Break — Select Bowler ({bowlingTeam.name})
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  Choose Bowler for Over {activeInnings.totalOvers + 1}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutoPickBowler}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Auto Choice</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              <div className="text-xs text-slate-600 font-medium">
                Standard cricket rules apply: A bowler cannot bowl 2 consecutive overs and cannot exceed max {maxBowlerOvers} overs.
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {bowlingTeam.squad.map((p) => {
                  const stats = activeInnings.bowlingStats.get(p.id);
                  const oversBowled = stats?.overs || 0;
                  const ballsInOver = stats?.balls || 0;
                  const isMaxOversExceeded = oversBowled >= maxBowlerOvers;

                  const lastBall = activeInnings.allBallEvents[activeInnings.allBallEvents.length - 1];
                  const isPreviousBowler = lastBall && lastBall.bowler === p.name;

                  const isEligible = !isMaxOversExceeded && !isPreviousBowler;

                  return (
                    <div
                      key={p.id}
                      className={`p-3.5 flex items-center justify-between transition-colors ${
                        isEligible ? 'hover:bg-slate-50 bg-white' : 'bg-slate-50/70 opacity-60'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                            {p.role}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-semibold flex items-center gap-3">
                          <span>Overs: <strong>{formatOvers(oversBowled, ballsInOver)} / {maxBowlerOvers}</strong></span>
                          <span>Runs: <strong>{stats?.runsConceded || 0}</strong></span>
                          <span>Wkts: <strong className="text-emerald-700">{stats?.wickets || 0}</strong></span>
                          <span>Econ: <strong>{stats?.economy || 0}</strong></span>
                        </div>
                      </div>

                      <div>
                        {isPreviousBowler ? (
                          <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            Consecutive Over
                          </span>
                        ) : isMaxOversExceeded ? (
                          <span className="text-[10px] font-extrabold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                            Max Overs Bowled
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSelectBowler(p.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-2xs"
                          >
                            Select Bowler
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Want automatic assignment for rest of the match?
              </div>
              <button
                onClick={() => {
                  setBowlingMode('auto');
                  handleAutoPickBowler();
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all"
              >
                Switch to Auto Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

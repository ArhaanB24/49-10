import React, { useState } from 'react';
import { UserTeam } from '../types';
import { calculateTeamPower } from '../services/matchEngine';
import { Trophy, Swords, ArrowUp, ArrowDown, Play, Coins } from 'lucide-react';

interface TeamSummaryStepProps {
  p1Team: UserTeam;
  p2Team: UserTeam;
  onUpdateP1BattingOrder: (order: UserTeam['battingOrder']) => void;
  onUpdateP2BattingOrder: (order: UserTeam['battingOrder']) => void;
  onStartMatch: (tossWinner: 'p1' | 'p2', tossDecision: 'Bat' | 'Bowl') => void;
}

export const TeamSummaryStep: React.FC<TeamSummaryStepProps> = ({
  p1Team,
  p2Team,
  onUpdateP1BattingOrder,
  onUpdateP2BattingOrder,
  onStartMatch,
}) => {
  const p1Power = calculateTeamPower(p1Team.squad);
  const p2Power = calculateTeamPower(p2Team.squad);

  // Coin Toss State
  const [tossState, setTossState] = useState<'IDLE' | 'FLIPPING' | 'DECIDING'>('IDLE');
  const [userChoice, setUserChoice] = useState<'Heads' | 'Tails'>('Heads');
  const [coinResult, setCoinResult] = useState<'Heads' | 'Tails' | null>(null);
  const [tossWinner, setTossWinner] = useState<'p1' | 'p2'>('p1');
  const [tossDecision, setTossDecision] = useState<'Bat' | 'Bowl'>('Bat');

  // Handle Batting Order shift
  const movePlayer = (teamId: 'p1' | 'p2', index: number, direction: 'UP' | 'DOWN') => {
    const team = teamId === 'p1' ? p1Team : p2Team;
    const order = [...team.battingOrder];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;

    if (targetIdx < 0 || targetIdx >= order.length) return;

    const temp = order[index];
    order[index] = order[targetIdx];
    order[targetIdx] = temp;

    if (teamId === 'p1') onUpdateP1BattingOrder(order);
    else onUpdateP2BattingOrder(order);
  };

  // Handle Coin Flip
  const handleFlipCoin = () => {
    setTossState('FLIPPING');
    setTimeout(() => {
      const res = Math.random() > 0.5 ? 'Heads' : 'Tails';
      setCoinResult(res);
      const winner = res === userChoice ? 'p1' : 'p2';
      setTossWinner(winner);
      setTossState('DECIDING');

      if (winner === 'p2' && p2Team.isAi) {
        const aiDecision = Math.random() > 0.5 ? 'Bat' : 'Bowl';
        setTossDecision(aiDecision);
      }
    }, 1200);
  };

  const handleConfirmStart = () => {
    onStartMatch(tossWinner, tossDecision);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-slate-900 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold">
          <Trophy className="w-4 h-4 text-slate-700" />
          Squad Ratings & Coin Toss
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
          TEAM POWER & BATTING LINEUPS
        </h2>
        <p className="text-slate-600 text-sm max-w-xl mx-auto">
          Review the aggregated ratings of both teams and customize your batting lineups before taking part in the official match coin toss.
        </p>
      </div>

      {/* Comparative Ratings Bar Chart */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200">
          <Swords className="w-5 h-5 text-slate-700" />
          <span>Squad Power Breakdown</span>
        </h3>

        <div className="space-y-4">
          {[
            { label: 'Overall Rating (OVR)', p1Val: p1Power.overallRating, p2Val: p2Power.overallRating },
            { label: 'Batting Power', p1Val: p1Power.battingPower, p2Val: p2Power.battingPower },
            { label: 'Bowling Power', p1Val: p1Power.bowlingPower, p2Val: p2Power.bowlingPower },
            { label: 'All-Rounder Power', p1Val: p1Power.allRounderPower, p2Val: p2Power.allRounderPower },
            { label: 'Wicketkeeper Rating', p1Val: p1Power.keeperPower, p2Val: p2Power.keeperPower },
          ].map((stat) => (
            <div key={stat.label} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-900">{p1Team.name}: {stat.p1Val}</span>
                <span className="text-slate-600 uppercase font-semibold text-[11px]">{stat.label}</span>
                <span className="text-slate-900">{p2Team.name}: {stat.p2Val}</span>
              </div>

              {/* Dual Bar */}
              <div className="grid grid-cols-2 gap-2">
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex justify-end">
                  <div
                    className="bg-slate-900 h-full transition-all duration-300"
                    style={{ width: `${(stat.p1Val / 100) * 100}%` }}
                  />
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-700 h-full transition-all duration-300"
                    style={{ width: `${(stat.p2Val / 100) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Batting Lineup Order Customizer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* P1 Lineup */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm">{p1Team.name} Batting Order</h4>
            <span className="text-xs text-slate-500 font-medium">11 Players</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {p1Team.battingOrder.map((player, idx) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-slate-900 text-white font-bold flex items-center justify-center text-[10px]">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-slate-900">{player.name}</div>
                    <div className="text-[11px] text-slate-500">{player.role} • OVR {player.ovr}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => movePlayer('p1', idx, 'UP')}
                    className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                  <button
                    disabled={idx === p1Team.battingOrder.length - 1}
                    onClick={() => movePlayer('p1', idx, 'DOWN')}
                    className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* P2 Lineup */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm">{p2Team.name} Batting Order</h4>
            <span className="text-xs text-slate-500 font-medium">11 Players</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {p2Team.battingOrder.map((player, idx) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-slate-700 text-white font-bold flex items-center justify-center text-[10px]">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-slate-900">{player.name}</div>
                    <div className="text-[11px] text-slate-500">{player.role} • OVR {player.ovr}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => movePlayer('p2', idx, 'UP')}
                    className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                  <button
                    disabled={idx === p2Team.battingOrder.length - 1}
                    onClick={() => movePlayer('p2', idx, 'DOWN')}
                    className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coin Toss Section */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-6">
        <div className="flex items-center justify-center gap-2 text-lg font-bold text-slate-900">
          <Coins className="w-5 h-5 text-slate-700" />
          <span>Match Coin Toss</span>
        </div>

        {tossState === 'IDLE' && (
          <div className="space-y-4 max-w-md mx-auto">
            <p className="text-xs text-slate-600 font-medium">Choose Heads or Tails for {p1Team.name}:</p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setUserChoice('Heads')}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs border transition-all ${
                  userChoice === 'Heads'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Heads
              </button>
              <button
                type="button"
                onClick={() => setUserChoice('Tails')}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs border transition-all ${
                  userChoice === 'Tails'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Tails
              </button>
            </div>

            <button
              type="button"
              onClick={handleFlipCoin}
              className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-2xs"
            >
              Flip Coin Now!
            </button>
          </div>
        )}

        {tossState === 'FLIPPING' && (
          <div className="py-6 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 text-white font-black text-xl flex items-center justify-center animate-spin">
              🪙
            </div>
            <div className="text-slate-600 font-bold text-xs">Flipping coin in mid-air...</div>
          </div>
        )}

        {tossState === 'DECIDING' && (
          <div className="space-y-6 max-w-md mx-auto">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-xs text-slate-600">Coin landed on <strong className="text-slate-900">{coinResult}</strong></div>
              <div className="text-base font-black text-slate-900">
                {tossWinner === 'p1' ? p1Team.name : p2Team.name} won the toss!
              </div>
            </div>

            {(tossWinner === 'p1' || !p2Team.isAi) ? (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Select Decision for {tossWinner === 'p1' ? p1Team.name : p2Team.name}:
                </label>
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTossDecision('Bat')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-xs border transition-all ${
                      tossDecision === 'Bat'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Bat First 🏏
                  </button>
                  <button
                    type="button"
                    onClick={() => setTossDecision('Bowl')}
                    className={`px-6 py-2.5 rounded-xl font-bold text-xs border transition-all ${
                      tossDecision === 'Bowl'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Bowl First ⚾
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-800 font-bold bg-slate-100 p-3 rounded-lg border border-slate-200">
                AI decided to {tossDecision} first!
              </div>
            )}

            <button
              type="button"
              onClick={handleConfirmStart}
              className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-2xs flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Live Cricket Simulation Match</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

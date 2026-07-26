import React, { useState } from 'react';
import { UserTeam } from '../types';
import { calculateTeamPower } from '../services/matchEngine';
import { FieldPitchView } from './FieldPitchView';
import { validateMovePlayer, optimizeBattingOrder } from '../services/battingOrderService';
import { Trophy, Swords, ArrowUp, ArrowDown, Play, Coins, ShieldAlert, Sparkles } from 'lucide-react';

interface TeamSummaryStepProps {
  p1Team: UserTeam;
  p2Team: UserTeam;
  onUpdateP1BattingOrder: (order: UserTeam['battingOrder']) => void;
  onUpdateP2BattingOrder: (order: UserTeam['battingOrder']) => void;
  onStartMatch: (tossWinner: 'p1' | 'p2', tossDecision: 'Bat' | 'Bowl') => void;
  roomCode?: string | null;
  myPlayerRole?: 'p1' | 'p2' | null;
  serverTossWinner?: 'p1' | 'p2' | null;
  serverTossDecision?: 'Bat' | 'Bowl' | null;
  serverTossState?: 'IDLE' | 'FLIPPING' | 'DECIDING' | 'CONFIRMED' | null;
  serverCoinResult?: 'Heads' | 'Tails' | null;
}

export const TeamSummaryStep: React.FC<TeamSummaryStepProps> = ({
  p1Team,
  p2Team,
  onUpdateP1BattingOrder,
  onUpdateP2BattingOrder,
  onStartMatch,
  roomCode,
  myPlayerRole,
  serverTossWinner,
  serverTossDecision,
  serverTossState,
  serverCoinResult,
}) => {
  const p1Power = calculateTeamPower(p1Team.squad);
  const p2Power = calculateTeamPower(p2Team.squad);

  // Pitch View Tab state
  const [summaryPitchTab, setSummaryPitchTab] = useState<'p1' | 'p2'>('p1');

  // Guardrail Warning Message state
  const [guardrailNotice, setGuardrailNotice] = useState<string | null>(null);

  // Coin Toss State
  const [tossState, setTossState] = useState<'IDLE' | 'FLIPPING' | 'DECIDING' | 'CONFIRMED'>('IDLE');
  const [userChoice, setUserChoice] = useState<'Heads' | 'Tails'>('Heads');
  const [coinResult, setCoinResult] = useState<'Heads' | 'Tails' | null>(null);
  const [tossWinner, setTossWinner] = useState<'p1' | 'p2'>('p1');
  const [tossDecision, setTossDecision] = useState<'Bat' | 'Bowl'>('Bat');

  // Sync server toss state if in room
  useEffect(() => {
    if (roomCode) {
      if (serverTossState) setTossState(serverTossState);
      if (serverTossWinner) setTossWinner(serverTossWinner);
      if (serverTossDecision) setTossDecision(serverTossDecision);
      if (serverCoinResult) setCoinResult(serverCoinResult);
    }
  }, [roomCode, serverTossState, serverTossWinner, serverTossDecision, serverCoinResult]);

  // Handle Batting Order shift with realistic cricket guardrails
  const movePlayer = (teamId: 'p1' | 'p2', index: number, direction: 'UP' | 'DOWN') => {
    setGuardrailNotice(null);
    const team = teamId === 'p1' ? p1Team : p2Team;
    const order = [...team.battingOrder];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;

    if (targetIdx < 0 || targetIdx >= order.length) return;

    // Guardrail Check
    const validation = validateMovePlayer(order, index, targetIdx);
    if (!validation.allowed) {
      setGuardrailNotice(validation.reason || 'Invalid position change based on cricket guardrails.');
      return;
    }

    const temp = order[index];
    order[index] = order[targetIdx];
    order[targetIdx] = temp;

    if (teamId === 'p1') onUpdateP1BattingOrder(order);
    else onUpdateP2BattingOrder(order);
  };

  // Auto-optimize batting order for a team
  const handleAutoOptimize = (teamId: 'p1' | 'p2') => {
    setGuardrailNotice(null);
    const team = teamId === 'p1' ? p1Team : p2Team;
    const sorted = optimizeBattingOrder(team.squad);
    if (teamId === 'p1') onUpdateP1BattingOrder(sorted);
    else onUpdateP2BattingOrder(sorted);
  };

  // Handle Coin Flip
  const handleFlipCoin = async () => {
    if (roomCode && myPlayerRole === 'p2') return;

    setTossState('FLIPPING');
    if (roomCode) {
      await updateRoomState(roomCode, { tossState: 'FLIPPING' });
    }

    setTimeout(async () => {
      const res = Math.random() > 0.5 ? 'Heads' : 'Tails';
      setCoinResult(res);
      const winner = res === userChoice ? 'p1' : 'p2';
      setTossWinner(winner);
      setTossState('DECIDING');

      if (winner === 'p2' && p2Team.isAi) {
        const aiDecision = Math.random() > 0.5 ? 'Bat' : 'Bowl';
        setTossDecision(aiDecision);
        setTossState('CONFIRMED');
        if (roomCode) {
          await updateRoomState(roomCode, {
            tossWinner: 'p2',
            tossDecision: aiDecision,
            tossState: 'CONFIRMED',
            tossCoinResult: res,
          });
        }
      } else {
        if (roomCode) {
          await updateRoomState(roomCode, {
            tossWinner: winner,
            tossState: 'DECIDING',
            tossCoinResult: res,
          });
        }
      }
    }, 1200);
  };

  const handleConfirmDecision = async () => {
    setTossState('CONFIRMED');
    if (roomCode) {
      await updateRoomState(roomCode, {
        tossWinner,
        tossDecision,
        tossState: 'CONFIRMED',
      });
    }
  };

  const handleConfirmStart = () => {
    if (roomCode && myPlayerRole === 'p2') return;
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

      {/* Field Pitch Squad Formation */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏟️</span>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Dream XI Field Formations</h3>
              <p className="text-xs text-slate-500">Visual positioning of drafted XI on the field ground</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSummaryPitchTab('p1')}
              className={`px-4 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                summaryPitchTab === 'p1'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {p1Team.name} Field
            </button>
            <button
              type="button"
              onClick={() => setSummaryPitchTab('p2')}
              className={`px-4 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                summaryPitchTab === 'p2'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {p2Team.name} Field
            </button>
          </div>
        </div>

        <FieldPitchView
          squad={summaryPitchTab === 'p1' ? p1Team.squad : p2Team.squad}
          composition={summaryPitchTab === 'p1' ? p1Team.composition : p2Team.composition}
          teamName={summaryPitchTab === 'p1' ? p1Team.name : p2Team.name}
        />
      </div>

      {/* Guardrail Warning Banner if triggered */}
      {guardrailNotice && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 text-xs font-bold flex items-center justify-between gap-3 shadow-sm animate-shake">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{guardrailNotice}</span>
          </div>
          <button
            onClick={() => setGuardrailNotice(null)}
            className="px-2 py-1 rounded bg-rose-200/80 text-rose-900 hover:bg-rose-300 transition-all text-xs font-black"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Batting Lineup Order Customizer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* P1 Lineup */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{p1Team.name} Batting Order</h4>
              <span className="text-[11px] text-slate-500 font-medium">🛡️ Guardrails Active: Bowlers bat #7–#11</span>
            </div>

            <button
              type="button"
              onClick={() => handleAutoOptimize('p1')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold transition-all shadow-2xs self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Auto-Align Realistic Order</span>
            </button>
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
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{player.name}</span>
                      {idx <= 2 && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200">
                          Top Order
                        </span>
                      )}
                      {player.role === 'Bowler' && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                          Bowler
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">{player.role} • OVR {player.ovr} • Bat Avg {player.battingAvg}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => movePlayer('p1', idx, 'UP')}
                    className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                  <button
                    disabled={idx === p1Team.battingOrder.length - 1}
                    onClick={() => movePlayer('p1', idx, 'DOWN')}
                    className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30"
                    title="Move Down"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{p2Team.name} Batting Order</h4>
              <span className="text-[11px] text-slate-500 font-medium">🛡️ Guardrails Active: Bowlers bat #7–#11</span>
            </div>

            <button
              type="button"
              onClick={() => handleAutoOptimize('p2')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold transition-all shadow-2xs self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Auto-Align Realistic Order</span>
            </button>
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
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{player.name}</span>
                      {idx <= 2 && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200">
                          Top Order
                        </span>
                      )}
                      {player.role === 'Bowler' && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                          Bowler
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">{player.role} • OVR {player.ovr} • Bat Avg {player.battingAvg}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => movePlayer('p2', idx, 'UP')}
                    className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-slate-700" />
                  </button>
                  <button
                    disabled={idx === p2Team.battingOrder.length - 1}
                    onClick={() => movePlayer('p2', idx, 'DOWN')}
                    className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30"
                    title="Move Down"
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
            {roomCode && myPlayerRole === 'p2' ? (
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <div className="text-xs font-extrabold uppercase text-amber-600 tracking-wider flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  <span>Online Room Match</span>
                </div>
                <p className="text-sm font-bold text-slate-900">Waiting for Host ({p1Team.name}) to start the coin toss...</p>
                <div className="text-xs text-slate-500">Only the room host can initiate the match coin toss.</div>
              </div>
            ) : (
              <>
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
              </>
            )}
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
              {coinResult && <div className="text-xs text-slate-600">Coin landed on <strong className="text-slate-900">{coinResult}</strong></div>}
              <div className="text-base font-black text-slate-900">
                {tossWinner === 'p1' ? p1Team.name : p2Team.name} won the toss!
              </div>
            </div>

            {/* Check who can choose Bat or Bowl */}
            {((roomCode && ((tossWinner === 'p1' && myPlayerRole === 'p1') || (tossWinner === 'p2' && myPlayerRole === 'p2'))) ||
              (!roomCode && (tossWinner === 'p1' || !p2Team.isAi))) ? (
              <div className="space-y-4">
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

                <button
                  type="button"
                  onClick={handleConfirmDecision}
                  className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-2xs"
                >
                  Confirm Decision
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold space-y-1">
                <div>Waiting for {tossWinner === 'p1' ? p1Team.name : p2Team.name} to choose Bat or Bowl...</div>
                <div className="text-[11px] font-normal text-amber-700">Selection in progress</div>
              </div>
            )}
          </div>
        )}

        {tossState === 'CONFIRMED' && (
          <div className="space-y-6 max-w-md mx-auto">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1 text-emerald-950">
              <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">Toss Completed</div>
              <div className="text-base font-black">
                {tossWinner === 'p1' ? p1Team.name : p2Team.name} won the toss and chose to {tossDecision} first!
              </div>
            </div>

            {(!roomCode || myPlayerRole === 'p1') ? (
              <button
                type="button"
                onClick={handleConfirmStart}
                className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-2xs flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Live Cricket Simulation Match</span>
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold space-y-1">
                <div>Waiting for Host ({p1Team.name}) to start live simulation...</div>
                <div className="text-[11px] font-normal text-slate-500">The match simulation will begin automatically once started.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

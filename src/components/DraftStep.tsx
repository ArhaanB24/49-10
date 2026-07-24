import React, { useState, useEffect, useCallback } from 'react';
import { Player, PlayerRole, UserTeam } from '../types';
import { ICONIC_SQUADS } from '../data/iconicSquads';
import { PlayerCard } from './PlayerCard';
import { chooseAiDraftPick } from '../services/aiDraftService';
import { Sparkles, Bot, Clock, CheckCircle2, Users, ChevronDown, ChevronUp, Dices } from 'lucide-react';

interface DraftStepProps {
  p1Team: UserTeam;
  p2Team: UserTeam;
  globalDraftedCanonicalIds: Set<string>;
  onSelectPlayer: (player: Player, activePlayerId: 'p1' | 'p2') => Promise<void>;
  onCompleteDraft: () => void;
  roomCode?: string;
  myPlayerRole?: 'p1' | 'p2';
  serverActiveTurn?: 'p1' | 'p2';
  serverSquadIndex?: number;
  serverTurnStartTime?: number;
}

export const DraftStep: React.FC<DraftStepProps> = ({
  p1Team,
  p2Team,
  globalDraftedCanonicalIds,
  onSelectPlayer,
  onCompleteDraft,
  roomCode,
  myPlayerRole,
  serverActiveTurn,
  serverSquadIndex,
  serverTurnStartTime,
}) => {
  // Active drafter: 'p1' or 'p2'
  const [localTurn, setLocalTurn] = useState<'p1' | 'p2'>('p1');
  const activeTurn = roomCode ? (serverActiveTurn || 'p1') : localTurn;

  // Track all squad indices that have been drawn in this game to guarantee no repeats
  const [usedSquadIndices, setUsedSquadIndices] = useState<number[]>(() => {
    const initialIdx = Math.floor(Math.random() * ICONIC_SQUADS.length);
    return [initialIdx];
  });

  // Currently revealed surprise squad index
  const [localSquadIndex, setLocalSquadIndex] = useState<number>(() => usedSquadIndices[0]);
  const currentSquadIndex = roomCode && serverSquadIndex !== undefined
    ? (serverSquadIndex % ICONIC_SQUADS.length)
    : localSquadIndex;

  // 30-second selection countdown timer
  const [timeLeft, setTimeLeft] = useState<number>(30);

  // Sync server turn timer for room code mode
  useEffect(() => {
    if (roomCode && serverTurnStartTime) {
      const elapsedSec = Math.floor((Date.now() - serverTurnStartTime) / 1000);
      setTimeLeft(Math.max(0, 30 - elapsedSec));
    }
  }, [roomCode, serverTurnStartTime]);

  // Toggle live squads drawer visibility
  const [showLiveSquads, setShowLiveSquads] = useState<boolean>(true);

  // Gemini AI Draft Advice state
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState<boolean>(false);

  const currentSquad = ICONIC_SQUADS[currentSquadIndex] || ICONIC_SQUADS[0];
  const activeTeam = activeTurn === 'p1' ? p1Team : p2Team;
  const isDraftComplete = p1Team.squad.length === 11 && p2Team.squad.length === 11;

  // Helper to draw a random squad index that hasn't been used yet in this game
  const drawNewRandomSquad = useCallback((usedList: number[]) => {
    const total = ICONIC_SQUADS.length;
    if (total <= 1) return 0;

    const unused = [];
    for (let i = 0; i < total; i++) {
      if (!usedList.includes(i)) {
        unused.push(i);
      }
    }

    let pool = unused;
    if (pool.length === 0) {
      const last = usedList[usedList.length - 1];
      pool = Array.from({ length: total }, (_, i) => i).filter((i) => i !== last);
    }

    const chosen = pool[Math.floor(Math.random() * pool.length)] ?? Math.floor(Math.random() * total);
    return chosen;
  }, []);

  // Calculate needed roles for active team
  const getNeededRoles = (team: UserTeam) => {
    const counts: Record<PlayerRole, number> = {
      Batsman: 0,
      'All-rounder': 0,
      Wicketkeeper: 0,
      Bowler: 0,
    };
    team.squad.forEach((p) => {
      counts[p.role] = (counts[p.role] || 0) + 1;
    });

    return {
      Batsman: Math.max(0, team.composition.batsmen - counts['Batsman']),
      'All-rounder': Math.max(0, team.composition.allRounders - counts['All-rounder']),
      Wicketkeeper: Math.max(0, team.composition.wicketKeepers - counts['Wicketkeeper']),
      Bowler: Math.max(0, team.composition.bowlers - counts['Bowler']),
    };
  };

  const activeNeeded = getNeededRoles(activeTeam);

  // Handle drafting a player
  const handlePlayerDraft = async (player: Player) => {
    if (isDraftComplete) return;

    if (globalDraftedCanonicalIds.has(player.canonicalId)) {
      alert(`${player.name} has already been drafted by another team in this session!`);
      return;
    }

    await onSelectPlayer(player, activeTurn);

    const nextP1Count = activeTurn === 'p1' ? p1Team.squad.length + 1 : p1Team.squad.length;
    const nextP2Count = activeTurn === 'p2' ? p2Team.squad.length + 1 : p2Team.squad.length;

    if (nextP1Count === 11 && nextP2Count === 11) {
      onCompleteDraft();
    } else {
      let nextTurn: 'p1' | 'p2' = activeTurn;
      if (activeTurn === 'p1' && nextP2Count < 11) {
        nextTurn = 'p2';
      } else if (activeTurn === 'p2' && nextP1Count < 11) {
        nextTurn = 'p1';
      } else if (nextP1Count < 11) {
        nextTurn = 'p1';
      } else if (nextP2Count < 11) {
        nextTurn = 'p2';
      }

      setLocalTurn(nextTurn);
      // Automatically switch to a fresh surprise squad for the next turn
      const newIdx = drawNewRandomSquad(usedSquadIndices);
      setLocalSquadIndex(newIdx);
      setUsedSquadIndices((prev) => [...prev, newIdx]);
      // Reset 30s selection countdown timer
      setTimeLeft(30);
    }
  };

  // Auto-pick when 30s timer runs out
  const handleAutoPick = useCallback(async () => {
    const available = currentSquad.players.filter(
      (p) => !globalDraftedCanonicalIds.has(p.canonicalId)
    );

    if (available.length === 0) {
      // If current squad is fully drafted, draw another squad immediately
      const nextIdx = drawNewRandomSquad(usedSquadIndices);
      setLocalSquadIndex(nextIdx);
      setUsedSquadIndices((prev) => [...prev, nextIdx]);
      return;
    }

    const needed = activeNeeded;
    let chosen = available.find((p) => {
      if (p.role === 'Batsman' && needed.Batsman > 0) return true;
      if (p.role === 'All-rounder' && needed['All-rounder'] > 0) return true;
      if (p.role === 'Wicketkeeper' && needed.Wicketkeeper > 0) return true;
      if (p.role === 'Bowler' && needed.Bowler > 0) return true;
      return false;
    });

    if (!chosen) {
      chosen = available.slice().sort((a, b) => b.ovr - a.ovr)[0];
    }

    if (chosen) {
      await handlePlayerDraft(chosen);
    }
  }, [currentSquad, globalDraftedCanonicalIds, activeNeeded, usedSquadIndices, drawNewRandomSquad]);

  // 30-Second Countdown Timer effect
  useEffect(() => {
    if (isDraftComplete) return;
    if (activeTurn === 'p2' && p2Team.isAi) return; // AI turn handles itself

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoPick();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTurn, p2Team.isAi, isDraftComplete, handleAutoPick]);

  // AI Automatic Draft turn handler
  useEffect(() => {
    if (activeTurn === 'p2' && p2Team.isAi && !isDraftComplete) {
      const aiTimer = setTimeout(async () => {
        let chosenPlayer = chooseAiDraftPick(
          currentSquad.players,
          p2Team.squad,
          p2Team.composition,
          globalDraftedCanonicalIds
        );

        if (!chosenPlayer) {
          for (let i = 0; i < ICONIC_SQUADS.length; i++) {
            const sq = ICONIC_SQUADS[i];
            chosenPlayer = chooseAiDraftPick(
              sq.players,
              p2Team.squad,
              p2Team.composition,
              globalDraftedCanonicalIds
            );
            if (chosenPlayer) {
              setLocalSquadIndex(i);
              setUsedSquadIndices((prev) => [...prev, i]);
              break;
            }
          }
        }

        if (chosenPlayer) {
          await handlePlayerDraft(chosenPlayer);
        }
      }, 1000);

      return () => clearTimeout(aiTimer);
    }
  }, [activeTurn, p2Team.isAi, currentSquad, globalDraftedCanonicalIds, isDraftComplete]);

  // Fetch AI Draft Advice
  const fetchAiAdvice = async () => {
    setIsLoadingAdvice(true);
    setAiAdvice(null);
    try {
      const res = await fetch('/api/gemini/draft-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          myTeamName: activeTeam.name,
          needRoles: activeNeeded,
          availableSquadPlayers: currentSquad.players,
          format: 'T20',
        }),
      });
      const data = await res.json();
      setAiAdvice(data.advice || 'Pick top rated players matching your missing slots.');
    } catch {
      setAiAdvice('Pick top rated players that meet your needed role slots.');
    } finally {
      setIsLoadingAdvice(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 text-slate-900 space-y-6">
      {/* Top Banner: Minimal, uncluttered turn bar + 30s timer */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Active Turn Header */}
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-xs ${
              activeTurn === 'p1' ? 'bg-slate-900' : 'bg-slate-700'
            }`}
          >
            {activeTurn === 'p1' ? 'P1' : activeTeam.isAi ? <Bot className="w-6 h-6 text-white" /> : 'P2'}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-slate-500">Active Drafter</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                Pick {p1Team.squad.length + p2Team.squad.length + 1} / 22
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>{activeTeam.name}</span>
              {activeTeam.isAi && (
                <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-semibold">
                  AI Drafter
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* 30-Second Countdown Timer Badge */}
        {(!p2Team.isAi || activeTurn === 'p1') && (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-black transition-all ${
              timeLeft <= 5
                ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                : timeLeft <= 10
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <Clock className={`w-4 h-4 ${timeLeft <= 5 ? 'text-rose-600' : 'text-slate-700'}`} />
            <span>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}s</span>
            <span className="text-[10px] font-medium text-slate-500 uppercase">Selection Timer</span>
          </div>
        )}

        {/* Needed Slot Badges */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <span className="text-slate-400 font-bold mr-1">Needed:</span>
          {activeNeeded.Batsman > 0 && (
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
              {activeNeeded.Batsman} BAT
            </span>
          )}
          {activeNeeded['All-rounder'] > 0 && (
            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200">
              {activeNeeded['All-rounder']} AR
            </span>
          )}
          {activeNeeded.Wicketkeeper > 0 && (
            <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-900 border border-sky-200">
              {activeNeeded.Wicketkeeper} WK
            </span>
          )}
          {activeNeeded.Bowler > 0 && (
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
              {activeNeeded.Bowler} BOW
            </span>
          )}
          {Object.values(activeNeeded).every((v) => v === 0) && (
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Complete
            </span>
          )}
        </div>

        {/* AI Strategy Advisor Button */}
        <button
          type="button"
          onClick={fetchAiAdvice}
          disabled={isLoadingAdvice}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>{isLoadingAdvice ? 'Thinking...' : 'AI Advice'}</span>
        </button>
      </div>

      {/* AI Advice Banner */}
      {aiAdvice && (
        <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-700 shrink-0" />
            <span><strong>AI Advice:</strong> {aiAdvice}</span>
          </div>
          <button onClick={() => setAiAdvice(null)} className="text-purple-700 font-bold">✕</button>
        </div>
      )}

      {/* Real-time Squad Tracker (Real-time live squad view with player names) */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowLiveSquads(!showLiveSquads)}
            className="flex items-center gap-2 text-xs font-bold text-slate-900 hover:text-slate-700"
          >
            <Users className="w-4 h-4 text-slate-700" />
            <span>Real-Time Squad Rosters</span>
            <span className="text-slate-500 font-medium">({p1Team.squad.length}/11 vs {p2Team.squad.length}/11)</span>
            {showLiveSquads ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showLiveSquads && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
            {/* P1 Real-Time Roster */}
            <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between font-bold text-slate-900 pb-1 border-b border-slate-200">
                <span>{p1Team.name} ({p1Team.squad.length}/11)</span>
                <span className="text-[10px] text-slate-500 uppercase">Real-Time Picks</span>
              </div>
              {p1Team.squad.length === 0 ? (
                <div className="text-slate-400 italic text-[11px] py-2">No players drafted yet.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {p1Team.squad.map((p, idx) => (
                    <div key={p.id} className="p-1.5 rounded bg-white border border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-slate-900 line-clamp-1">{idx + 1}. {p.name}</span>
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{p.ovr} {p.role.slice(0, 3).toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* P2 Real-Time Roster */}
            <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between font-bold text-slate-900 pb-1 border-b border-slate-200">
                <span>{p2Team.name} ({p2Team.squad.length}/11)</span>
                <span className="text-[10px] text-slate-500 uppercase">Real-Time Picks</span>
              </div>
              {p2Team.squad.length === 0 ? (
                <div className="text-slate-400 italic text-[11px] py-2">No players drafted yet.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {p2Team.squad.map((p, idx) => (
                    <div key={p.id} className="p-1.5 rounded bg-white border border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-slate-900 line-clamp-1">{idx + 1}. {p.name}</span>
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{p.ovr} {p.role.slice(0, 3).toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Revealed Surprise Squad Header Banner */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-200">
              🎁 Drawn Squad for {activeTeam.name}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
              {currentSquad.year} • {currentSquad.category}
            </span>
          </div>
          <h3 className="text-xl font-black text-slate-900">
            {currentSquad.name}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">{currentSquad.description}</p>
        </div>

        {/* Optional Manual Redraw button */}
        <button
          type="button"
          onClick={() => {
            const nextIdx = drawNewRandomSquad(usedSquadIndices);
            setLocalSquadIndex(nextIdx);
            setUsedSquadIndices((prev) => [...prev, nextIdx]);
          }}
          disabled={(activeTurn === 'p2' && p2Team.isAi) || (!!roomCode && myPlayerRole !== activeTurn)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 shrink-0 disabled:opacity-50"
        >
          <Dices className="w-3.5 h-3.5 text-slate-700" />
          <span>Redraw Squad</span>
        </button>
      </div>

      {/* Squad Players Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {currentSquad.players.map((player) => {
          const isUnavailable = globalDraftedCanonicalIds.has(player.canonicalId);

          const isDraftedByP1 = p1Team.squad.some((p) => p.canonicalId === player.canonicalId);
          const isDraftedByP2 = p2Team.squad.some((p) => p.canonicalId === player.canonicalId);
          const isDraftedByActiveMe = activeTurn === 'p1' ? isDraftedByP1 : isDraftedByP2;

          const isNotMyRoomTurn = roomCode && myPlayerRole && activeTurn !== myPlayerRole;

          let reason = '';
          if (isDraftedByP1) reason = `Drafted by ${p1Team.name}`;
          else if (isDraftedByP2) reason = `Drafted by ${p2Team.name}`;
          else if (isUnavailable) reason = 'Already Drafted';
          else if (isNotMyRoomTurn) reason = "Opponent's Turn";

          return (
            <PlayerCard
              key={player.id}
              player={player}
              isUnavailable={isUnavailable || isNotMyRoomTurn}
              unavailableReason={reason}
              isDraftedByMe={isDraftedByActiveMe}
              disabled={(activeTurn === 'p2' && p2Team.isAi) || isNotMyRoomTurn}
              onSelect={() => handlePlayerDraft(player)}
            />
          );
        })}
      </div>

      {/* Complete Draft Footer */}
      {p1Team.squad.length === 11 && p2Team.squad.length === 11 && (
        <div className="pt-4 text-center">
          <button
            onClick={onCompleteDraft}
            className="py-4 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg shadow-md transition-all"
          >
            Draft Complete! Proceed to Lineups & Coin Toss
          </button>
        </div>
      )}
    </div>
  );
};

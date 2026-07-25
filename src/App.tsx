import React, { useState, useEffect } from 'react';
import {
  AppStage,
  GameFormat,
  MatchSimulationResult,
  PitchType,
  Player,
  UserTeam,
} from './types';
import { Header } from './components/Header';
import { SetupStep } from './components/SetupStep';
import { DraftStep } from './components/DraftStep';
import { TeamSummaryStep } from './components/TeamSummaryStep';
import { SimulationStep } from './components/SimulationStep';
import { ScorecardModal } from './components/ScorecardModal';
import { HelpModal } from './components/HelpModal';
import {
  createRoom,
  joinRoom,
  getRoom,
  draftSelectPlayer,
  updateRoomState,
  subscribeToRoom,
  RoomState,
} from './services/roomService';
import { optimizeBattingOrder } from './services/battingOrderService';

export const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>('SETUP');
  const [format, setFormat] = useState<GameFormat>('T20');
  const [isAiMode, setIsAiMode] = useState<boolean>(true);
  const [pitch, setPitch] = useState<PitchType>('BALANCED');

  // Teams State
  const [p1Team, setP1Team] = useState<UserTeam>({
    id: 'p1',
    name: 'Royal Strikers XI',
    isAi: false,
    composition: { batsmen: 5, allRounders: 2, wicketKeepers: 1, bowlers: 3 },
    squad: [],
    battingOrder: [],
  });

  const [p2Team, setP2Team] = useState<UserTeam>({
    id: 'p2',
    name: 'Cyber Legends XI (AI)',
    isAi: true,
    composition: { batsmen: 5, allRounders: 2, wicketKeepers: 1, bowlers: 3 },
    squad: [],
    battingOrder: [],
  });

  // Track session drafted canonical IDs
  const [globalDraftedCanonicalIds, setGlobalDraftedCanonicalIds] = useState<Set<string>>(new Set());

  // Match Simulation Toss and Result
  const [tossWinner, setTossWinner] = useState<'p1' | 'p2'>('p1');
  const [tossDecision, setTossDecision] = useState<'Bat' | 'Bowl'>('Bat');
  const [matchResult, setMatchResult] = useState<MatchSimulationResult | null>(null);

  // Online Room Code State
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [myPlayerRole, setMyPlayerRole] = useState<'p1' | 'p2' | null>(null);
  const [serverActiveTurn, setServerActiveTurn] = useState<'p1' | 'p2'>('p1');
  const [serverSquadIndex, setServerSquadIndex] = useState<number>(0);
  const [serverTurnStartTime, setServerTurnStartTime] = useState<number>(Date.now());

  // Audio & Help
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Sync session state from backend server on load
  useEffect(() => {
    fetchSessionState();
  }, []);

  // Poll & subscribe to room state when roomCode is active
  useEffect(() => {
    if (!roomCode) return;

    const applyRoomState = (r: RoomState) => {
      setStage(r.status);
      if (r.format) setFormat(r.format);
      if (r.pitch) setPitch(r.pitch);

      if (r.p1) {
        setP1Team((prev) => ({
          ...prev,
          name: r.p1.name || prev.name,
          composition: r.p1.composition || prev.composition,
          squad: r.p1.squad || [],
          battingOrder: r.p1.battingOrder?.length ? r.p1.battingOrder : r.p1.squad || [],
        }));
      }

      if (r.p2) {
        setP2Team((prev) => ({
          ...prev,
          name: r.p2.name || prev.name,
          isAi: r.p2.isAi,
          composition: r.p2.composition || prev.composition,
          squad: r.p2.squad || [],
          battingOrder: r.p2.battingOrder?.length ? r.p2.battingOrder : r.p2.squad || [],
        }));
      }

      if (r.globalDraftedCanonicalIds) {
        setGlobalDraftedCanonicalIds(new Set(r.globalDraftedCanonicalIds));
      }

      if (r.activeDraftTurn) setServerActiveTurn(r.activeDraftTurn);
      if (r.currentSquadIndex !== undefined) setServerSquadIndex(r.currentSquadIndex);
      if (r.turnStartTime) setServerTurnStartTime(r.turnStartTime);
      if (r.tossWinner) setTossWinner(r.tossWinner);
      if (r.tossDecision) setTossDecision(r.tossDecision);
      if (r.matchResult) setMatchResult(r.matchResult);
    };

    // Listen to real-time BroadcastChannel & storage events
    const unsubscribe = subscribeToRoom(roomCode, applyRoomState);

    // Also poll room state every 1 second
    const interval = setInterval(async () => {
      const r = await getRoom(roomCode);
      if (r) applyRoomState(r);
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [roomCode]);

  const fetchSessionState = async () => {
    try {
      const res = await fetch('/api/draft/session');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (data.draftedCanonicalIds) {
          setGlobalDraftedCanonicalIds(new Set(data.draftedCanonicalIds));
        }
      }
    } catch {
      // Fallback local memory
    }
  };

  // Create Online Room Code (Host as P1)
  const handleCreateOnlineRoom = async (
    p1Name: string,
    p1Comp: any,
    selectedFormat: GameFormat,
    selectedPitch: PitchType
  ) => {
    try {
      const res = await createRoom({
        p1Name,
        p1Comp,
        format: selectedFormat,
        pitch: selectedPitch,
        playMode: 'ONLINE_ROOM',
      });

      if (res.success && res.code) {
        setRoomCode(res.code);
        setMyPlayerRole('p1');
        setFormat(selectedFormat);
        setPitch(selectedPitch);
        setIsAiMode(false);
        setP1Team({
          id: 'p1',
          name: p1Name,
          isAi: false,
          composition: p1Comp,
          squad: [],
          battingOrder: [],
        });
        setP2Team({
          id: 'p2',
          name: 'Waiting for Player 2...',
          isAi: false,
          composition: { batsmen: 5, allRounders: 2, wicketKeepers: 1, bowlers: 3 },
          squad: [],
          battingOrder: [],
        });
        setStage('SETUP');
      } else {
        alert('Failed to create room.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error creating room.');
    }
  };

  // Join Online Room Code (Join as P2)
  const handleJoinOnlineRoom = async (
    code: string,
    p2Name: string,
    p2Comp: any
  ) => {
    const res = await joinRoom({
      code,
      p2Name,
      p2Comp,
    });

    setRoomCode(res.code);
    setMyPlayerRole('p2');
    setIsAiMode(false);

    if (res.room) {
      const r = res.room;
      setStage(r.status);
      setFormat(r.format || 'T20');
      setPitch(r.pitch || 'BALANCED');

      setP1Team({
        id: 'p1',
        name: r.p1.name,
        isAi: false,
        composition: r.p1.composition,
        squad: r.p1.squad || [],
        battingOrder: r.p1.battingOrder || [],
      });

      setP2Team({
        id: 'p2',
        name: p2Name,
        isAi: false,
        composition: p2Comp,
        squad: r.p2.squad || [],
        battingOrder: r.p2.battingOrder || [],
      });

      if (r.globalDraftedCanonicalIds) {
        setGlobalDraftedCanonicalIds(new Set(r.globalDraftedCanonicalIds));
      }
    }
  };

  // Complete Setup -> Move to Draft
  const handleCompleteSetup = (
    selectedFormat: GameFormat,
    selectedAiMode: boolean,
    selectedPitch: PitchType,
    p1Data: Partial<UserTeam>,
    p2Data: Partial<UserTeam>
  ) => {
    setFormat(selectedFormat);
    setIsAiMode(selectedAiMode);
    setPitch(selectedPitch);

    setP1Team({
      ...p1Team,
      name: p1Data.name || 'Player 1 XI',
      composition: p1Data.composition!,
      squad: [],
      battingOrder: [],
    });

    setP2Team({
      ...p2Team,
      name: p2Data.name || 'Player 2 XI',
      isAi: selectedAiMode,
      composition: p2Data.composition!,
      squad: [],
      battingOrder: [],
    });

    setStage('DRAFT');
  };

  // Select Player in Draft
  const handleSelectPlayer = async (player: Player, activePlayerId: 'p1' | 'p2') => {
    if (roomCode) {
      try {
        const r = await draftSelectPlayer(roomCode, myPlayerRole || activePlayerId, player);
        if (r) {
          setStage(r.status);
          setP1Team((prev) => ({ ...prev, squad: r.p1.squad, battingOrder: r.p1.battingOrder }));
          setP2Team((prev) => ({ ...prev, squad: r.p2.squad, battingOrder: r.p2.battingOrder }));
          setGlobalDraftedCanonicalIds(new Set(r.globalDraftedCanonicalIds));
          setServerActiveTurn(r.activeDraftTurn);
          setServerSquadIndex(r.currentSquadIndex);
          setServerTurnStartTime(r.turnStartTime);
        }
      } catch (err: any) {
        alert(err?.message || 'Failed to submit pick to room');
      }
      return;
    }

    try {
      const res = await fetch('/api/draft/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          canonicalId: player.canonicalId,
          activePlayerId,
        }),
      });

      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (!data.success) {
          alert(data.message || 'Player unavailable');
          return;
        }
        setGlobalDraftedCanonicalIds(new Set(data.draftedCanonicalIds));
      } else {
        const newCanonicalSet = new Set(globalDraftedCanonicalIds);
        newCanonicalSet.add(player.canonicalId);
        setGlobalDraftedCanonicalIds(newCanonicalSet);
      }

      if (activePlayerId === 'p1') {
        const updatedSquad = [...p1Team.squad, player];
        setP1Team({
          ...p1Team,
          squad: updatedSquad,
          battingOrder: optimizeBattingOrder(updatedSquad),
        });
      } else {
        const updatedSquad = [...p2Team.squad, player];
        setP2Team({
          ...p2Team,
          squad: updatedSquad,
          battingOrder: optimizeBattingOrder(updatedSquad),
        });
      }
    } catch {
      // Optimistic update fallback
      const newCanonicalSet = new Set(globalDraftedCanonicalIds);
      newCanonicalSet.add(player.canonicalId);
      setGlobalDraftedCanonicalIds(newCanonicalSet);

      if (activePlayerId === 'p1') {
        const updatedSquad = [...p1Team.squad, player];
        setP1Team({
          ...p1Team,
          squad: updatedSquad,
          battingOrder: optimizeBattingOrder(updatedSquad),
        });
      } else {
        const updatedSquad = [...p2Team.squad, player];
        setP2Team({
          ...p2Team,
          squad: updatedSquad,
          battingOrder: optimizeBattingOrder(updatedSquad),
        });
      }
    }
  };

  // Complete Draft -> Move to Summary
  const handleCompleteDraft = async () => {
    if (roomCode) {
      await updateRoomState(roomCode, { status: 'SUMMARY' });
    }
    setStage('SUMMARY');
  };

  // Start Match Simulation
  const handleStartMatch = async (winner: 'p1' | 'p2', decision: 'Bat' | 'Bowl') => {
    setTossWinner(winner);
    setTossDecision(decision);

    if (roomCode) {
      await updateRoomState(roomCode, {
        status: 'SIMULATION',
        tossWinner: winner,
        tossDecision: decision,
      });
    }
    setStage('SIMULATION');
  };

  // Finish Simulation -> Show Scorecard
  const handleSimulationComplete = async (result: MatchSimulationResult) => {
    setMatchResult(result);
    if (roomCode) {
      await updateRoomState(roomCode, {
        status: 'SCORECARD',
        matchResult: result,
      });
    }
    setStage('SCORECARD');
  };

  // Reset Session
  const handleResetSession = async () => {
    if (window.confirm('Are you sure you want to reset current draft session & teams?')) {
      try {
        await fetch('/api/draft/reset', { method: 'POST' });
      } catch {}
      setRoomCode(null);
      setMyPlayerRole(null);
      setGlobalDraftedCanonicalIds(new Set());
      setP1Team({ ...p1Team, squad: [], battingOrder: [] });
      setP2Team({ ...p2Team, squad: [], battingOrder: [] });
      setMatchResult(null);
      setStage('SETUP');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-200 selection:text-slate-900 pb-12">
      <Header
        stage={stage}
        format={format}
        isAiMode={isAiMode}
        roomCode={roomCode}
        myPlayerRole={myPlayerRole}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        onResetSession={handleResetSession}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      <main className="container mx-auto px-4 pt-4">
        {stage === 'SETUP' && (
          <SetupStep
            roomCode={roomCode}
            myPlayerRole={myPlayerRole}
            onCancelRoom={() => {
              setRoomCode(null);
              setMyPlayerRole(null);
            }}
            onCompleteSetup={handleCompleteSetup}
            onCreateOnlineRoom={handleCreateOnlineRoom}
            onJoinOnlineRoom={handleJoinOnlineRoom}
          />
        )}

        {stage === 'DRAFT' && (
          <DraftStep
            p1Team={p1Team}
            p2Team={p2Team}
            globalDraftedCanonicalIds={globalDraftedCanonicalIds}
            onSelectPlayer={handleSelectPlayer}
            onCompleteDraft={handleCompleteDraft}
            roomCode={roomCode || undefined}
            myPlayerRole={myPlayerRole || undefined}
            serverActiveTurn={serverActiveTurn}
            serverSquadIndex={serverSquadIndex}
            serverTurnStartTime={serverTurnStartTime}
          />
        )}

        {stage === 'SUMMARY' && (
          <TeamSummaryStep
            p1Team={p1Team}
            p2Team={p2Team}
            onUpdateP1BattingOrder={(order) => setP1Team({ ...p1Team, battingOrder: order })}
            onUpdateP2BattingOrder={(order) => setP2Team({ ...p2Team, battingOrder: order })}
            onStartMatch={handleStartMatch}
          />
        )}

        {stage === 'SIMULATION' && (
          <SimulationStep
            format={format}
            pitch={pitch}
            p1Team={p1Team}
            p2Team={p2Team}
            tossWinner={tossWinner}
            tossDecision={tossDecision}
            isMuted={isMuted}
            onSimulationComplete={handleSimulationComplete}
          />
        )}

        {stage === 'SCORECARD' && matchResult && (
          <ScorecardModal
            result={matchResult}
            p1Team={p1Team}
            p2Team={p2Team}
            onRestartNewMatch={handleResetSession}
          />
        )}
      </main>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};

export default App;

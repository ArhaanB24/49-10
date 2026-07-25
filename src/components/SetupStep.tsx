import React, { useState, useEffect } from 'react';
import { GameFormat, PitchType, TeamComposition, UserTeam } from '../types';
import { Trophy, Users, Bot, Settings2, Play, AlertCircle, Wifi, Copy, ArrowRight } from 'lucide-react';

interface SetupStepProps {
  roomCode?: string | null;
  myPlayerRole?: 'p1' | 'p2' | null;
  onCancelRoom?: () => void;
  onCompleteSetup: (
    format: GameFormat,
    isAiMode: boolean,
    pitch: PitchType,
    p1Team: Partial<UserTeam>,
    p2Team: Partial<UserTeam>
  ) => void;
  onCreateOnlineRoom?: (
    p1Name: string,
    p1Comp: TeamComposition,
    format: GameFormat,
    pitch: PitchType
  ) => Promise<void>;
  onJoinOnlineRoom?: (
    code: string,
    p2Name: string,
    p2Comp: TeamComposition
  ) => Promise<void>;
}

export const SetupStep: React.FC<SetupStepProps> = ({
  roomCode,
  myPlayerRole,
  onCancelRoom,
  onCompleteSetup,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
}) => {
  const [format, setFormat] = useState<GameFormat>('T20');
  const [playMode, setPlayMode] = useState<'VS_AI' | 'LOCAL_2P' | 'ONLINE_ROOM'>('VS_AI');
  const [pitch, setPitch] = useState<PitchType>('BALANCED');

  // Room Code state
  const [roomSubTab, setRoomSubTab] = useState<'create' | 'join'>('create');
  const [inputRoomCode, setInputRoomCode] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const [p1Name, setP1Name] = useState<string>('Royal Strikers XI');
  const [p2Name, setP2Name] = useState<string>('Cyber Legends XI');

  // Check URL query string for ?room=XXXXXX
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('room');
    if (codeParam) {
      setInputRoomCode(codeParam.toUpperCase());
      setPlayMode('ONLINE_ROOM');
      setRoomSubTab('join');
    }
  }, []);

  const [p1Comp, setP1Comp] = useState<TeamComposition>({
    batsmen: 5,
    allRounders: 2,
    wicketKeepers: 1, // Compulsory 1
    bowlers: 3,
  });

  const [p2Comp, setP2Comp] = useState<TeamComposition>({
    batsmen: 5,
    allRounders: 2,
    wicketKeepers: 1, // Compulsory 1
    bowlers: 3,
  });

  const p1Total = p1Comp.batsmen + p1Comp.allRounders + p1Comp.wicketKeepers + p1Comp.bowlers;
  const p2Total = p2Comp.batsmen + p2Comp.allRounders + p2Comp.wicketKeepers + p2Comp.bowlers;

  const isP1Valid = p1Total === 11 && p1Comp.wicketKeepers === 1;
  const isP2Valid = p2Total === 11 && p2Comp.wicketKeepers === 1;

  const applyPreset = (
    player: 'p1' | 'p2',
    preset: 'balanced' | 'batting' | 'bowling'
  ) => {
    let comp: TeamComposition = { batsmen: 5, allRounders: 2, wicketKeepers: 1, bowlers: 3 };
    if (preset === 'batting') {
      comp = { batsmen: 6, allRounders: 1, wicketKeepers: 1, bowlers: 3 };
    } else if (preset === 'bowling') {
      comp = { batsmen: 4, allRounders: 2, wicketKeepers: 1, bowlers: 4 };
    }

    if (player === 'p1') setP1Comp(comp);
    else setP2Comp(comp);
  };

  const handleStartDraft = async () => {
    if (playMode === 'ONLINE_ROOM') {
      if (roomSubTab === 'create' && onCreateOnlineRoom) {
        if (!isP1Valid) return;
        await onCreateOnlineRoom(p1Name.trim() || 'Player 1 XI', p1Comp, format, pitch);
      } else if (roomSubTab === 'join' && onJoinOnlineRoom) {
        if (!isP2Valid || !inputRoomCode.trim()) {
          setJoinError('Please enter a valid 6-digit Room Code!');
          return;
        }
        setIsJoining(true);
        setJoinError(null);
        try {
          await onJoinOnlineRoom(inputRoomCode.trim(), p2Name.trim() || 'Player 2 XI', p2Comp);
        } catch (err: any) {
          setJoinError(err.message || 'Failed to join room. Please check the code.');
        } finally {
          setIsJoining(false);
        }
      }
      return;
    }

    if (!isP1Valid || !isP2Valid) return;

    const isAiMode = playMode === 'VS_AI';
    onCompleteSetup(
      format,
      isAiMode,
      pitch,
      {
        id: 'p1',
        name: p1Name.trim() || 'Player 1 XI',
        isAi: false,
        composition: p1Comp,
      },
      {
        id: 'p2',
        name: isAiMode ? `${p2Name.trim() || 'AI Legends'} (AI)` : p2Name.trim() || 'Player 2 XI',
        isAi: isAiMode,
        composition: p2Comp,
      }
    );
  };

  const copyRoomCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const copyShareLink = () => {
    if (!roomCode) return;
    const shareUrl = `${window.location.origin}/?room=${roomCode}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (roomCode && myPlayerRole === 'p1') {
    const shareUrl = `${window.location.origin}/?room=${roomCode}`;

    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-slate-900 space-y-8">
        <div className="p-8 rounded-3xl bg-white border border-emerald-200 shadow-xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
            Online Room Active & Waiting
          </div>

          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">
              Your 6-Digit Room Code
            </span>
            <div className="text-5xl font-black tracking-widest text-emerald-950 font-mono my-2 select-all">
              {roomCode}
            </div>
            <p className="text-xs text-slate-600 font-medium max-w-md mx-auto">
              Share this code or direct link with Player 2. When they join on their device, the Fantasy Draft will start automatically on both screens!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={copyRoomCode}
              className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              <Copy className="w-4 h-4" />
              <span>{copiedCode ? 'Code Copied!' : 'Copy 6-Digit Code'}</span>
            </button>

            <button
              type="button"
              onClick={copyShareLink}
              className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              <Wifi className="w-4 h-4" />
              <span>{copiedLink ? 'Link Copied!' : 'Copy Direct Share Link'}</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
            <div className="font-black text-slate-800 uppercase tracking-wide">Match Setup Summary</div>
            <div className="grid grid-cols-2 gap-2 text-slate-600">
              <div><span className="font-semibold text-slate-900">Format:</span> {format}</div>
              <div><span className="font-semibold text-slate-900">Pitch:</span> {pitch}</div>
              <div><span className="font-semibold text-slate-900">Host Team:</span> {p1Name}</div>
              <div><span className="font-semibold text-slate-900">Host Composition:</span> {p1Comp.batsmen} Bat, {p1Comp.allRounders} AR, 1 WK, {p1Comp.bowlers} Bowl</div>
            </div>
          </div>

          {onCancelRoom && (
            <button
              type="button"
              onClick={onCancelRoom}
              className="text-xs text-slate-500 hover:text-rose-600 font-medium underline transition-all pt-2"
            >
              Cancel Room & Return to Setup
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-slate-900 space-y-8">
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold">
          <Trophy className="w-4 h-4 text-slate-700" />
          Cricket Fantasy XI Simulator
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
          BUILD YOUR ULTIMATE CRICKET ELEVEN
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto text-sm">
          Set up match format, team compositions, and pitch conditions. Select 1 compulsory wicketkeeper, batsmen, all-rounders, and bowlers to prepare for the surprise fantasy draft.
        </p>
      </div>

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Match Settings Panel */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center gap-2 text-base font-bold text-slate-900 pb-3 border-b border-slate-200">
            <Settings2 className="w-5 h-5 text-slate-700" />
            <span>1. Match Format & Conditions</span>
          </div>

          {/* Format Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
              Match Format
            </label>
            {playMode === 'ONLINE_ROOM' && roomSubTab === 'join' ? (
              <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-700 font-medium flex items-center justify-between">
                <span>Match Format</span>
                <span className="font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                  Set by Host (P1)
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat('T20')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    format === 'T20'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-sm">T20 Match</div>
                  <div className={`text-xs mt-1 ${format === 'T20' ? 'text-slate-300' : 'text-slate-500'}`}>
                    20 Overs • High-Octane Action
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('ODI')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    format === 'ODI'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-sm">ODI Match</div>
                  <div className={`text-xs mt-1 ${format === 'ODI' ? 'text-slate-300' : 'text-slate-500'}`}>
                    50 Overs • Strategic Endurance
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
              Game Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setPlayMode('VS_AI')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                  playMode === 'VS_AI'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <Bot className={`w-4 h-4 shrink-0 mt-0.5 ${playMode === 'VS_AI' ? 'text-white' : 'text-slate-600'}`} />
                <div>
                  <div className="font-bold text-xs">1P vs AI</div>
                  <div className={`text-[10px] mt-0.5 ${playMode === 'VS_AI' ? 'text-slate-300' : 'text-slate-500'}`}>
                    Single player against AI
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPlayMode('LOCAL_2P')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                  playMode === 'LOCAL_2P'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <Users className={`w-4 h-4 shrink-0 mt-0.5 ${playMode === 'LOCAL_2P' ? 'text-white' : 'text-slate-600'}`} />
                <div>
                  <div className="font-bold text-xs">2P Pass & Play</div>
                  <div className={`text-[10px] mt-0.5 ${playMode === 'LOCAL_2P' ? 'text-slate-300' : 'text-slate-500'}`}>
                    Play on same device
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPlayMode('ONLINE_ROOM')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                  playMode === 'ONLINE_ROOM'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-emerald-400'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <Wifi className={`w-4 h-4 shrink-0 mt-0.5 ${playMode === 'ONLINE_ROOM' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <div>
                  <div className="font-bold text-xs flex items-center gap-1">
                    <span>2P Room Code</span>
                    <span className="px-1 py-0.2 rounded text-[9px] bg-emerald-500 text-white font-bold">ONLINE</span>
                  </div>
                  <div className={`text-[10px] mt-0.5 ${playMode === 'ONLINE_ROOM' ? 'text-slate-300' : 'text-slate-500'}`}>
                    Play from 2 devices
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Online Room Creation & Joining Panel */}
          {playMode === 'ONLINE_ROOM' && (
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                <span className="text-xs font-black text-emerald-950 uppercase flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-emerald-700" />
                  Cross-Device Multiplayer
                </span>

                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-emerald-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setRoomSubTab('create')}
                    className={`px-3 py-1 rounded font-bold transition-all ${
                      roomSubTab === 'create'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Host Room (P1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomSubTab('join')}
                    className={`px-3 py-1 rounded font-bold transition-all ${
                      roomSubTab === 'join'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Join Room (P2)
                  </button>
                </div>
              </div>

              {roomSubTab === 'create' ? (
                <div className="text-xs text-emerald-900 space-y-2">
                  <p className="font-semibold">
                    Hosting creates a unique 6-digit Room Code. Share the code with your opponent so they can join from their device!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700">Enter 6-Digit Room Code</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 839210"
                      value={inputRoomCode}
                      onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                      className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-center text-lg font-black tracking-widest text-slate-900 focus:outline-none focus:border-slate-500 uppercase shrink-0 w-44"
                    />
                    <span className="text-xs text-slate-500 font-medium">Ask Host (P1) for code</span>
                  </div>

                  {joinError && (
                    <div className="p-2.5 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{joinError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pitch Condition */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
              Pitch Condition
            </label>
            {playMode === 'ONLINE_ROOM' && roomSubTab === 'join' ? (
              <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-700 font-medium flex items-center justify-between">
                <span>Pitch Condition</span>
                <span className="font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                  Set by Host (P1)
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'BALANCED', label: 'Balanced Pitch', desc: 'Equal assistance to bat & ball' },
                    { id: 'BATTING', label: 'Batting Pitch', desc: 'Flat surface with high scores' },
                    { id: 'BOWLING', label: 'Green Pitch', desc: 'Extra seam & pace movement' },
                    { id: 'SPIN', label: 'Spinning Pitch', desc: 'Dry pitch with turn' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPitch(p.id)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      pitch === p.id
                        ? 'bg-slate-900 text-white border-slate-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold">{p.label}</div>
                    <div className={`text-[10px] mt-0.5 ${pitch === p.id ? 'text-slate-300' : 'text-slate-500'}`}>
                      {p.desc}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Team Names */}
          <div className="pt-2">
            {playMode === 'ONLINE_ROOM' ? (
              roomSubTab === 'create' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Your Team Name (Host / P1)</label>
                  <input
                    type="text"
                    value={p1Name}
                    onChange={(e) => setP1Name(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Your Team Name (Player 2)</label>
                  <input
                    type="text"
                    value={p2Name}
                    onChange={(e) => setP2Name(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>
              )
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Player 1 Team Name</label>
                  <input
                    type="text"
                    value={p1Name}
                    onChange={(e) => setP1Name(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    {playMode === 'VS_AI' ? 'AI Team Name' : 'Player 2 Team Name'}
                  </label>
                  <input
                    type="text"
                    value={p2Name}
                    onChange={(e) => setP2Name(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Team Compositions Panel */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-base font-bold text-slate-900 pb-3 border-b border-slate-200">
              <Users className="w-5 h-5 text-slate-700" />
              <span>
                2. 11-Player Squad Composition{' '}
                {playMode === 'ONLINE_ROOM' && (roomSubTab === 'create' ? '(Your Team)' : '(Your Team)')}
              </span>
            </div>

            {/* Player 1 Composition Config (rendered if not ONLINE_ROOM, or if ONLINE_ROOM create) */}
            {(playMode !== 'ONLINE_ROOM' || roomSubTab === 'create') && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">{p1Name}</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="text-slate-500">Total:</span>
                    <span className={`px-2 py-0.5 rounded ${isP1Valid ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                      {p1Total} / 11
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500 font-medium">Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('p1', 'balanced')}
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium"
                  >
                    Balanced (5-2-1-3)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('p1', 'batting')}
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium"
                  >
                    Bat Heavy (6-1-1-3)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('p1', 'bowling')}
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium"
                  >
                    Bowl Heavy (4-2-1-4)
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                  <div>
                    <label className="text-slate-500 block mb-1">Batsmen</label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={p1Comp.batsmen}
                      onChange={(e) => setP1Comp({ ...p1Comp, batsmen: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">All-rounders</label>
                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={p1Comp.allRounders}
                      onChange={(e) => setP1Comp({ ...p1Comp, allRounders: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Wicketkeeper</label>
                    <input
                      type="number"
                      value={1}
                      disabled
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-100 border border-slate-200 font-bold text-slate-600 cursor-not-allowed"
                    />
                    <span className="text-[9px] text-slate-500 font-semibold">1 Compulsory</span>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Bowlers</label>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={p1Comp.bowlers}
                      onChange={(e) => setP1Comp({ ...p1Comp, bowlers: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Player 2 Composition Config (rendered if not ONLINE_ROOM, or if ONLINE_ROOM join) */}
            {(playMode !== 'ONLINE_ROOM' || roomSubTab === 'join') && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">
                    {playMode === 'VS_AI' ? `${p2Name} (AI)` : p2Name}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="text-slate-500">Total:</span>
                    <span className={`px-2 py-0.5 rounded ${isP2Valid ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                      {p2Total} / 11
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500 font-medium">Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('p2', 'balanced')}
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium"
                  >
                    Balanced (5-2-1-3)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('p2', 'batting')}
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium"
                  >
                    Bat Heavy (6-1-1-3)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('p2', 'bowling')}
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium"
                  >
                    Bowl Heavy (4-2-1-4)
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                  <div>
                    <label className="text-slate-500 block mb-1">Batsmen</label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={p2Comp.batsmen}
                      onChange={(e) => setP2Comp({ ...p2Comp, batsmen: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">All-rounders</label>
                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={p2Comp.allRounders}
                      onChange={(e) => setP2Comp({ ...p2Comp, allRounders: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Wicketkeeper</label>
                    <input
                      type="number"
                      value={1}
                      disabled
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-100 border border-slate-200 font-bold text-slate-600 cursor-not-allowed"
                    />
                    <span className="text-[9px] text-slate-500 font-semibold">1 Compulsory</span>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Bowlers</label>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={p2Comp.bowlers}
                      onChange={(e) => setP2Comp({ ...p2Comp, bowlers: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            {playMode === 'ONLINE_ROOM' ? (
              roomSubTab === 'create' ? (
                <>
                  {!isP1Valid && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Host composition must total 11 players with 1 compulsory Wicketkeeper!</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleStartDraft}
                    disabled={!isP1Valid}
                    className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      isP1Valid
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-black'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Wifi className="w-4 h-4" />
                    <span>Host Online Room & Generate Code</span>
                  </button>
                </>
              ) : (
                <>
                  {(!isP2Valid || !inputRoomCode.trim()) && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Enter a valid 6-digit Room Code and 11-player squad composition!</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleStartDraft}
                    disabled={!isP2Valid || !inputRoomCode.trim() || isJoining}
                    className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      isP2Valid && inputRoomCode.trim() && !isJoining
                        ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs font-black'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>{isJoining ? 'Joining Room...' : 'Join Online Room & Start Draft'}</span>
                  </button>
                </>
              )
            ) : (
              <>
                {(!isP1Valid || !isP2Valid) && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Each team composition must total 11 players with 1 compulsory Wicketkeeper!</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleStartDraft}
                  disabled={!isP1Valid || !isP2Valid}
                  className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    isP1Valid && isP2Valid
                      ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs font-black'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Proceed to Surprise Fantasy Draft</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

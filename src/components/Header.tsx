import React from 'react';
import { Trophy, Users, RefreshCw, Volume2, VolumeX, HelpCircle, Sparkles } from 'lucide-react';
import { AppStage, GameFormat } from '../types';

interface HeaderProps {
  stage: AppStage;
  format: GameFormat;
  isAiMode: boolean;
  isMuted: boolean;
  roomCode?: string;
  myPlayerRole?: 'p1' | 'p2';
  onToggleMute: () => void;
  onResetSession: () => void;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stage,
  format,
  isAiMode,
  isMuted,
  roomCode,
  myPlayerRole,
  onToggleMute,
  onResetSession,
  onOpenHelp,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stageLabels: Record<AppStage, { label: string; num: number }> = {
    SETUP: { label: 'Squad Setup', num: 1 },
    DRAFT: { label: 'Fantasy Draft', num: 2 },
    SUMMARY: { label: 'Team Ratings', num: 3 },
    TOSS: { label: 'Coin Toss', num: 4 },
    SIMULATION: { label: 'Live Simulation', num: 5 },
    SCORECARD: { label: 'Final Scorecard', num: 6 },
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-900 px-4 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <img
            src="/src/assets/images/cricket_app_logo_1785001395270.jpg"
            alt="Cricket Fantasy Logo"
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-xl object-cover shadow-xs border border-slate-200"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-black tracking-tight text-slate-900">
                CRICKET FANTASY XI
              </h1>
              {roomCode && (
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 text-xs font-black transition-all"
                  title="Click to copy Room Code"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  <span>ROOM: {roomCode}</span>
                  {myPlayerRole && (
                    <span className="text-[10px] bg-emerald-200 text-emerald-950 px-1 rounded uppercase font-bold">
                      ({myPlayerRole.toUpperCase()})
                    </span>
                  )}
                  <span className="text-[10px] underline ml-1">{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                {format} Match
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-600" />
                {roomCode ? 'Online Room Code (2 Devices)' : isAiMode ? '1P vs AI' : '2P Pass & Play'}
              </span>
            </div>
          </div>
        </div>

        {/* Stepper Progress */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
          {(Object.keys(stageLabels) as AppStage[]).map((st) => {
            const isActive = stage === st;
            const isPassed = stageLabels[st].num < stageLabels[stage].num;
            return (
              <div
                key={st}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs scale-105'
                    : isPassed
                    ? 'text-slate-800 bg-slate-200'
                    : 'text-slate-400'
                }`}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold border border-current">
                  {stageLabels[st].num}
                </span>
                <span>{stageLabels[st].label}</span>
              </div>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMute}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
            title={isMuted ? 'Unmute Stadium Sounds' : 'Mute Sound Effects'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
          </button>

          <button
            onClick={onOpenHelp}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
            title="Match Rules & Instructions"
          >
            <HelpCircle className="w-4 h-4 text-amber-600" />
          </button>

          <button
            onClick={onResetSession}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all"
            title="Reset Match & Draft Session"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};

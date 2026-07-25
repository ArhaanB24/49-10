import React from 'react';
import { Player, TeamComposition } from '../types';
import { Shield, User, Award } from 'lucide-react';

interface FieldPitchViewProps {
  squad: Player[];
  composition?: TeamComposition;
  teamName?: string;
  isAi?: boolean;
}

// Format player name for badge e.g. "Virat Kohli" -> "V Kohli"
function formatShortName(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0];
  const firstNameLetter = parts[0][0].toUpperCase();
  const lastName = parts.slice(1).join(' ');
  return `${firstNameLetter} ${lastName}`;
}

export const FieldPitchView: React.FC<FieldPitchViewProps> = ({
  squad,
  composition = { batsmen: 5, allRounders: 2, wicketKeepers: 1, bowlers: 3 },
  teamName = 'My Fantasy XI',
}) => {
  // Group players by role
  const keepers = squad.filter((p) => p.role === 'Wicketkeeper');
  const batsmen = squad.filter((p) => p.role === 'Batsman');
  const allRounders = squad.filter((p) => p.role === 'All-rounder');
  const bowlers = squad.filter((p) => p.role === 'Bowler');

  // Calculate missing slots based on composition
  const neededKeepers = Math.max(0, (composition.wicketKeepers || 1) - keepers.length);
  const neededBatsmen = Math.max(0, (composition.batsmen || 5) - batsmen.length);
  const neededAllRounders = Math.max(0, (composition.allRounders || 2) - allRounders.length);
  const neededBowlers = Math.max(0, (composition.bowlers || 3) - bowlers.length);

  // Identify Captain / Vice Captain candidates (top OVR)
  const sortedByOvr = [...squad].sort((a, b) => b.ovr - a.ovr);
  const captainId = sortedByOvr[0]?.id;
  const viceCaptainId = sortedByOvr[1]?.id;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 border-4 border-emerald-700/80 shadow-2xl p-4 sm:p-6 text-white font-sans selection:bg-emerald-500 selection:text-white">
      {/* Stadium Grass Markings & Field Oval Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.25)_0%,transparent_70%)]" />
      <div className="absolute inset-3 sm:inset-6 border-2 border-dashed border-white/25 rounded-[3rem] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 sm:w-28 h-60 sm:h-72 bg-amber-200/10 border border-amber-300/20 rounded-md pointer-events-none" />

      {/* Header Badge */}
      <div className="relative z-10 flex items-center justify-between pb-3 mb-4 border-b border-emerald-600/40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-2xs">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white uppercase drop-shadow-xs">
              {teamName}
            </h3>
            <span className="text-[10px] text-emerald-300 font-medium">
              Dream XI Field Formation • {squad.length}/11 Drafted
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-xs font-bold text-amber-300 shadow-2xs">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>{squad.length === 11 ? 'XI Complete' : `${11 - squad.length} Slots Left`}</span>
        </div>
      </div>

      {/* Pitch Formation Sections */}
      <div className="relative z-10 space-y-6 sm:space-y-8 py-2">
        {/* 1. WICKET KEEPER SECTION */}
        <div className="space-y-2">
          <div className="text-center">
            <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-600/40 text-[10px] sm:text-xs font-black tracking-widest text-emerald-200 uppercase shadow-xs">
              Wicket Keeper
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
            {keepers.map((player) => (
              <PlayerFieldBadge
                key={player.id}
                player={player}
                isCaptain={player.id === captainId}
                isViceCaptain={player.id === viceCaptainId}
              />
            ))}
            {Array.from({ length: neededKeepers }).map((_, i) => (
              <EmptyFieldSlot key={`keeper-slot-${i}`} label="Wicket Keeper" />
            ))}
          </div>
        </div>

        {/* 2. BATTER SECTION */}
        <div className="space-y-2">
          <div className="text-center">
            <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-600/40 text-[10px] sm:text-xs font-black tracking-widest text-emerald-200 uppercase shadow-xs">
              Batter
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
            {batsmen.map((player) => (
              <PlayerFieldBadge
                key={player.id}
                player={player}
                isCaptain={player.id === captainId}
                isViceCaptain={player.id === viceCaptainId}
              />
            ))}
            {Array.from({ length: neededBatsmen }).map((_, i) => (
              <EmptyFieldSlot key={`batter-slot-${i}`} label="Batter" />
            ))}
          </div>
        </div>

        {/* 3. ALL ROUNDER SECTION */}
        <div className="space-y-2">
          <div className="text-center">
            <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-600/40 text-[10px] sm:text-xs font-black tracking-widest text-emerald-200 uppercase shadow-xs">
              All Rounder
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
            {allRounders.map((player) => (
              <PlayerFieldBadge
                key={player.id}
                player={player}
                isCaptain={player.id === captainId}
                isViceCaptain={player.id === viceCaptainId}
              />
            ))}
            {Array.from({ length: neededAllRounders }).map((_, i) => (
              <EmptyFieldSlot key={`ar-slot-${i}`} label="All Rounder" />
            ))}
          </div>
        </div>

        {/* 4. BOWLER SECTION */}
        <div className="space-y-2">
          <div className="text-center">
            <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-600/40 text-[10px] sm:text-xs font-black tracking-widest text-emerald-200 uppercase shadow-xs">
              Bowler
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
            {bowlers.map((player) => (
              <PlayerFieldBadge
                key={player.id}
                player={player}
                isCaptain={player.id === captainId}
                isViceCaptain={player.id === viceCaptainId}
              />
            ))}
            {Array.from({ length: neededBowlers }).map((_, i) => (
              <EmptyFieldSlot key={`bowler-slot-${i}`} label="Bowler" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Player Field Badge Sub-component
interface PlayerFieldBadgeProps {
  player: Player;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
}

const PlayerFieldBadge: React.FC<PlayerFieldBadgeProps> = ({
  player,
  isCaptain,
  isViceCaptain,
}) => {
  return (
    <div className="group relative flex flex-col items-center transition-transform hover:scale-105">
      {/* C / VC Badge */}
      {isCaptain && (
        <span className="absolute -top-2 -left-1.5 z-20 w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center border-2 border-slate-900 shadow-md">
          C
        </span>
      )}
      {isViceCaptain && !isCaptain && (
        <span className="absolute -top-2 -left-1.5 z-20 w-5 h-5 rounded-full bg-slate-200 text-slate-900 font-black text-[9px] flex items-center justify-center border-2 border-slate-900 shadow-md">
          VC
        </span>
      )}

      {/* Avatar Icon Bubble */}
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-slate-800 to-slate-950 border-2 border-emerald-400/80 shadow-lg flex items-center justify-center text-emerald-300 mb-1">
        <User className="w-5 h-5" />
      </div>

      {/* Dark Name Badge (Dream11 Style) */}
      <div className="px-2.5 py-0.5 rounded-md bg-slate-950/90 border border-slate-700/80 text-white font-bold text-xs sm:text-xs tracking-tight shadow-md whitespace-nowrap min-w-[4.5rem] text-center">
        {formatShortName(player.name)}
      </div>

      {/* OVR / Value Sub-tag */}
      <div className="mt-0.5 text-[10px] font-extrabold text-amber-300 bg-emerald-950/90 px-1.5 py-0.2 rounded border border-emerald-600/40">
        {player.ovr} OVR
      </div>
    </div>
  );
};

// Empty Slot Sub-component
const EmptyFieldSlot: React.FC<{ label: string }> = ({ label }) => {
  return (
    <div className="flex flex-col items-center opacity-60">
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center text-white/50 mb-1 bg-black/10">
        +
      </div>
      <div className="px-2 py-0.5 rounded bg-black/40 text-[10px] text-emerald-200 border border-white/10 font-medium">
        Empty {label}
      </div>
    </div>
  );
};

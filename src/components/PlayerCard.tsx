import React, { useState } from 'react';
import { Player } from '../types';
import { ShieldAlert, UserCheck, PlusCircle, Check } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  isUnavailable?: boolean;
  unavailableReason?: string;
  isDraftedByMe?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isUnavailable = false,
  unavailableReason,
  isDraftedByMe = false,
  onSelect,
  disabled = false,
  compact = false,
}) => {
  const [isJustClicked, setIsJustClicked] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || isUnavailable || !onSelect || isDraftedByMe) return;

    setIsJustClicked(true);
    onSelect();

    setTimeout(() => {
      setIsJustClicked(false);
    }, 400);
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center">
            {player.ovr}
          </span>
          <div>
            <div className="font-bold text-slate-900 line-clamp-1">{player.name}</div>
            <div className="text-[11px] text-slate-500">{player.teamEra} • {player.role}</div>
          </div>
        </div>
      </div>
    );
  }

  const isClickable = !disabled && !isUnavailable && !isDraftedByMe && !!onSelect;

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
      className={`relative rounded-xl p-4 transition-all duration-150 border flex flex-col justify-between select-none ${
        isUnavailable
          ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
          : isDraftedByMe
          ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-400 shadow-2xs'
          : disabled
          ? 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-80'
          : isJustClicked
          ? 'bg-emerald-100 border-emerald-500 ring-4 ring-emerald-300 scale-[0.98] shadow-md'
          : 'bg-white border-slate-200 hover:border-slate-900 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] active:bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900'
      }`}
    >
      <div>
        {/* Header: Player Name + Single Score (OVR) Badge next to name */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 line-clamp-1">
                {player.name}
              </h3>
              {/* Single score next to player based on how good they are */}
              <span className={`px-2 py-0.5 rounded-md text-white font-black text-xs shrink-0 shadow-2xs transition-colors ${
                isJustClicked ? 'bg-emerald-700' : 'bg-slate-900'
              }`}>
                {player.ovr}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                {player.role}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">
                {player.teamEra} ({player.year})
              </span>
            </div>
          </div>

          {isUnavailable ? (
            <span className="flex items-center gap-1 text-[10px] bg-rose-50 text-rose-700 px-2 py-1 rounded border border-rose-200 font-bold shrink-0">
              <ShieldAlert className="w-3 h-3 text-rose-600" />
              {unavailableReason || 'Unavailable'}
            </span>
          ) : isDraftedByMe ? (
            <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-1 rounded border border-emerald-300 font-bold shrink-0">
              <UserCheck className="w-3 h-3 text-emerald-700" />
              Drafted
            </span>
          ) : null}
        </div>

        {/* Clean, simple format stats list */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs my-2.5">
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] text-slate-500 font-medium">Bat Avg</span>
            <span className="font-bold text-slate-900">{player.battingAvg || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] text-slate-500 font-medium">Strike Rate</span>
            <span className="font-extrabold text-emerald-700">{player.strikeRate || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] text-slate-500 font-medium">Bowl Avg</span>
            <span className="font-bold text-slate-900">{player.bowlingAvg ? player.bowlingAvg : 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] text-slate-500 font-medium">Economy</span>
            <span className="font-bold text-slate-900">{player.economy ? player.economy : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Select Action Footer */}
      {!isUnavailable && !isDraftedByMe && onSelect && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={disabled}
            onClick={handleClick}
            className={`w-full py-2.5 px-3 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
              disabled
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : isJustClicked
                ? 'bg-emerald-600 text-white scale-[0.98]'
                : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-95'
            }`}
          >
            {isJustClicked ? (
              <>
                <Check className="w-4 h-4 animate-bounce" />
                <span>SELECTED!</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>SELECT PLAYER</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Unavailable overlay banner */}
      {isUnavailable && unavailableReason && (
        <div className="mt-2 text-[10px] text-rose-700 font-semibold bg-rose-50 p-1.5 rounded text-center border border-rose-200">
          {unavailableReason}
        </div>
      )}
    </div>
  );
};



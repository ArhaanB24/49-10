import React from 'react';
import { HelpCircle, Shield, Users, Trophy, Zap, X } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-xl relative text-slate-900 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">How to Play Cricket Fantasy XI</h3>
            <p className="text-xs text-slate-500">Rules & Instructions for Surprise Drafting & Match Simulation</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-700" /> 1. Team Composition
            </h4>
            <p>
              Each player sets up their 11-player squad breakdown choosing how many Batsmen, All-rounders, and Bowlers they want. <strong>1 Wicketkeeper is compulsory!</strong>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-slate-700" /> 2. Surprise Squad Pool & Real-Time Availability
            </h4>
            <p>
              Iconic squads are revealed one surprise team at a time! When a player is drafted by one team (e.g. Virat Kohli from RCB 2016), he is locked across ALL squads in the current session to ensure zero duplicates.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-slate-700" /> 3. Single Score OVR Rating
            </h4>
            <p>
              Every player displays a single peak <strong>OVR (Overall Rating)</strong> score next to their name based on real authentic stats. Draft high-OVR players that match your team's needed role slots.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-slate-700" /> 4. Match Simulation & Commentary
            </h4>
            <p>
              Watch ball-by-ball simulated matches in T20 or ODI format. The match engine factors player OVR stats, pitch conditions, powerplay phase, and required run rates to generate realistic match outcomes.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-2xs transition-all"
        >
          Got It, Let's Play!
        </button>
      </div>
    </div>
  );
};

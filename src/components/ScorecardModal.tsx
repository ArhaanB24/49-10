import React, { useState, useEffect } from 'react';
import { MatchSimulationResult, UserTeam, PlayerBattingStats, PlayerBowlingStats } from '../types';
import { formatOvers } from '../services/matchEngine';
import { Trophy, Award, Sparkles, RefreshCw, Layers } from 'lucide-react';

interface ScorecardModalProps {
  result: MatchSimulationResult;
  p1Team: UserTeam;
  p2Team: UserTeam;
  onRestartNewMatch: () => void;
}

export const ScorecardModal: React.FC<ScorecardModalProps> = ({
  result,
  p1Team,
  p2Team,
  onRestartNewMatch,
}) => {
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'INN1' | 'INN2' | 'AI_ANALYSIS'>('SUMMARY');
  const [aiAnalysisText, setAiAnalysisText] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);

  const winningTeamName = result.winner === 'p1' ? p1Team.name : result.winner === 'p2' ? p2Team.name : 'Tie';

  useEffect(() => {
    const fetchAnalysis = async () => {
      setIsLoadingAi(true);
      try {
        const res = await fetch('/api/gemini/analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            p1Name: p1Team.name,
            p2Name: p2Team.name,
            winnerName: winningTeamName,
            winningMargin: result.winningMargin,
            manOfTheMatch: result.manOfTheMatch.player.name,
            motmReason: result.manOfTheMatch.reason,
            format: result.format,
            pitch: result.pitch,
          }),
        });
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json();
          setAiAnalysisText(data.analysis || 'A thrilling tactical contest between fantasy elevens!');
        } else {
          setAiAnalysisText('A high-octane match where strategic drafting and clutch performances decided the outcome!');
        }
      } catch {
        setAiAnalysisText('A high-octane match where strategic drafting and clutch performances decided the outcome!');
      } finally {
        setIsLoadingAi(false);
      }
    };

    fetchAnalysis();
  }, [result, p1Team.name, p2Team.name, winningTeamName]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-slate-900 space-y-8">
      {/* Winner Banner */}
      <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
          <Trophy className="w-8 h-8 stroke-[2.5]" />
        </div>

        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Match Completed</div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900">
            {winningTeamName} VICTORY!
          </h2>
          <p className="text-sm text-slate-600 font-semibold">{result.winningMargin}</p>
        </div>

        {/* Player of the Match */}
        <div className="inline-flex items-center gap-3 p-3 px-5 rounded-xl bg-slate-50 border border-slate-200 text-left">
          <Award className="w-7 h-7 text-slate-800 shrink-0" />
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500">Player of the Match</div>
            <div className="text-sm font-black text-slate-900">{result.manOfTheMatch.player.name}</div>
            <div className="text-xs text-slate-600 font-medium">{result.manOfTheMatch.reason}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 max-w-md mx-auto text-xs font-bold">
        {[
          { id: 'SUMMARY', label: 'Match Summary' },
          { id: 'INN1', label: '1st Innings' },
          { id: 'INN2', label: '2nd Innings' },
          { id: 'AI_ANALYSIS', label: 'AI Match Report' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'SUMMARY' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200">
            <Layers className="w-5 h-5 text-slate-700" />
            <span>Match Key Highlights</span>
          </h3>

          <ul className="space-y-3">
            {result.keyHighlights.map((hl, i) => (
              <li key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span>{hl}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Innings 1 Scorecard */}
      {activeTab === 'INN1' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Innings 1 Scorecard</h3>
            <div className="text-sm font-bold text-slate-900">
              Total: {result.firstInnings.totalRuns}/{result.firstInnings.totalWickets} ({formatOvers(result.firstInnings.totalOvers, result.firstInnings.totalBallsInOver)} Overs)
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase">
                <tr>
                  <th className="p-3 rounded-l-lg">Batter</th>
                  <th className="p-3">Dismissal</th>
                  <th className="p-3">Runs</th>
                  <th className="p-3">Balls</th>
                  <th className="p-3">4s</th>
                  <th className="p-3">6s</th>
                  <th className="p-3 rounded-r-lg">S/R</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from(result.firstInnings.battingStats.values()).map((b: PlayerBattingStats) => (
                  <tr key={b.player.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{b.player.name}</td>
                    <td className="p-3 text-slate-500">{b.isOut ? b.dismissalInfo : 'Not Out'}</td>
                    <td className="p-3 font-black text-slate-900">{b.runs}</td>
                    <td className="p-3 text-slate-700">{b.balls}</td>
                    <td className="p-3 text-slate-700">{b.fours}</td>
                    <td className="p-3 text-slate-700">{b.sixes}</td>
                    <td className="p-3 text-slate-900 font-semibold">{b.strikeRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Innings 1 Bowling Figures */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-black uppercase text-slate-500 mb-3">Bowling Figures</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase">
                  <tr>
                    <th className="p-3 rounded-l-lg">Bowler</th>
                    <th className="p-3">Overs</th>
                    <th className="p-3">Maidens</th>
                    <th className="p-3">Runs</th>
                    <th className="p-3">Wickets</th>
                    <th className="p-3 rounded-r-lg">Economy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Array.from(result.firstInnings.bowlingStats.values()).map((bw: PlayerBowlingStats) => (
                    <tr key={bw.player.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{bw.player.name}</td>
                      <td className="p-3 font-semibold text-slate-900">{formatOvers(bw.overs, bw.balls)}</td>
                      <td className="p-3 text-slate-700">{bw.maidens}</td>
                      <td className="p-3 text-slate-700">{bw.runsConceded}</td>
                      <td className="p-3 font-black text-emerald-700">{bw.wickets}</td>
                      <td className="p-3 text-slate-900 font-semibold">{bw.economy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Innings 2 Scorecard */}
      {activeTab === 'INN2' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Innings 2 Scorecard</h3>
            <div className="text-sm font-bold text-slate-900">
              Total: {result.secondInnings.totalRuns}/{result.secondInnings.totalWickets} ({formatOvers(result.secondInnings.totalOvers, result.secondInnings.totalBallsInOver)} Overs)
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase">
                <tr>
                  <th className="p-3 rounded-l-lg">Batter</th>
                  <th className="p-3">Dismissal</th>
                  <th className="p-3">Runs</th>
                  <th className="p-3">Balls</th>
                  <th className="p-3">4s</th>
                  <th className="p-3">6s</th>
                  <th className="p-3 rounded-r-lg">S/R</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from(result.secondInnings.battingStats.values()).map((b: PlayerBattingStats) => (
                  <tr key={b.player.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{b.player.name}</td>
                    <td className="p-3 text-slate-500">{b.isOut ? b.dismissalInfo : 'Not Out'}</td>
                    <td className="p-3 font-black text-slate-900">{b.runs}</td>
                    <td className="p-3 text-slate-700">{b.balls}</td>
                    <td className="p-3 text-slate-700">{b.fours}</td>
                    <td className="p-3 text-slate-700">{b.sixes}</td>
                    <td className="p-3 text-slate-900 font-semibold">{b.strikeRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Innings 2 Bowling Figures */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-black uppercase text-slate-500 mb-3">Bowling Figures</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase">
                  <tr>
                    <th className="p-3 rounded-l-lg">Bowler</th>
                    <th className="p-3">Overs</th>
                    <th className="p-3">Maidens</th>
                    <th className="p-3">Runs</th>
                    <th className="p-3">Wickets</th>
                    <th className="p-3 rounded-r-lg">Economy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Array.from(result.secondInnings.bowlingStats.values()).map((bw: PlayerBowlingStats) => (
                    <tr key={bw.player.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{bw.player.name}</td>
                      <td className="p-3 font-semibold text-slate-900">{formatOvers(bw.overs, bw.balls)}</td>
                      <td className="p-3 text-slate-700">{bw.maidens}</td>
                      <td className="p-3 text-slate-700">{bw.runsConceded}</td>
                      <td className="p-3 font-black text-emerald-700">{bw.wickets}</td>
                      <td className="p-3 text-slate-900 font-semibold">{bw.economy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis Tab */}
      {activeTab === 'AI_ANALYSIS' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span>Gemini AI Post-Match Tactical Report</span>
          </h3>

          {isLoadingAi ? (
            <div className="text-xs text-slate-500 animate-pulse p-4">
              Analyzing turning points, bowling economy, and match dynamics...
            </div>
          ) : (
            <p className="text-sm text-slate-800 leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-200">
              {aiAnalysisText}
            </p>
          )}
        </div>
      )}

      {/* Restart Footer */}
      <div className="text-center pt-4">
        <button
          onClick={onRestartNewMatch}
          className="py-3.5 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-2xs transition-all inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Play Another Match</span>
        </button>
      </div>
    </div>
  );
};

import { Player, PlayerRole, TeamComposition } from '../types';

export function chooseAiDraftPick(
  availableSquadPlayers: Player[],
  aiCurrentSquad: Player[],
  aiComposition: TeamComposition,
  globalDraftedCanonicalIds: Set<string>
): Player | null {
  // 1. Filter out players already drafted globally across the session
  const validPlayers = availableSquadPlayers.filter(
    (p) => !globalDraftedCanonicalIds.has(p.canonicalId)
  );

  if (validPlayers.length === 0) return null;

  // 2. Count current roles in AI squad
  const currentCounts: Record<PlayerRole, number> = {
    Batsman: 0,
    'All-rounder': 0,
    Wicketkeeper: 0,
    Bowler: 0,
  };

  aiCurrentSquad.forEach((p) => {
    currentCounts[p.role] = (currentCounts[p.role] || 0) + 1;
  });

  // 3. Determine remaining required counts
  const needed: Record<PlayerRole, number> = {
    Batsman: Math.max(0, aiComposition.batsmen - currentCounts['Batsman']),
    'All-rounder': Math.max(0, aiComposition.allRounders - currentCounts['All-rounder']),
    Wicketkeeper: Math.max(0, aiComposition.wicketKeepers - currentCounts['Wicketkeeper']),
    Bowler: Math.max(0, aiComposition.bowlers - currentCounts['Bowler']),
  };

  // 4. Try to pick highest OVR player for roles still needed
  const neededRoles = (Object.keys(needed) as PlayerRole[]).filter((r) => needed[r] > 0);

  if (neededRoles.length > 0) {
    const roleMatches = validPlayers.filter((p) => neededRoles.includes(p.role));
    if (roleMatches.length > 0) {
      roleMatches.sort((a, b) => b.ovr - a.ovr);
      return roleMatches[0];
    }
  }

  // 5. Fallback: pick highest OVR overall available player
  const sorted = [...validPlayers].sort((a, b) => b.ovr - a.ovr);
  return sorted[0] || null;
}

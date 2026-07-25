import { Player } from '../types';

// Helper to determine the natural batting tier for any player
export function getBattingTier(player: Player): number {
  const role = player.role;
  const name = (player.name || '').toLowerCase();

  // Tier 1: Specialist Openers & Top Order (#1 - #3)
  const isKnownTopOrder =
    name.includes('kohli') ||
    name.includes('rohit') ||
    name.includes('babar') ||
    name.includes('sharma') ||
    name.includes('head') ||
    name.includes('warner') ||
    name.includes('gill') ||
    name.includes('jaiswal') ||
    name.includes('cock') ||
    name.includes('buttler') ||
    name.includes('rahul') ||
    name.includes('smith') ||
    name.includes('williamson') ||
    name.includes('tendulkar') ||
    name.includes('sehwag') ||
    name.includes('ganguly') ||
    name.includes('ponting') ||
    name.includes('hayden') ||
    name.includes('gayle') ||
    name.includes('samson');

  if (isKnownTopOrder) return 1;

  if (role === 'Batsman') {
    if (player.battingAvg >= 42 || player.ovr >= 88) return 1;
    return 2; // Middle order
  }

  if (role === 'Wicketkeeper') {
    if (player.battingAvg >= 38) return 2;
    return 2;
  }

  if (role === 'All-rounder') {
    if (player.battingAvg >= 32) return 3;
    return 3;
  }

  // Pure Bowler
  return 4; // Tailender (#8 - #11)
}

// Smart Auto-Align Batting Order
export function optimizeBattingOrder(squad: Player[]): Player[] {
  if (!squad || squad.length === 0) return [];

  const copy = [...squad];

  return copy.sort((a, b) => {
    const tierA = getBattingTier(a);
    const tierB = getBattingTier(b);

    if (tierA !== tierB) {
      return tierA - tierB;
    }

    // Within same tier, sort by batting average then OVR
    if (b.battingAvg !== a.battingAvg) {
      return b.battingAvg - a.battingAvg;
    }
    return b.ovr - a.ovr;
  });
}

// Validate manual re-ordering with Guardrails
export function validateMovePlayer(
  order: Player[],
  fromIndex: number,
  toIndex: number
): { allowed: boolean; reason?: string } {
  const player = order[fromIndex];
  if (!player) return { allowed: false, reason: 'Invalid player selection' };

  const targetPosition = toIndex + 1; // 1-indexed (1 to 11)

  // Guardrail 1: Pure Bowler cannot bat in Top 6
  if (player.role === 'Bowler' && targetPosition <= 6) {
    return {
      allowed: false,
      reason: `Guardrail Triggered: Pure Bowlers (${player.name}) cannot bat in the Top 6! Bowlers must remain in lower order (#7–#11).`,
    };
  }

  // Guardrail 2: Top-Order Specialist (e.g. Virat Kohli, Rohit Sharma) cannot bat below #5
  const tier = getBattingTier(player);
  if (tier === 1 && targetPosition > 5) {
    return {
      allowed: false,
      reason: `Guardrail Triggered: Top-Order Specialist (${player.name}) cannot bat below position #5!`,
    };
  }

  // Guardrail 3: Top-Order Specialist cannot be placed behind a pure bowler
  if (tier <= 2) {
    for (let i = 0; i < toIndex; i++) {
      if (i === fromIndex) continue;
      const precedingPlayer = order[i];
      if (precedingPlayer && precedingPlayer.role === 'Bowler') {
        return {
          allowed: false,
          reason: `Guardrail Triggered: ${player.name} cannot bat below bowler ${precedingPlayer.name}!`,
        };
      }
    }
  }

  return { allowed: true };
}

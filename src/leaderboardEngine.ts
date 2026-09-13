import type { LeaderboardCategory, LeaderboardPeriod, LeaderboardEntry, LeaderboardPrizes, PrizeTier } from './types';

export const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  monthly: 'Monthly',
};

export const PERIOD_RESET_MS: Record<LeaderboardPeriod, number> = {
  monthly: 30 * 24 * 60 * 60 * 1000,
};

export const PERIOD_ICONS: Record<LeaderboardPeriod, string> = {
  monthly: '🗓️',
};

export const CLAIM_WINDOW_MS = 24 * 60 * 60 * 1000;

export const CATEGORY_LABELS: Record<LeaderboardCategory, string> = {
  xp: 'XP',
  pp: 'Puke Points',
  spins: 'Total Spins',
  referrals: 'Total Referrals',
};

export type RewardType = 'xp' | 'pp';

export const CATEGORY_REWARD: Record<LeaderboardCategory, RewardType> = {
  xp: 'xp',
  pp: 'pp',
  spins: 'xp',
  referrals: 'pp',
};

const PRIZE_TABLE_MONTHLY: number[] = [
  3500, 2800, 2100, 1600, 1200, 900, 600, 400,
];

const RANK_TIERS: { minRank: number; maxRank: number }[] = [
  { minRank: 1, maxRank: 1 },
  { minRank: 2, maxRank: 2 },
  { minRank: 3, maxRank: 3 },
  { minRank: 4, maxRank: 10 },
  { minRank: 11, maxRank: 20 },
  { minRank: 21, maxRank: 50 },
  { minRank: 51, maxRank: 75 },
  { minRank: 76, maxRank: 100 },
];

export function getPrizeTable(period: LeaderboardPeriod, category: LeaderboardCategory): PrizeTier[] {
  const amounts = PRIZE_TABLE_MONTHLY;
  const reward = CATEGORY_REWARD[category];
  return RANK_TIERS.map((tier, i) => ({
    minRank: tier.minRank,
    maxRank: tier.maxRank,
    xp: reward === 'xp' ? amounts[i] : 0,
    pp: reward === 'pp' ? amounts[i] : 0,
  }));
}

export function getPrizeForRank(period: LeaderboardPeriod, category: LeaderboardCategory, rank: number): { xp: number; pp: number } | null {
  const table = getPrizeTable(period, category);
  const tier = table.find((t) => rank >= t.minRank && rank <= t.maxRank);
  if (!tier) return null;
  return { xp: tier.xp, pp: tier.pp };
}

export function getPrizesForPeriod(period: LeaderboardPeriod, category: LeaderboardCategory): LeaderboardPrizes {
  const table = getPrizeTable(period, category);
  const xp: { minRank: number; maxRank: number; amount: number }[] = [];
  const pp: { minRank: number; maxRank: number; amount: number }[] = [];
  for (const t of table) {
    xp.push({ minRank: t.minRank, maxRank: t.maxRank, amount: t.xp });
    pp.push({ minRank: t.minRank, maxRank: t.maxRank, amount: t.pp });
  }
  return { xp, pp };
}

const BOT_NAMES: string[] = [
  'ToiletTina', 'BarfBrett', 'GermGreg', 'SlimeSue', 'VomitVic', 'PukePam',
  'SickSid', 'NauseaNed', 'GunkGus', 'MoldMia', 'RotRex', 'FungusFinn',
  'BileBob', 'ScumSam', 'GrimeGus', 'CystCy', 'PlaquePax', 'SewerSol',
  'TrashTara', 'JunkJax', 'WasteWyn', 'DirtDee', 'MuckMorgan', 'GooGray',
  'SporeSparrow', 'ClogCory', 'RustRae', 'SmogSage', 'AshAri', 'SootSky',
  'CrankCody', 'FilthFin', 'GunkGale', 'HazeHalo', 'IckIra', 'JoltJude',
  'KrudKai', 'LurchLex', 'MireMilo', 'NastyNoa', 'OozeOri', 'PestPiper',
  'QuagQuinn', 'RankRemy', 'ScrapSage', 'TarnTove', 'UghUma', 'VileVic',
  'WeedWren', 'XenonXan', 'YuckYael', 'ZestZara', 'BloatBlair', 'ChumCade',
  'DampDex', 'ErosElio', 'FretFern', 'GrossGio', 'HazeHaven', 'IckIris',
  'JellJoss', 'KnotKris', 'LankLox', 'MuckMira', 'NumbNico', 'OozeOdie',
  'PithPru', 'QuadQuill', 'RankRho', 'SlubSage', 'TaintTao', 'UmbraUma',
  'VogVex', 'WhirlWren', 'XylXan', 'YarnYael', 'ZombZara',
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function getPeriodStart(period: LeaderboardPeriod, now: Date = new Date()): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
}

function getPeriodEnd(period: LeaderboardPeriod, now: Date = new Date()): number {
  const nextMonth = now.getUTCMonth() === 11
    ? new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1))
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return nextMonth.getTime();
}

export function getPeriodBoundaries(period: LeaderboardPeriod, now: Date = new Date()): { start: number; end: number } {
  return { start: getPeriodStart(period, now), end: getPeriodEnd(period, now) };
}

export function getTimeUntilReset(period: LeaderboardPeriod, now: Date = new Date()): number {
  return Math.max(0, getPeriodEnd(period, now) - now.getTime());
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Resets now';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

export function getResetTimestamp(period: LeaderboardPeriod): number {
  return getPeriodEnd(period);
}

export function getClaimWindowState(period: LeaderboardPeriod, now: Date = new Date()): {
  periodEnded: boolean;
  claimWindowOpen: boolean;
  claimWindowClosed: boolean;
  periodEnd: number;
  claimWindowEnd: number;
} {
  const periodEnd = getPeriodEnd(period, now);
  const claimWindowEnd = periodEnd + CLAIM_WINDOW_MS;
  const t = now.getTime();
  return {
    periodEnded: t >= periodEnd,
    claimWindowOpen: t >= periodEnd && t < claimWindowEnd,
    claimWindowClosed: t >= claimWindowEnd,
    periodEnd,
    claimWindowEnd,
  };
}

export function formatUTCDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function formatUTCTime(ms: number): string {
  const d = new Date(ms);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMonth()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function generateBotScore(rng: () => number, baseScore: number): number {
  const variance = 0.3;
  const factor = 1 - rng() * variance;
  return Math.max(1, Math.round(baseScore * factor));
}

const CATEGORY_BASE_SCORE: Record<LeaderboardCategory, number> = {
  xp: 1000,
  pp: 1000,
  spins: 500,
  referrals: 10,
};

export function generateLeaderboard(
  category: LeaderboardCategory,
  period: LeaderboardPeriod,
  playerScore: number,
  playerName: string,
): LeaderboardEntry[] {
  const { start } = getPeriodBoundaries(period);
  const rng = seededRandom(start + category.charCodeAt(0) * 1000);

  const baseScore = CATEGORY_BASE_SCORE[category];
  const botCount = 99;

  const bots: LeaderboardEntry[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < botCount; i++) {
    const baseName = BOT_NAMES[Math.floor(rng() * BOT_NAMES.length)];
    let name = baseName;
    let suffix = 2;
    while (usedNames.has(name)) {
      name = `${baseName}${suffix}`;
      suffix++;
    }
    usedNames.add(name);

    const score = generateBotScore(rng, baseScore);
    bots.push({
      id: `bot_${i}`,
      name,
      score,
      rank: 0,
      isPlayer: false,
    });
  }

  bots.push({
    id: 'player',
    name: playerName,
    score: playerScore,
    rank: 0,
    isPlayer: true,
  });

  bots.sort((a, b) => b.score - a.score);
  bots.forEach((e, i) => { e.rank = i + 1; });

  return bots.slice(0, 100);
}

export function getPlayerRank(entries: LeaderboardEntry[]): number {
  const player = entries.find((e) => e.isPlayer);
  return player?.rank ?? 0;
}

export function hasPlayerPrize(entries: LeaderboardEntry[], period: LeaderboardPeriod, category: LeaderboardCategory): boolean {
  const rank = getPlayerRank(entries);
  if (rank === 0) return false;
  return getPrizeForRank(period, category, rank) !== null;
}

export function getPlayerPrize(entries: LeaderboardEntry[], period: LeaderboardPeriod, category: LeaderboardCategory): { xp: number; pp: number } | null {
  const rank = getPlayerRank(entries);
  if (rank === 0) return null;
  return getPrizeForRank(period, category, rank);
}

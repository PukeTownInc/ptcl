export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';

export type Screen = 'home' | 'slots' | 'missions' | 'leaderboards' | 'withdraw' | 'settings' | 'profile';

export type LeaderboardCategory = 'xp' | 'pp' | 'spins' | 'referrals';
export type LeaderboardPeriod = 'monthly';

export interface PrizeTier {
  minRank: number;
  maxRank: number;
  xp: number;
  pp: number;
}

export interface LeaderboardPrizes {
  xp: { minRank: number; maxRank: number; amount: number }[];
  pp: { minRank: number; maxRank: number; amount: number }[];
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  rank: number;
  isPlayer: boolean;
}

export interface LeaderboardClaimState {
  claimed: boolean;
}

export type SymbolId =
  | 'puke' | 'slime' | 'sneeze' | 'tp' | 'pill' | 'germ'
  | 'beaker' | 'vomit' | 'toxic' | 'barrel' | 'warn' | 'rich'
  | 'wild' | 'scatter' | 'bonus' | 'hazard' | 'jackpot';

export interface SlotSymbol {
  id: SymbolId;
  emoji: string;
  label: string;
  /** [3-match, 4-match, 5-match] Puke Points payouts */
  pays: [number, number, number];
  weight: number;
  special?: 'wild' | 'scatter' | 'bonus' | 'hazard' | 'jackpot';
  isSpecial?: boolean;
}

export interface MissionState {
  spins: number;
  adsWatched: number;
  wheelSpins: number;
  allClaimed: boolean;
}

export interface GameState {
  xp: number;
  lockedPotPP: number;
  withdrawablePP: number;
  totalEarnedPP: number;
  spinsRemaining: number;
  freeSpinsClaimed: boolean;
  dailyBoostClaimed: boolean;
  dailyAdVideosWatched: number;
  dailyUnlocksUsed: number;
  dailyXpFree: number;
  dailyXpBonus: number;
  dailyDoubleUps: number;
  dailyExtraLucky: number;
  dailyHotStreak: number;
  dailyMysteryPacks: number;
  dailyPotAccel: number;
  dailyXpBoosts: number;
  xpBoostUntil: number | null;
  hotStreakUntil: number | null;
  potAccelUntil: number | null;
  doubleUpPending: number | null;
  extraLuckyPending: boolean;
  missions: MissionState;
  dailyMissionClaims: string[];
  allMissionsBonusClaimed: boolean;
  allMissionsAdBonusClaimed: boolean;
  ppEarnedToday: number;
  streakDay: number;
  streakClaimedToday: boolean;
  streakAdWatchedToday: boolean;
  lastStreakClaimDate: string | null;
  bestStreak: number;
  streakPPBoostUntil: number | null;
  referrals: number;
  loginStreak: number;
  lastLogin: string | null;
  lastWithdraw: number | null;
  faucetpayEmail: string;
  withdrawalHistory: WithdrawalRecord[];
  lastReset: string;
  spinsToday: number;
  totalSpins: number;
  jackpotWins: number;
  leaderboardClaims: Record<string, boolean>;
  leaderboardPeriodStarts: Record<string, number>;
  flagsClaimedOn: string;
  monthlyResetDate: string;
}

export interface WithdrawalRecord {
  id: string;
  date: number;
  username: string;
  crypto: string;
  amountPP: number;
  feePP: number;
  usd: number;
  status: 'pending' | 'sent' | 'failed' | 'refunded';
}

export interface SpinResult {
  grid: SymbolId[][];
  wins: WinLine[];
  totalPP: number;
  xpGained: number;
  jackpot: { type: 'mini' | 'minor' | 'major' | 'grand'; amount: number } | null;
  freeSpinsAwarded: number;
  bonusAwarded: number | null;
  scatterCount: number;
  potFull: boolean;
}

export interface WinLine {
  symbols: SymbolId[];
  pp: number;
  count: number;
  positions: [number, number][];
}

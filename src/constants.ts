import type { SlotSymbol, SymbolId, Tier } from './types';

export const COLORS = {
  toxic: '#39FF14',
  radioactive: '#FFFF00',
  black: '#000000',
};

export const PP_TO_USD = 0.000025;
export const PLATFORM_FEE = 0.10;
export const MIN_UNLOCK_PP = 5000;
export const MIN_WITHDRAW_PP = 50000;
export const MAX_WITHDRAW_PP = 500000;
export const WITHDRAW_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const DAILY_XP_FREE_CAP = 150;
export const DAILY_XP_BONUS_CAP = 100;
export const DAILY_XP_MAX = 250;

export interface TierInfo {
  id: Tier;
  label: string;
  badge: string;
  minXp: number;
  maxXp: number;
  potCap: number;
  dailyUnlocks: number;
  multiplier: number;
  dailySpinsBase: number;
  dailyMissions: number;
}

export const TIERS: TierInfo[] = [
  { id: 'bronze',   label: 'Bronze',   badge: '🥉', minXp: 0,      maxXp: 500,    potCap: 15000,  dailyUnlocks: 1, multiplier: 1.0,  dailySpinsBase: 25, dailyMissions: 3 },
  { id: 'silver',   label: 'Silver',   badge: '🥈', minXp: 500,    maxXp: 2500,   potCap: 30000,  dailyUnlocks: 2, multiplier: 1.05, dailySpinsBase: 40, dailyMissions: 5 },
  { id: 'gold',     label: 'Gold',     badge: '🥇', minXp: 2500,   maxXp: 10000,  potCap: 60000,  dailyUnlocks: 3, multiplier: 1.1,  dailySpinsBase: 55, dailyMissions: 8 },
  { id: 'platinum', label: 'Platinum', badge: '💎', minXp: 10000,  maxXp: Infinity, potCap: 150000, dailyUnlocks: 5, multiplier: 1.2,  dailySpinsBase: 85, dailyMissions: 12 },
];

export function getTier(xp: number): TierInfo {
  return [...TIERS].reverse().find((t) => xp >= t.minXp) ?? TIERS[0];
}

export function getNextTier(xp: number): TierInfo | null {
  return TIERS.find((t) => t.minXp > xp) ?? null;
}

// ==================================================
// 🎰 ALL OLD SYMBOLS REMOVED → REPLACED WITH YOURS
// ==================================================
export const SYMBOLS: Record<SymbolId, SlotSymbol> = {
  // 🏆 HIGHEST VALUE
  cashlab:    { id: 'cashlab',    image: '/symbols/symbol-cash-lab.png',     label: 'Cash Lab',      pays: [50, 200, 1000], weight: 5 },
  puketown:   { id: 'puketown',   image: '/symbols/symbol-puke-town.png',    label: 'Puke Town',     pays: [50, 200, 1000], weight: 5 },

  // 🟠 HIGH VALUE
  gasMask:          { id: 'gasMask',          image: '/symbols/symbol-gas-mask.png',         label: 'Gas Mask',           pays: [30, 120, 500],  weight: 8 },
  geigerCounter:    { id: 'geigerCounter',    image: '/symbols/symbol-geiger-counter.png',   label: 'Geiger Counter',     pays: [30, 120, 500],  weight: 8 },
  radiationSign:    { id: 'radiationSign',    image: '/symbols/symbol-radiation-sign.png',   label: 'Radiation Sign',     pays: [30, 120, 500],  weight: 8 },
  radioactiveSkull: { id: 'radioactiveSkull', image: '/symbols/symbol-radioactive-skull.png',label: 'Toxic Skull',        pays: [30, 120, 500],  weight: 8 },

  // 🟡 MID VALUE
  mutantBeetle:  { id: 'mutantBeetle',  image: '/symbols/symbol-mutant-beetle.png',  label: 'Mutant Beetle',   pays: [15, 60, 250], weight: 12 },
  mutantRat:     { id: 'mutantRat',     image: '/symbols/symbol-mutant-rat.png',     label: 'Mutant Rat',      pays: [15, 60, 250], weight: 12 },
  testTube:      { id: 'testTube',      image: '/symbols/symbol-test-tube.png',      label: 'Test Tube',       pays: [15, 60, 250], weight: 12 },
  toxicCauldron: { id: 'toxicCauldron', image: '/symbols/symbol-toxic-cauldron.png', label: 'Toxic Cauldron',  pays: [15, 60, 250], weight: 12 },
  wasteDrum:     { id: 'wasteDrum',     image: '/symbols/symbol-waste-drum.png',     label: 'Waste Drum',      pays: [15, 60, 250], weight: 12 },
  wastePit:      { id: 'wastePit',      image: '/symbols/symbol-waste-pit.png',      label: 'Waste Pit',       pays: [15, 60, 250], weight: 12 },

  // 🟢 LOW VALUE
  slimeBlob:  { id: 'slimeBlob',  image: '/symbols/symbol-slime-blob.png',  label: 'Slime Blob',   pays: [5, 20, 100], weight: 15 },
  slimeGuy:   { id: 'slimeGuy',   image: '/symbols/symbol-slime-guy.png',   label: 'Slime Guy',    pays: [5, 20, 100], weight: 15 },
  virus:      { id: 'virus',      image: '/symbols/symbol-virus.png',       label: 'Virus',        pays: [5, 20, 100], weight: 15 },
  toxicCloud: { id: 'toxicCloud', image: '/symbols/toxic-cloud.png',         label: 'Toxic Cloud',  pays: [5, 20, 100], weight: 15 },
};

export const JACKPOT_TYPES = [
  { type: 'mini'  as const, amount: 30,  label: 'Mini' },
  { type: 'minor' as const, amount: 60,  label: 'Minor' },
  { type: 'major' as const, amount: 120, label: 'Major' },
  { type: 'grand' as const, amount: 300, label: 'Grand' },
];

export const JACKPOT_WEIGHTS = [50, 30, 15, 5];
export const REEL_COUNT = 5;
export const ROW_COUNT = 3;
export const FREE_SPINS_BASE = 5;
export const FREE_SPINS_DAILY_BONUS = 10;

export const MISSIONS = [
  { id: 'spins',      label: 'Spin 20 Times',               target: 20,  baseXp: 50,  adXp: 75,  icon: '🎰', adSpins: 5 },
  { id: 'ads',        label: 'Watch 5 Ads',                  target: 5,   baseXp: 50,  adXp: 75,  icon: '📺', adSpins: 5 },
  { id: 'wheel',      label: 'Spin the Radioactive Risk Wheel 3 Times', target: 3, baseXp: 50, adXp: 75, icon: '🎬', adSpins: 5 },
  { id: 'claistreak', label: 'Claim Daily Streak',            target: 1,  baseXp: 50,  adXp: 75,  icon: '📅', adSpins: 5 },
  { id: 'earnpp',     label: 'Earn 100 Puke Points',         target: 100, baseXp: 50, adXp: 75,  icon: '🎯', adSpins: 5 },
];

export const ALL_MISSIONS_BONUS = { baseXp: 100, adXp: 150, baseSpins: 0, adSpins: 10 };

export interface StreakDayReward {
  day: number;
  spins: number;
  xp: number;
  ppBoost?: boolean;
  label: string;
}

export const STREAK_REWARDS: StreakDayReward[] = [
  { day: 1, spins: 2,  xp: 10, label: 'Day 1' },
  { day: 2, spins: 3,  xp: 15, label: 'Day 2' },
  { day: 3, spins: 4,  xp: 20, label: 'Day 3' },
  { day: 4, spins: 5,  xp: 30, label: 'Day 4' },
  { day: 5, spins: 7,  xp: 35, label: 'Day 5' },
  { day: 6, spins: 8,  xp: 40, label: 'Day 6' },
  { day: 7, spins: 15, xp: 75, ppBoost: true, label: 'Day 7 — MAX!' },
];

export const MAX_STREAK_DAY = 7;
export const ppToUsd = (pp: number) => pp * PP_TO_USD;
export function formatPP(pp: number): string {
  return pp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const CRYPTO_OPTIONS = [
  { id: 'BTC',  label: 'Bitcoin (BTC)',    network: 'bitcoin' },
  { id: 'LTC',  label: 'Litecoin (LTC)',   network: 'litecoin' },
  { id: 'DOGE', label: 'Dogecoin (DOGE)',  network: 'dogecoin' },
  { id: 'TRX',  label: 'Tron (TRX)',       network: 'tron' },
  { id: 'SOL',  label: 'Solana (SOL)',     network: 'solana' },
];

import type { SlotSymbol, SymbolId, Tier, CacheBoxTier, CacheBoxReward } from './types';

export const SYMBOL_IMAGE_PATH = '/symbols/';
export const CACHE_ASSET_PATH = '/contagion-cache/';

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

// ==============================================
// ✅ INFINITE LEVEL SYSTEM — 1,000 XP per level, NO CAP
// ==============================================
const XP_PER_LEVEL = 1000;
export function getLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}
export function getLevelProgress(xp: number): number {
  return xp % XP_PER_LEVEL;
}
export function getNextLevelXp(_xp: number): number {
  return XP_PER_LEVEL;
}
export function getLevelPercent(xp: number): number {
  return Math.min(100, (getLevelProgress(xp) / XP_PER_LEVEL) * 100);
}

// ==============================================
// TIERS — separate from levels, for rewards/unlocks
// ==============================================
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

// ==============================================
// SYMBOLS — PNG paths, all preserved
// ==============================================
export const SYMBOLS: Record<SymbolId, SlotSymbol & { image?: string }> = {
  cashlab:  { id: 'cashlab',  emoji: '🤑', label: 'Cash Lab',        pays: [12, 35, 130], weight: 2.5, image: `${SYMBOL_IMAGE_PATH}symbol-cash-lab.png?v=11` },
  puke:     { id: 'puke',     emoji: '🤢', label: 'Puke Town',       pays: [2, 3, 9],     weight: 26,  image: `${SYMBOL_IMAGE_PATH}symbol-puke-town.png?v=11` },
  slime:    { id: 'slime',    emoji: '🟡', label: 'Slime Blob',      pays: [2, 4, 11],    weight: 24,  image: `${SYMBOL_IMAGE_PATH}symbol-slime-blob.png?v=11` },
  sneeze:   { id: 'sneeze',   emoji: '😷', label: 'Gas Mask',        pays: [2, 5, 13],    weight: 21,  image: `${SYMBOL_IMAGE_PATH}symbol-gas-mask.png?v=11` },
  tp:       { id: 'tp',       emoji: '🐀', label: 'Mutant Rat',      pays: [3, 6, 16],    weight: 18,  image: `${SYMBOL_IMAGE_PATH}symbol-mutant-rat.png?v=11` },
  pill:     { id: 'pill',     emoji: '💊', label: 'Test Tube',       pays: [3, 7, 19],    weight: 15,  image: `${SYMBOL_IMAGE_PATH}symbol-test-tube.png?v=11` },
  germ:     { id: 'germ',     emoji: '🦠', label: 'Virus',           pays: [3, 8, 23],    weight: 13,  image: `${SYMBOL_IMAGE_PATH}symbol-virus.png?v=11` },
  beaker:   { id: 'beaker',   emoji: '🧪', label: 'Toxic Cauldron',  pays: [4, 10, 30],   weight: 10,  image: `${SYMBOL_IMAGE_PATH}symbol-toxic-cauldron.png?v=11` },
  vomit:    { id: 'vomit',    emoji: '🤮', label: 'Slime Guy',       pays: [5, 12, 37],   weight: 8,   image: `${SYMBOL_IMAGE_PATH}symbol-slime-guy.png?v=11` },
  toxic:    { id: 'toxic',    emoji: '☢️', label: 'Radiation Sign',  pays: [6, 16, 48],   weight: 6,   image: `${SYMBOL_IMAGE_PATH}symbol-radiation-sign.png?v=11` },
  barrel:   { id: 'barrel',   emoji: '🛢️', label: 'Waste Drum',       pays: [7, 20, 64],   weight: 4,   image: `${SYMBOL_IMAGE_PATH}symbol-waste-drum.png?v=11` },
  warn:     { id: 'warn',     emoji: '⚠️', label: 'Radioactive Skull', pays: [12, 35, 130], weight: 2.5, image: `${SYMBOL_IMAGE_PATH}symbol-radioactive-skull.png?v=11` },
  rich:     { id: 'rich',     emoji: '📻', label: 'Geiger Counter',   pays: [18, 55, 220],  weight: 1.5, image: `${SYMBOL_IMAGE_PATH}symbol-geiger-counter.png?v=11` },
  wild:     { id: 'wild',     emoji: '🤮', label: 'Puke Wild',       pays: [0, 0, 0], weight: 3.5, special: 'wild', isSpecial: true, image: `${SYMBOL_IMAGE_PATH}symbol-wild.png?v=11` },
  scatter:  { id: 'scatter',  emoji: '🤒', label: 'Sick Scatter',     pays: [0, 0, 0], weight: 2, special: 'scatter', isSpecial: true, image: `${SYMBOL_IMAGE_PATH}symbol-scatter.png?v=11` },
  bonus:    { id: 'bonus',    emoji: '☢️', label: 'Toxic Bonus',      pays: [0, 0, 0], weight: 1.5, special: 'bonus', isSpecial: true, image: `${SYMBOL_IMAGE_PATH}symbol-bonus.png?v=11` },
  hazard:   { id: 'hazard',   emoji: '☣️', label: 'Hazard Mystery',   pays: [0, 0, 0], weight: 1.2, special: 'hazard', isSpecial: true, image: `${SYMBOL_IMAGE_PATH}symbol-hazard.png?v=11` },
  jackpot:  { id: 'jackpot',  emoji: '🧪', label: 'Toxic Jackpot',    pays: [0, 0, 0], weight: 1, special: 'jackpot', isSpecial: true, image: `${SYMBOL_IMAGE_PATH}symbol-jackpot.png?v=11` },
};

export const JACKPOT_TYPES = [
  { type: 'mini' as const,  amount: 30,  label: 'Mini' },
  { type: 'minor' as const, amount: 60,  label: 'Minor' },
  { type: 'major' as const, amount: 120, label: 'Major' },
  { type: 'grand' as const, amount: 300, label: 'Grand' },
];
export const JACKPOT_WEIGHTS = [50, 30, 15, 5];

export const REEL_COUNT = 5;
export const ROW_COUNT = 3;
export const FREE_SPINS_BASE = 5;
export const FREE_SPINS_DAILY_BONUS = 5;

// ==============================================
// ✅ CONTAGION CACHE — Box Definitions & Rewards
// Tier order: blue > purple > orange > yellow
// ==============================================
export const JACKPOT_FRAGMENTS_TO_UNLOCK = 5;

export const CACHE_BOXES: Record<CacheBoxTier, {
  id: CacheBoxTier;
  label: string;
  costPP: number;
  freeDaily: boolean;
  closeImage: string;
  openImage: string;
  baseRewards: { spins: [number, number]; xp: [number, number]; pp: [number, number] };
}> = {
  blue: {
    id: 'blue',
    label: 'Slime Crate',
    costPP: 0,
    freeDaily: true,
    closeImage: `${CACHE_ASSET_PATH}blue-close.png`,
    openImage: `${CACHE_ASSET_PATH}blue-open.png`,
    baseRewards: { spins: [1, 3], xp: [5, 15], pp: [10, 50] },
  },
  purple: {
    id: 'purple',
    label: 'Radiation Vault',
    costPP: 5000,
    freeDaily: false,
    closeImage: `${CACHE_ASSET_PATH}purple-close.png`,
    openImage: `${CACHE_ASSET_PATH}purple-open.png`,
    baseRewards: { spins: [3, 8], xp: [15, 40], pp: [50, 200] },
  },
  orange: {
    id: 'orange',
    label: 'Toxic Strongbox',
    costPP: 25000,
    freeDaily: false,
    closeImage: `${CACHE_ASSET_PATH}orange-close.png`,
    openImage: `${CACHE_ASSET_PATH}orange-open.png`,
    baseRewards: { spins: [5, 12], xp: [30, 80], pp: [150, 500] },
  },
  yellow: {
    id: 'yellow',
    label: 'Contagion Core',
    costPP: 100000,
    freeDaily: false,
    closeImage: `${CACHE_ASSET_PATH}yellow-close.png`,
    openImage: `${CACHE_ASSET_PATH}yellow-open.png`,
    baseRewards: { spins: [10, 25], xp: [75, 200], pp: [400, 1200] },
  },
};

export function rollCacheReward(tier: CacheBoxTier): CacheBoxReward {
  const box = CACHE_BOXES[tier];
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  
  const rollType = Math.random();
  if (rollType < 0.40) {
    return { spins: rand(box.baseRewards.spins[0], box.baseRewards.spins[1]) };
  }
  if (rollType < 0.75) {
    return { xp: rand(box.baseRewards.xp[0], box.baseRewards.xp[1]) };
  }
  if (rollType < 0.95) {
    return { pp: rand(box.baseRewards.pp[0], box.baseRewards.pp[1]) };
  }
  return { jackpotFragment: true };
}

// ==============================================
// ✅ MISSIONS — Roadmap gift has FULL standard rewards
// ==============================================
export const MISSIONS = [
  { id: 'claistreak',        label: 'Claim Daily Streak',              target: 1,   baseXp: 50, adXp: 75, icon: '📅', adSpins: 5 },
  { id: 'roadmapDailyGift',  label: 'Claim Roadmap Daily Gift',        target: 1,   baseXp: 50, adXp: 75, icon: '🎁', adSpins: 5 },
  { id: 'spins',             label: 'Spin 50 Times',                  target: 50,  baseXp: 50, adXp: 75, icon: '🎰', adSpins: 5 },
  { id: 'earnpp',            label: 'Earn 250 Puke Points',           target: 250, baseXp: 50, adXp: 75, icon: '🎯', adSpins: 5 },
  { id: 'wheel',             label: 'Claim Radioactive Risk 5 Times',  target: 5,   baseXp: 50, adXp: 75, icon: '🎬', adSpins: 5 },
  { id: 'ads',               label: 'Watch 10 Ads',                   target: 10,  baseXp: 50, adXp: 75, icon: '📺', adSpins: 5 },
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
  { id: 'BTC',  label: 'Bitcoin (BTC)',   network: 'bitcoin' },
  { id: 'LTC',  label: 'Litecoin (LTC)',  network: 'litecoin' },
  { id: 'DOGE', label: 'Dogecoin (DOGE)', network: 'dogecoin' },
  { id: 'TRX',  label: 'Tron (TRX)',      network: 'tron' },
  { id: 'SOL',  label: 'Solana (SOL)',    network: 'solana' },
];

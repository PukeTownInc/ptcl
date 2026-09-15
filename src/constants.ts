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
export const DAILY_XP_BONUS_CAP = 300;
export const FREE_SPINS_BASE = 10;
export const FREE_SPINS_DAILY_BONUS = 5;
export const POT_CAP_BASE = 500000;
export const POT_CAP_PER_LEVEL = 50000;
export const MAX_DAILY_DOUBLE_UPS = 3;
export const MAX_DAILY_POT_ACCEL = 2;
export const POT_ACCEL_DURATION_MS = 5 * 60 * 1000;
export const HOT_STREAK_THRESHOLD = 3;
export const HOT_STREAK_MULTIPLIER = 1.5;

// ✅ PAYTABLE — EXACTLY as your screenshot!
export const SYMBOLS: Record<SymbolId, SlotSymbol> = {
  'geiger':    { id: 'geiger',    label: 'Geiger Counter', emoji: '📻', image: '/symbols/symbol-geiger.png',    pays: [18, 55, 220], weight: 8, special: false },
  'cashlab':   { id: 'cashlab',   label: 'Cash Lab',      emoji: '🤑', image: '/symbols/symbol-cash-lab.png',   pays: [12, 35, 130], weight: 9, special: false },
  'skull':     { id: 'skull',     label: 'Skull',         emoji: '💀', image: '/symbols/symbol-skull.png',      pays: [12, 35, 130], weight: 9, special: false },
  'drum':      { id: 'drum',      label: 'Waste Drum',    emoji: '🛢️', image: '/symbols/symbol-drum.png',       pays: [7, 20, 64],   weight: 10, special: false },
  'radiation': { id: 'radiation', label: 'Radiation',     emoji: '☢️', image: '/symbols/symbol-radiation.png',  pays: [6, 16, 48],   weight: 11, special: false },
  'slimeguy':  { id: 'slimeguy',  label: 'Slime Guy',     emoji: '👽', image: '/symbols/symbol-slime-guy.png',  pays: [5, 12, 37],   weight: 12, special: false },
  'cauldron':  { id: 'cauldron',  label: 'Cauldron',      emoji: '🫕', image: '/symbols/symbol-cauldron.png',   pays: [4, 10, 30],   weight: 12, special: false },
  'virus':     { id: 'virus',     label: 'Virus',         emoji: '🦠', image: '/symbols/symbol-virus.png',      pays: [3, 8, 23],    weight: 13, special: false },
  'testtube':  { id: 'testtube',  label: 'Test Tube',     emoji: '🧪', image: '/symbols/symbol-test-tube.png',  pays: [3, 7, 19],    weight: 13, special: false },
  'rat':       { id: 'rat',       label: 'Mutant Rat',    emoji: '🐀', image: '/symbols/symbol-rat.png',       pays: [3, 6, 16],    weight: 14, special: false },
  'mask':      { id: 'mask',      label: 'Gas Mask',      emoji: '😷', image: '/symbols/symbol-mask.png',      pays: [2, 5, 13],    weight: 15, special: false },
  'slimeblob': { id: 'slimeblob', label: 'Slime Blob',    emoji: '🟢', image: '/symbols/symbol-slime-blob.png', pays: [2, 4, 11],    weight: 15, special: false },
  'wild':      { id: 'wild',      label: 'Wild',          emoji: '🤢', image: '/symbols/symbol-wild.png',      pays: [0, 0, 0],     weight: 3, special: true, substitute: true },
  'scatter':   { id: 'scatter',   label: 'Scatter',       emoji: '☣️', image: '/symbols/symbol-scatter.png',   pays: [0, 0, 0],     weight: 2, special: true, freeSpins: 5 },
  'bonus':     { id: 'bonus',     label: 'Bonus Wheel',   emoji: '⚖️', image: '/symbols/symbol-bonus.png',     pays: [0, 0, 0],     weight: 2, special: true, bonusGame: true },
  'hazard':    { id: 'hazard',    label: 'Hazard',        emoji: '⚠️', image: '/symbols/symbol-hazard.png',    pays: [0, 0, 0],     weight: 2, special: true, mystery: true },
  'jackpot':   { id: 'jackpot',   label: 'Jackpot',       emoji: '💰', image: '/symbols/symbol-jackpot.png',   pays: [0, 0, 0],     weight: 1, special: true, jackpot: true },
};

export const REEL_COUNT = 5;
export const ROW_COUNT = 3;
export const WIN_LINES = 243;

export const TIERS = [
  { id: 'bronze', label: 'Bronze', badge: '🥉', minXp: 0, potCap: 50000 },
  { id: 'silver', label: 'Silver', badge: '🥈', minXp: 5000, potCap: 100000 },
  { id: 'gold', label: 'Gold', badge: '🥇', minXp: 25000, potCap: 200000 },
  { id: 'platinum', label: 'Platinum', badge: '💎', minXp: 100000, potCap: 500000 },
];

export function getTier(xp: number) {
  return [...TIERS].reverse().find(t => xp >= t.minXp)!;
}

export function getNextTier(xp: number) {
  return TIERS.find(t => xp < t.minXp) ?? null;
}

export function formatPP(pp: number) {
  return pp.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function ppToUsd(pp: number) {
  return pp * PP_TO_USD;
}

export const JACKPOT_TYPES = ['mini', 'minor', 'major', 'grand'] as const;
export const JACKPOT_WEIGHTS = { mini: 50, minor: 30, major: 15, grand: 5 };

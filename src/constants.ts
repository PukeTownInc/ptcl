import type { SlotSymbol, SymbolId, Tier } from './types';
export const COLORS = {
  toxic: '#39FF14',
  radioactive: '#FFFF00',
  black: '#000000',
};
export const PP_TO_USD = 0.000025; // 10,000 PP = $0.25 USD
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
export const SYMBOLS: Record<SymbolId, SlotSymbol> = {
  cashlab:    { id: 'cashlab',    emoji: '🤑', label: 'Cash Lab',      pays: [12, 35, 130], weight: 2.5 },
  puketown:   { id: 'puketown',   emoji: '🤮', label: 'Puke Town',     pays: [18, 55, 220], weight: 1.5 },

  gasMask:          { id: 'gasMask',          emoji: '😷', label: 'Gas Mask',           pays: [7, 20, 64],   weight: 4 },
  geigerCounter:    { id: 'geigerCounter',    emoji: '📻', label: 'Geiger Counter',     pays: [6, 16, 48],   weight: 6 },
  radiationSign:    { id: 'radiationSign',    emoji: '☢️', label: 'Radiation Sign',     pays: [5, 12, 37],   weight: 8 },
  radioactiveSkull: { id: 'radioactiveSkull', emoji: '💀', label: 'Toxic Skull',        pays: [4, 10, 30],   weight: 10 },

  mutantBeetle:  { id: 'mutantBeetle',  emoji: '🪲', label: 'Mutant Beetle',   pays: [3, 8, 23],    weight: 13 },
  mutantRat:     { id: 'mutantRat',     emoji: '🐀', label: 'Mutant Rat',      pays: [3, 7, 19],    weight: 15 },
  testTube:      { id: 'testTube',      emoji: '🧪', label: 'Test Tube',       pays: [3, 6, 16],    weight: 18 },
  toxicCauldron: { id: 'toxicCauldron', emoji: '🫕', label: 'Toxic Cauldron',  pays: [2, 5, 13],    weight: 21 },
  wasteDrum:     { id: 'wasteDrum',     emoji: '🛢️', label: 'Waste Drum',      pays: [2, 4, 11],    weight: 24 },
  wastePit:      { id: 'wastePit',      emoji: '🕳️', label: 'Waste Pit',       pays: [2, 3, 9],     weight: 26 },

  slimeBlob:  { id: 'slimeBlob',  emoji: '🟢', label: 'Slime Blob',   pays: [2, 3, 9],     weight: 26 },
  slimeGuy:   { id: 'slimeGuy',   emoji: '👽', label: 'Slime Guy',    pays: [2, 4, 11],    weight: 24 },
  virus:      { id: 'virus',      emoji: '🦠', label: 'Virus',        pays: [2, 5, 13],    weight: 21 },
  toxicCloud: { id: 'toxicCloud', emoji: '☁️', label: 'Toxic Cloud',  pays: [3, 6, 16],    weight: 18 },

  wild:    { id: 'wild',    emoji: '🤮', label: 'Puke Wild',  pays: [0, 0, 0], weight: 3.5, special: 'wild', isSpecial: true },
  scatter: { id: 'scatter', emoji: '🤒', label: 'Sick Scatter', pays: [0, 0, 0], weight: 2, special: 'scatter', isSpecial: true },
  bonus:   { id: 'bonus',   emoji: '☢️', label: 'Toxic Bonus', pays: [0, 0, 0], weight: 1.5, special: 'bonus', isSpecial: true },
  hazard:  { id: 'hazard',  emoji: '☣️', label: 'Hazard Mystery', pays: [0, 0, 0], weight: 1.2, special: 'hazard', isSpecial: true },
  jackpot: { id: 'jackpot', emoji: '🧪', label: 'Toxic Jackpot', pays: [0, 0, 0], weight: 1, special: 'jackpot', isSpecial: true },
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
export const FREE_SPINS_DAILY_BONUS = 10;
export const MISSIONS = [
  { id: 'spins',     label: 'Spin 20 Times',      target: 20,  baseXp: 50,  adXp: 75,  icon: '🎰', adSpins: 5 },
  { id: 'ads',       label: 'Watch 5 Ads',        target: 5,   baseXp: 50,  adXp: 75,  icon: '📺', adSpins: 5 },
  { id: 'wheel',     label: 'Spin the Radioactive Risk Wheel 3 Times', target: 3, baseXp: 50, adXp: 75, icon: '🎬', adSpins: 5 },
  { id: 'claistreak',label: 'Claim Daily Streak',  target: 1,  baseXp: 50,  adXp: 75,  icon: '📅', adSpins: 5 },
  { id: 'earnpp',    label: 'Earn 100 Puke Points', target: 100, baseXp: 50, adXp: 75,  icon: '🎯', adSpins: 5 },
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
  { day: 1, spins: 2, xp: 10, label: 'Day 1' },
  { day: 2, spins: 3, xp: 15, label: 'Day 2' },
  { day: 3, spins: 4, xp: 20, label: 'Day 3' },
  { day: 4, spins: 5, xp: 30, label: 'Day 4' },
  { day: 5, spins: 7, xp: 35, label: 'Day 5' },
  { day: 6, spins: 8, xp: 40, label: 'Day 6' },
  { day: 7, spins: 15, xp: 75, ppBoost: true, label: 'Day 7 — MAX!' },
];
export const MAX_STREAK_DAY = 7;
export const ppToUsd = (pp: number) => pp * PP_TO_USD;
export function formatPP(pp: number): string {
  return pp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export const CRYPTO_OPTIONS = [
  { id: 'BTC', label: 'Bitcoin (BTC)',  network: 'bitcoin' },
  { id: 'LTC', label: 'Litecoin (LTC)', network: 'litecoin' },
  { id: 'DOGE', label: 'Dogecoin (DOGE)', network: 'dogecoin' },
  { id: 'TRX', label: 'Tron (TRX)',     network: 'tron' },
  { id: 'SOL', label: 'Solana (SOL)',   network: 'solana' },
];

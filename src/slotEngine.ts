import type { SlotSymbol, SpinResult, SymbolId, WinLine } from './types';
import { JACKPOT_TYPES, JACKPOT_WEIGHTS, REEL_COUNT, ROW_COUNT, SYMBOLS } from './constants';

const REGULAR_IDS: SymbolId[] = [
  'puke', 'slime', 'sneeze', 'tp', 'pill', 'germ',
  'beaker', 'vomit', 'toxic', 'barrel', 'warn', 'rich',
];
const SPECIAL_IDS: SymbolId[] = ['wild', 'scatter', 'bonus', 'hazard', 'jackpot'];

const ALL_IDS = [...REGULAR_IDS, ...SPECIAL_IDS];
const TOTAL_WEIGHT = ALL_IDS.reduce((s, id) => s + SYMBOLS[id].weight, 0);

function weightedPick(): SymbolId {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const id of ALL_IDS) {
    r -= SYMBOLS[id].weight;
    if (r <= 0) return id;
  }
  return 'puke';
}

/** 243 ways = any matching symbol on 3+ consecutive reels from reel 0, in any row. Wilds substitute. */
function evaluateWays(grid: SymbolId[][]): WinLine[] {
  const wins: WinLine[] = [];
  const symbolCounts = new Map<SymbolId, { count: number; positions: [number, number][] }>();

  for (const symId of REGULAR_IDS) {
    const positions: [number, number][] = [];
    let count = 0;
    let broken = false;
    for (let reel = 0; reel < REEL_COUNT && !broken; reel++) {
      const reelSyms = grid[reel];
      const matched = reelSyms.some(
        (s) => s === symId || s === 'wild'
      );
      if (matched) {
        count++;
        // collect all matching positions on this reel
        for (let row = 0; row < ROW_COUNT; row++) {
          if (reelSyms[row] === symId || reelSyms[row] === 'wild') {
            positions.push([reel, row]);
          }
        }
      } else {
        broken = true;
      }
    }
    if (count >= 3) {
      symbolCounts.set(symId, { count, positions });
    }
  }

  for (const [symId, { count, positions }] of symbolCounts) {
    const sym = SYMBOLS[symId];
    const payIdx = count - 3;
    const basePay = sym.pays[Math.min(payIdx, 2)];
    if (basePay > 0) {
      wins.push({
        symbols: [symId],
        pp: basePay,
        count,
        positions,
      });
    }
  }
  return wins;
}

function countScatters(grid: SymbolId[][]): number {
  let c = 0;
  for (let r = 0; r < REEL_COUNT; r++) for (let row = 0; row < ROW_COUNT; row++) if (grid[r][row] === 'scatter') c++;
  return c;
}

function pickJackpot(): { type: 'mini' | 'minor' | 'major' | 'grand'; amount: number } | null {
  let r = Math.random() * JACKPOT_WEIGHTS.reduce((a, b) => a + b, 0);
  for (let i = 0; i < JACKPOT_TYPES.length; i++) {
    r -= JACKPOT_WEIGHTS[i];
    if (r <= 0) return JACKPOT_TYPES[i];
  }
  return JACKPOT_TYPES[0];
}

export function spin(): SpinResult {
  const grid: SymbolId[][] = [];
  for (let reel = 0; reel < REEL_COUNT; reel++) {
    const col: SymbolId[] = [];
    for (let row = 0; row < ROW_COUNT; row++) {
      col.push(weightedPick());
    }
    grid.push(col);
  }

  const wins = evaluateWays(grid);
  const scatterCount = countScatters(grid);

  let totalPP = wins.reduce((s, w) => s + w.pp, 0);
  let freeSpinsAwarded = 0;
  let bonusAwarded: number | null = null;
  let jackpot: SpinResult['jackpot'] = null;

  // Scatter free spins: 3=6, 4=10, 5=15
  if (scatterCount >= 3) {
    freeSpinsAwarded = scatterCount >= 5 ? 15 : scatterCount >= 4 ? 10 : 6;
  }

  // Bonus symbol: appears on 3+ reels → random reward
  let bonusCount = 0;
  for (let r = 0; r < REEL_COUNT; r++) {
    if (grid[r].some((s) => s === 'bonus')) bonusCount++;
  }
  if (bonusCount >= 3) {
    const roll = Math.random();
    if (roll < 0.45) {
      bonusAwarded = 10 + Math.floor(Math.random() * 31); // 10-40 Puke Points
      totalPP += bonusAwarded;
    } else if (roll < 0.75) {
      freeSpinsAwarded += 3 + Math.floor(Math.random() * 6); // 3-8 spins
    } else {
      // multiplier applied as bonus Puke Points = 1.5x–2.5x of current wins
      const mult = 1.5 + Math.random() * 1;
      const bonus = Math.round(totalPP * mult);
      bonusAwarded = bonus;
      totalPP += bonus;
    }
  }

  // Hazard mystery symbol: all hazard symbols on grid reveal same random regular symbol
  let hazardPositions: [number, number][] = [];
  for (let r = 0; r < REEL_COUNT; r++) for (let row = 0; row < ROW_COUNT; row++) if (grid[r][row] === 'hazard') hazardPositions.push([r, row]);
  if (hazardPositions.length > 0) {
    const reveal = REGULAR_IDS[Math.floor(Math.random() * 6)]; // reveal a low-mid symbol
    for (const [r, row] of hazardPositions) grid[r][row] = reveal;
    // re-evaluate after reveal, replacing the original wins
    const revealedWins = evaluateWays(grid);
    const bonusPPSoFar = bonusAwarded ?? 0;
    wins.length = 0;
    wins.push(...revealedWins);
    totalPP = wins.reduce((s, w) => s + w.pp, 0) + bonusPPSoFar;
  }

  // Jackpot symbol: 3+ on grid triggers jackpot
  let jackpotCount = 0;
  for (let r = 0; r < REEL_COUNT; r++) for (let row = 0; row < ROW_COUNT; row++) if (grid[r][row] === 'jackpot') jackpotCount++;
  if (jackpotCount >= 3) {
    const jp = pickJackpot()!;
    jackpot = jp;
    totalPP += jp.amount;
  }

  // No consolation prize — losing spins pay 0 PP
  const xpGained = 1;

  return {
    grid,
    wins,
    totalPP,
    xpGained,
    jackpot,
    freeSpinsAwarded,
    bonusAwarded,
    scatterCount,
    potFull: false,
  };
}

export function doubleUpGamble(): boolean {
  return Math.random() < 0.5;
}

export function getSymbol(id: SymbolId): SlotSymbol {
  return SYMBOLS[id];
}

/** Random spin for visual reel blur (not evaluated) */
export function randomReelStrip(length: number): SymbolId[] {
  const arr: SymbolId[] = [];
  for (let i = 0; i < length; i++) arr.push(weightedPick());
  return arr;
}

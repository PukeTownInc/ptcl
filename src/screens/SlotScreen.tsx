import { useCallback, useEffect, useRef, useState } from 'react';
import { Lock, Tv, Zap, Package, RefreshCw, Layers, Play, X, Coins, Flame, Square, History, Timer } from 'lucide-react';
import type { GameState, SpinResult, SymbolId, WinLine } from '../types';
import { getTier, getNextTier, MIN_UNLOCK_PP, formatPP } from '../constants';
import * as engine from '../slotEngine';
import type { GameActions } from '../useGameState';
import { isHotStreakActive, isPotAccelActive } from '../useGameState';
import { useToast } from '../components/Toast';
import { AdModal } from '../components/AdModal';
import { BalanceCard } from '../components/BalanceCard';
import { SpinWheelModal, type WheelResult } from '../components/SpinWheelModal';

const REEL_DISPLAY = 3;
type ReelPhase = 'idle' | 'spinning' | 'stopped';
type SpinHistoryEntry =
  | { kind: 'spin'; pp: number; symbols: string[] }
  | { kind: 'double'; pp: number }
  | { kind: 'half'; pp: number }
  | { kind: 'lose'; pp: number }
  | { kind: 'safe'; pp: number };

const MAX_HISTORY = 20;

export function SlotScreen({ state, actions }: { state: GameState; actions: GameActions }) {
  const toast = useToast();
  const tier = getTier(state.xp);

  const [grid, setGrid] = useState<SymbolId[][]>(() => {
    const init: SymbolId[][] = [];
    for (let r = 0; r < 5; r++) {
      const col: SymbolId[] = [];
      for (let i = 0; i < REEL_DISPLAY; i++) col.push(engine.randomReelStrip(1)[0]);
      init.push(col);
    }
    return init;
  });

  const [spinning, setSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [winPositions, setWinPositions] = useState<Set<string>>(new Set());
  const [winPP, setWinPP] = useState(0);
  const [showJackpot, setShowJackpot] = useState<string | null>(null);
  const [showDoubleUp, setShowDoubleUp] = useState(false);
  const [adModal, setAdModal] = useState<null | { title: string; subtitle?: string; reward: string; onComplete: () => void }>(null);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [activeWinIndex, setActiveWinIndex] = useState(0);
  const [spinId, setSpinId] = useState(0);
  const [reelsDims, setReelsDims] = useState({ w: 0, h: 0 });
  const reelsRef = useRef<HTMLDivElement>(null);
  const [reelPhases, setReelPhases] = useState<ReelPhase[]>(['idle', 'idle', 'idle', 'idle', 'idle']);
  const [cyclingSymbols, setCyclingSymbols] = useState<SymbolId[][]>(() => {
    const init: SymbolId[][] = [];
    for (let r = 0; r < 5; r++) init.push(engine.randomReelStrip(REEL_DISPLAY));
    return init;
  });

  const cycleInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [autoSpin, setAutoSpin] = useState(false);
  const autoSpinRef = useRef(false);
  const doubleUpResolvedRef = useRef(false);
  const [spinHistory, setSpinHistory] = useState<SpinHistoryEntry[]>([]);
  const [potAccelCountdown, setPotAccelCountdown] = useState('');

  useEffect(() => {
    return () => {
      if (cycleInterval.current) clearInterval(cycleInterval.current);
      stopTimers.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (!state.potAccelUntil) return;
    const update = () => {
      const remaining = state.potAccelUntil! - Date.now();
      if (remaining <= 0) {
        setPotAccelCountdown('');
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setPotAccelCountdown(`${mins}:${String(secs).padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [state.potAccelUntil]);

  useEffect(() => {
    const measure = () => {
      if (reelsRef.current) {
        const rect = reelsRef.current.getBoundingClientRect();
        setReelsDims({ w: rect.width, h: rect.height });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (spinning || !lastResult || lastResult.wins.length === 0) return;
    setActiveWinIndex(0);
    if (lastResult.wins.length <= 1) return;
    const interval = setInterval(() => {
      setActiveWinIndex((i) => (i + 1) % lastResult.wins.length);
    }, 900);
    return () => clearInterval(interval);
  }, [spinning, lastResult]);

  const potFull = state.lockedPotPP >= tier.potCap;

  const doSpin = useCallback(() => {
    if (spinning) return;
    if (state.spinsRemaining <= 0 && freeSpinsLeft <= 0) {
      toast('error', 'No Toxic Twists Left', 'Absorb radiation or wait for daily dose');
      return;
    }
    setSpinning(true);
    setWinPositions(new Set());
    setWinPP(0);
    setLastResult(null);
    setSpinId((n) => n + 1);
    setReelPhases(['spinning', 'spinning', 'spinning', 'spinning', 'spinning']);
    const result = engine.spin();

    cycleInterval.current = setInterval(() => {
      const next: SymbolId[][] = [];
      for (let r = 0; r < 5; r++) next.push(engine.randomReelStrip(REEL_DISPLAY));
      setCyclingSymbols(next);
    }, 70);

    const baseDelay = 1000;
    const stagger = 320;
    for (let r = 0; r < 5; r++) {
      const t = setTimeout(() => {
        setGrid((prev) => {
          const next = [...prev];
          next[r] = result.grid[r].slice(0, REEL_DISPLAY);
          return next;
        });
        setReelPhases((prev) => {
          const next = [...prev];
          next[r] = 'stopped';
          return next;
        });
        if (r === 4) {
          if (cycleInterval.current) {
            clearInterval(cycleInterval.current);
            cycleInterval.current = null;
          }
          setTimeout(() => finishSpin(result), 500);
        }
      }, baseDelay + r * stagger);
      stopTimers.current.push(t);
    }

    function finishSpin(res: SpinResult) {
      setSpinning(false);
      setReelPhases(['idle', 'idle', 'idle', 'idle', 'idle']);
      setLastResult(res);

      const posSet = new Set<string>();
      res.wins.forEach((w) => w.positions.forEach(([r, row]) => posSet.add(`${r}-${row}`)));
      res.jackpot && res.grid.forEach((col, r) => col.forEach((s, row) => s === 'jackpot' && posSet.add(`${r}-${row}`)));
      setWinPositions(posSet);

      const eligibleDoubleUp = res.totalPP >= 6 && !potFull && state.dailyDoubleUps < 3;
      if (res.totalPP > 0 && !potFull) {
        if (eligibleDoubleUp) {
          doubleUpResolvedRef.current = false;
          actions.setDoubleUpPending(res.totalPP);
          setShowDoubleUp(true);
        } else {
          actions.addPP(res.totalPP);
        }
        setWinPP(res.totalPP);
      } else if (potFull) {
        toast('info', 'VAT OVERFLOWETH!', 'Absorb radiation to breach containment — +1 XP only');
      }

      actions.addXP(res.xpGained, false);
      actions.recordSpin();

      if (freeSpinsLeft > 0) {
        setFreeSpinsLeft((n) => n - 1);
      }
      if (res.freeSpinsAwarded > 0) {
        setFreeSpinsLeft((n) => n + res.freeSpinsAwarded);
        toast('success', `${res.freeSpinsAwarded} Toxic Twists!`, 'Contamination scatter triggered ☢️');
      }
      if (res.jackpot) {
        setShowJackpot(res.jackpot.type);
        actions.recordJackpot();
        setTimeout(() => setShowJackpot(null), 3000);
      }

      const winSymbols = res.wins.length > 0
        ? [...new Set(res.wins.map((w) => engine.getSymbol(w.symbols[0]).emoji))]
        : [];
      setSpinHistory((prev) => [{ kind: 'spin', pp: res.totalPP, symbols: winSymbols }, ...prev].slice(0, MAX_HISTORY));
    }
  }, [spinning, state.spinsRemaining, freeSpinsLeft, potFull, actions, toast]);

  const handleWheelClaim = (result: WheelResult) => {
    doubleUpResolvedRef.current = true;
    setShowDoubleUp(false);
    setAdModal({
      title: 'Contamination Wheel Reward',
      subtitle: `Absorb radiation to secure your ${result.outcome === 'double' ? 'DOUBLED' : result.outcome === 'half' ? 'HALVED' : 'SAFE'} goop`,
      reward: `+${formatPP(result.finalPP)} Puke Points`,
      onComplete: () => {
        actions.addPP(result.finalPP);
        actions.useDoubleUp();
        actions.watchAd();
        if (result.outcome === 'double') {
          toast('success', '☢️ DOUBLED GOOP!', `+${formatPP(result.finalPP)} Puke Points Contaminated!`);
        } else if (result.outcome === 'half') {
          toast('info', 'HALF THE GOOPS', `+${formatPP(result.finalPP)} Puke Points saved from spillage`);
        } else {
          toast('success', '☣️ CONTAMINATION SECURED', `+${formatPP(result.finalPP)} Puke Points banked safely`);
        }
      },
    });
    const kind = result.outcome === 'double' ? 'double' : result.outcome === 'half' ? 'half' : 'safe';
    setSpinHistory((prev) => [{ kind, pp: result.finalPP }, ...prev].slice(0, MAX_HISTORY));
  };

  const handleWheelLose = () => {
    doubleUpResolvedRef.current = true;
    setShowDoubleUp(false);
    actions.useDoubleUp();
    setWinPP(0);
    toast('error', '☠️ GOOPS SPILLED!', 'All washed away — better containment next time!');
    setSpinHistory((prev) => [{ kind: 'lose', pp: 0 }, ...prev].slice(0, MAX_HISTORY));
  };

  const handleWheelForfeit = () => {
    const original = state.doubleUpPending ?? 0;
    doubleUpResolvedRef.current = true;
    setShowDoubleUp(false);
    actions.addPP(original);
    actions.useDoubleUp();
    toast('info', '🧪 GOOPS BANKED', `+${formatPP(original)} Puke Points secured — wheel result purged`);
    setSpinHistory((prev) => [{ kind: 'safe', pp: original }, ...prev].slice(0, MAX_HISTORY));
  };

  const handleUnlockPot = () => {
    if (state.lockedPotPP < MIN_UNLOCK_PP) {
      toast('error', 'NOT ENOUGH GOOPS', `Need at least ${formatPP(MIN_UNLOCK_PP)} Puke Points sealed in vat`);
      return;
    }
    if (state.dailyUnlocksUsed >= tier.dailyUnlocks) {
      toast('error', 'CONTAINMENT BREACHED', `Daily quota exhausted — return after radiation flush`);
      return;
    }
    setAdModal({
      title: 'Breach Containment Vat',
      subtitle: 'Absorb radiation to unseal 100% of your sludge stockpile',
      reward: `${state.lockedPotPP.toLocaleString()} Puke Points → Purge Ready`,
      onComplete: () => {
        const moved = state.lockedPotPP;
        actions.unlockPot();
        actions.addXP(15, true);
        toast('success', '☢️ VAT UNLOCKED!', `${formatPP(moved)} Puke Points now purgeable!`);
      },
    });
  };

  const handleExtraLucky = () => {
    if (state.dailyExtraLucky >= 3) {
      toast('info', 'RADIATION SATURATION', 'Return after contamination resets');
      return;
    }
    setAdModal({
      title: 'Toxic Surge',
      subtitle: 'Absorb radiation for +3 extra Toxic Twists',
      reward: '+3 Toxic Twists',
      onComplete: () => {
        actions.useExtraLucky();
        actions.watchAd();
        toast('success', '☢️ SURGE ACTIVATED', '+3 Twists contaminated & ready!');
      },
    });
  };

  const handleMysteryPack = () => {
    if (state.spinsRemaining > 0) {
      toast('info', 'TWISTS STILL AVAILABLE', 'Mystery Goop Vat only empty when contaminated');
      return;
    }
    setAdModal({
      title: 'Mystery Goop Vat',
      subtitle: 'Absorb radiation to crack open a random sludge barrel',
      reward: '+15 to +25 Toxic Twists (random contamination)',
      onComplete: () => {
        const got = actions.openMysteryPack();
        actions.watchAd();
        toast('success', '🧪 BARREL OPENED!', `+${got} Toxic Twists contaminated!`);
      },
    });
  };

  const handlePotAccel = () => {
    if (state.dailyPotAccel >= 2) {
      toast('info', 'ACCELERATOR OVERHEATED', 'Return after radiation cools');
      return;
    }
    if (isPotAccelActive(state)) {
      toast('info', '☢️ ALREADY FLOWING', 'Sludge fill rate doubled right now!');
      return;
    }
    setAdModal({
      title: 'Sludge Accelerator',
      subtitle: 'Absorb radiation — fill vat TWICE as fast for 5 minutes',
      reward: 'x2 Sludge Flow • 5 Minutes',
      onComplete: () => {
        actions.activatePotAccel();
        actions.watchAd();
        toast('success', '☢️ ACCELERATOR ACTIVE', 'Sludge flowing at x2 speed!');
      },
    });
  };

  const canSpin = state.spinsRemaining > 0 || freeSpinsLeft > 0;

  const toggleAutoSpin = useCallback(() => {
    setAutoSpin((prev) => {
      const next = !prev;
      autoSpinRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!autoSpin) return;
    if (spinning || showDoubleUp || showJackpot || adModal) return;
    if (state.spinsRemaining <= 0 && freeSpinsLeft <= 0) {
      setAutoSpin(false);
      autoSpinRef.current = false;
      toast('info', 'OUT OF GOOPS', 'Auto-contamination halted — get more Twists to continue');
      return;
    }
    const t = setTimeout(() => {
      if (autoSpinRef.current) doSpin();
    }, 600);
    return () => clearTimeout(t);
  }, [autoSpin, spinning, showDoubleUp, showJackpot, adModal, state.spinsRemaining, freeSpinsLeft, doSpin, toast]);

  return (
    <div className="space-y-4">
      <BalanceCard
        lockedPP={state.lockedPotPP}
        withdrawablePP={state.withdrawablePP}
        tierBadge={tier.badge}
        tierLabel={tier.label}
        potCap={tier.potCap}
        xp={state.xp}
        nextXp={null}
        compact
      />

      {(isHotStreakActive(state) || isPotAccelActive(state) || freeSpinsLeft > 0) && (
        <div className="flex flex-wrap gap-2">
          {freeSpinsLeft > 0 && (
            <span className="px-2 py-1 rounded-full bg-toxic-500/15 border border-toxic-600/40 text-toxic-300 text-[10px] font-display font-bold flex items-center gap-1 animate-pulse">
              <Play size={10} /> {freeSpinsLeft} TOXIC TWISTS
            </span>
          )}
          {isHotStreakActive(state) && (
            <span className="px-2 py-1 rounded-full bg-hazard-amber/15 border border-hazard-amber/40 text-hazard-amber text-[10px] font-display font-bold flex items-center gap-1">
              <Flame size={10} /> FEVER PITCH x1.5
            </span>
          )}
          {isPotAccelActive(state) && (
            <span className="px-2 py-1 rounded-full bg-radioactive-500/15 border border-radioactive-600/40 text-radioactive-400 text-[10px] font-display font-bold flex items-center gap-1">
              <Zap size={10} /> VAT FLOW x2
            </span>
          )}
        </div>
      )}

      {isPotAccelActive(state) && potAccelCountdown && (
        <div className="grunge-panel p-3 border border-radioactive-600/40 animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-radioactive-500/20 border border-radioactive-600/40 flex items-center justify-center animate-pulse">
                <Timer size={16} className="text-radioactive-400" />
              </div>
              <div>
                <div className="font-display font-bold text-xs text-radioactive-400">Sludge Accelerator Flowing</div>
                <div className="text-[10px] text-toxic-100/40 font-mono">Double contamination rate active</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-bold text-radioactive-400 neon-text-yellow tabular-nums">{potAccelCountdown}</div>
              <div className="text-[9px] text-toxic-100/40 font-mono uppercase">remaining</div>
            </div>
          </div>
        </div>
      )}

      <div className="relative grunge-panel p-3 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 hazard-stripes opacity-30" />
        <div className="absolute bottom-0 left-0 right-0 h-1 hazard-stripes opacity-30" />
        <div ref={reelsRef} className="relative grid grid-cols-5 gap-1.5 bg-ink-900 rounded-lg p-2 border border-toxic-900/40">
          {grid.map((reel, ri) => {
            const phase = reelPhases[ri];
            const displayReel = phase === 'spinning' ? (cyclingSymbols[ri] ?? reel) : reel;
            return (
              <div key={ri} className={`relative overflow-hidden rounded-md bg-ink-850 border border-toxic-900/30 ${phase === 'spinning' ? 'reel-spinning' : ''} ${phase === 'stopped' ? 'reel-stopped' : ''}`}>
                {displayReel.map((symId, row) => {
                  const isWin = winPositions.has(`${ri}-${row}`);
                  return (
                    <div
                      key={row}
                      className={`aspect-square flex items-center justify-center reel-symbol ${isWin ? 'win' : ''} ${phase === 'spinning' ? 'reel-blur' : ''} ${phase === 'stopped' ? 'reel-land' : ''}`}
                    >
                      <span key={`sym-${ri}-${row}-${isWin ? spinId : 0}`} style={isWin ? { filter: 'drop-shadow(0 0 8px #39ff14)' } : undefined} className={isWin ? 'win-symbol-pop' : ''}>
                        {engine.getSymbol(symId).emoji}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {!spinning && lastResult && lastResult.wins.length > 0 && reelsDims.w > 0 && (
            <WinLineOverlay
              key={spinId}
              wins={lastResult.wins}
              activeIndex={activeWinIndex}
              width={reelsDims.w}
              height={reelsDims.h}
            />
          )}
        </div>

        <div className="mt-3 min-h-[60px] flex items-center justify-center">
          {spinning ? (
            <div className="text-center">
              <RefreshCw size={22} className="text-toxic-400/70 animate-spin mx-auto" />
              <div className="font-display text-xs text-toxic-300/50 mt-1.5 tracking-[0.3em] animate-pulse">CONTAMINATING</div>
            </div>
          ) : winPP > 0 ? (
            <div className="text-center animate-pop">
              <div className="font-display font-black text-2xl text-toxic-400 neon-text">+{formatPP(winPP)} Puke Points</div>
              {lastResult && lastResult.wins.length > 0 && (
                <div className="text-[10px] text-toxic-100/50 font-mono mt-1">
                  {lastResult.wins.length} way{lastResult.wins.length > 1 ? 's' : ''} • {lastResult.wins.map((w) => engine.getSymbol(w.symbols[0]).label).join(', ')}
                  {lastResult.wins.length > 1 && (
                    <span className="text-toxic-400/70 ml-1.5">[Vein {activeWinIndex + 1}/{lastResult.wins.length}]</span>
                  )}
                </div>
              )}
            </div>
          ) : potFull ? (
            <div className="text-center animate-shake">
              <div className="font-display font-black text-xl text-hazard-amber">☢️ VAT OVERFLOW!</div>
              <div className="text-[10px] text-toxic-100/50 font-mono">Absorb radiation to breach containment</div>
            </div>
          ) : (
            <div className="text-center text-toxic-100/30">
              <div className="font-display text-sm">Contaminate the reels for Puke Points</div>
              <div className="text-[10px] font-mono">243 contamination veins • winning lines yield Puke Points</div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center mb-2">
          <span className="font-display font-bold text-sm text-toxic-300">
            Toxic Twists: <span className="text-toxic-400 neon-text tabular-nums">{state.spinsRemaining + freeSpinsLeft}</span>
          </span>
        </div>

        <button
          onClick={doSpin}
          disabled={!canSpin || spinning}
          className="toxic-btn w-full py-4 text-lg flex items-center justify-center gap-2 mt-1"
        >
          {spinning ? (
            <><RefreshCw size={22} className="animate-spin" /> CONTAMINATING...</>
          ) : (
            <><Play size={22} /> CONTAMINATE</>
          )}
        </button>

        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={toggleAutoSpin}
            className={`flex-1 py-2.5 rounded-lg font-display font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
              autoSpin
                ? 'bg-toxic-500/20 border border-toxic-400 text-toxic-400'
                : 'bg-ink-700/50 border border-toxic-900/40 text-toxic-100/40 hover:text-toxic-100/70'
            }`}
            style={autoSpin ? { boxShadow: '0 0 14px #39ff1455' } : undefined}
          >
            {autoSpin ? <><Square size={16} /> HALT CONTAMINATION</> : <><Zap size={16} /> AUTO-CONTAMINATE</>}
          </button>
          <span className={`text-[10px] font-mono ${autoSpin ? 'text-toxic-400' : 'text-toxic-100/30'}`}>
            Auto: {autoSpin ? 'ACTIVE' : 'IDLE'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <BonusBtn
          icon={<Package size={16} />}
          label="Mystery Goop Vat"
          sub={`15-25 Twists • only when empty`}
          ad
          onClick={handleMysteryPack}
          disabled={state.spinsRemaining > 0 || spinning}
        />
        <BonusBtn
          icon={<Zap size={16} />}
          label="Sludge Accelerator"
          sub={`${2 - state.dailyPotAccel} left • x2 flow for 5 min`}
          ad
          onClick={handlePotAccel}
          disabled={state.dailyPotAccel >= 2 || isPotAccelActive(state) || spinning}
        />
      </div>

      <SpinHistory entries={spinHistory} />
      <Paytable />

      {showJackpot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in">
          <div className="text-center animate-jackpot">
            <div className="text-7xl mb-4">☢️</div>
            <div className="font-display font-black text-3xl text-radioactive-400 neon-text-yellow uppercase">CONTAMINATION!</div>
            <div className="font-display text-xl text-toxic-400 neon-text mt-2">{showJackpot.toUpperCase()}</div>
            <div className="font-mono text-toxic-200 mt-3">
              {JACKPOT_AMOUNTS[showJackpot]} Puke Points sealed in vat
            </div>
          </div>
        </div>
      )}

      {showDoubleUp && state.doubleUpPending && (
        <SpinWheelModal
          stake={state.doubleUpPending}
          onClaim={handleWheelClaim}
          onLose={handleWheelLose}
          onForfeit={handleWheelForfeit}
        />
      )}

      <AdModal
        open={!!adModal}
        onClose={() => {
          setAdModal(null);
        }}
        onComplete={() => {
          adModal?.onComplete();
          setAdModal(null);
        }}
        title={adModal?.title ?? ''}
        subtitle={adModal?.subtitle}
        reward={adModal?.reward ?? ''}
      />
    </div>
  );
}

const JACKPOT_AMOUNTS: Record<string, number> = { mini: 30, minor: 60, major: 120, grand: 300 };
const LINE_COLORS = ['#39ff14', '#ffff00', '#ff7a00', '#00ffff', '#ff2d8f'];

function WinLineOverlay({ wins, activeIndex, width, height }: {
  wins: WinLine[];
  activeIndex: number;
  width: number;
  height: number;
}) {
  const padding = 8;
  const gap = 6;
  const cellW = (width - padding * 2 - gap * 4) / 5;
  const cellH = (height - padding * 2 - gap * 2) / 3;

  const centerOf = (reel: number, row: number): [number, number] => [
    padding + cellW / 2 + reel * (cellW + gap),
    padding + cellH / 2 + row * (cellH + gap),
  ];

  const win = wins[activeIndex % wins.length];
  if (!win) return null;

  const byReel = new Map<number, number>();
  for (const [r, row] of win.positions) {
    if (!byReel.has(r)) byReel.set(r, row);
  }
  const sortedReels = [...byReel.keys()].sort((a, b) => a - b);

  const reelRows = new Map<number, number[]>();
  for (const [r, row] of win.positions) {
    if (!reelRows.has(r)) reelRows.set(r, []);
    reelRows.get(r)!.push(row);
  }

  const points: [number, number][] = [];
  let prevRow = byReel.get(sortedReels[0]) ?? 1;
  for (const r of sortedReels) {
    const rows = reelRows.get(r) ?? [1];
    const bestRow = rows.reduce((best, row) =>
      Math.abs(row - prevRow) < Math.abs(best - prevRow) ? row : best, rows[0]);
    points.push(centerOf(r, bestRow));
    prevRow = bestRow;
  }

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const color = LINE_COLORS[activeIndex % LINE_COLORS.length];

  const endpoints = points.map((p, i) => (
    <circle key={i} cx={p[0]} cy={p[1]} r={Math.min(cellW, cellH) * 0.42} fill="none" stroke={color} strokeWidth="2" opacity="0.6"
      style={{ filter: `drop-shadow(0 0 4px ${color})` }} className="win-circle-pop" />
  ));

  return (
    <svg className="absolute inset-0 pointer-events-none z-10" width={width} height={height}>
      <path
        d={pathD}
        stroke={color}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        className="win-line-draw"
      />
      {endpoints}
    </svg>
  );
}

function BonusBtn({ icon, label, sub, ad, onClick, disabled }: { icon: React.ReactNode; label: string; sub: string; ad?: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="ghost-btn p-2.5 text-left disabled:opacity-30">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-toxic-400">{icon}</span>
        <span className="font-display font-bold text-xs text-toxic-200">{label}</span>
      </div>
      <div className="text-[10px] text-toxic-100/40 font-mono">{sub}</div>
      {ad && <div className="ad-badge mt-1"><Tv size={8} /> Absorb Radiation</div>}
    </button>
  );
}

function SpinHistory({ entries }: { entries: SpinHistoryEntry[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="grunge-panel overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-toxic-500/5">
        <span className="font-display font-bold text-sm text-toxic-300 flex items-center gap-2"><History size={16} /> Contamination Log</span>
        <span className="text-toxic-100/40 text-xs">{open ? 'Hide' : 'Reveal'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1 animate-slide-up max-h-64 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="text-[11px] text-toxic-100/30 font-mono text-center py-4">No contamination yet — start the infection!</p>
          ) : (
            entries.map((entry, i) => {
              if (entry.kind === 'spin') {
                return (
                  <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-ink-700/40">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-mono text-toxic-100/30 shrink-0">#{entries.length - i}</span>
                      {entry.pp > 0 ? (
                        <span className="text-sm truncate">{entry.symbols.join(' ')}</span>
                      ) : (
                        <span className="text-[11px] font-mono text-toxic-100/30">No contamination</span>
                      )}
                    </div>
                    <span className={`text-xs font-mono font-bold shrink-0 ${entry.pp > 0 ? 'text-toxic-400' : 'text-toxic-100/30'}`}>
                      {formatPP(entry.pp)} PP
                    </span>
                  </div>
                );
              }
              const labels: Record<typeof entry.kind, { icon: string; label: string; color: string }> = {
                double: { icon: '☢️', label: 'DOUBLED', color: 'text-toxic-400' },
                half:   { icon: '☣️', label: 'HALVED', color: 'text-hazard-amber' },
                lose:   { icon: '☠️', label: 'SPILLED', color: 'text-red-400' },
                safe:   { icon: '🛡️', label: 'SECURED', color: 'text-toxic-100/60' },
              };
              const info = labels[entry.kind];
              return (
                <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-ink-700/40 border-l-2 border-l-radioactive-500/30">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-mono text-toxic-100/30 shrink-0">#{entries.length - i}</span>
                    <span className="text-sm">{info.icon}</span>
                    <span className={`text-[11px] font-mono ${info.color}`}>{info.label}</span>
                  </div>
                  <span className={`text-xs font-mono font-bold shrink-0 ${entry.pp > 0 ? 'text-toxic-400' : 'text-toxic-100/30'}`}>
                    {formatPP(entry.pp)} PP
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function Paytable() {
  const [open, setOpen] = useState(false);
  const symbols: [string, string, [number, number, number]][] = [
    ['🤢', 'Nausea', [2, 3, 9]],
    ['🟡', 'Slime', [2, 4, 11]],
    ['🤧', 'Sneeze', [2, 5, 13]],
    ['🧻', 'TP Roll', [3, 6, 16]],
    ['💊', 'Anti-Toxin', [3, 7, 19]],
    ['🦠', 'Germ', [3, 8, 23]],
    ['🧪', 'Beaker', [4, 10, 30]],
    ['🤮', 'Puke Wild', [5, 12, 37]],
    ['☢️', 'Toxic', [6, 16, 48]],
    ['🛢️', 'Barrel', [7, 20, 64]],
    ['⚠️', 'Warning', [12, 35, 130]],
    ['🤑', 'Contaminated Rich', [18, 55, 220]],
  ];
  const specials: [string, string, string][] = [
    ['🤮', 'Puke Wild', 'Replaces ANY symbol to form contamination veins'],
    ['🤒', 'Sick Scatter', '3=6 / 4=10 / 5=15 Toxic Twists'],
    ['☢️', 'Toxic Bonus', '3+ reels: 10-40 Puke Points or 1.5x-2.5x or 3-8 Twists'],
    ['☣️', 'Hazard Mystery', 'All hazards reveal SAME symbol — maximum contamination!'],
    ['🧪', 'Toxic Jackpot', '3+ Beakers: Mini 30 • Minor 60 • Major 120 • Grand 300'],
  ];
  return (
    <div className="grunge-panel overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-toxic-500/5">
        <span className="font-display font-bold text-sm text-toxic-300 flex items-center gap-2"><Coins size={16} /> Contamination Guide</span>
        <span className="text-toxic-100/40 text-xs">{open ? 'Hide' : 'Reveal'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 animate-slide-up">
          <div className="grid grid-cols-2 gap-1.5">
            {symbols.map(([emoji, label, pays]) => (
              <div key={label} className="flex items-center gap-2 px-2 py-1.5 rounded bg-ink-700/50">
                <span className="text-xl">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-toxic-200 truncate">{label}</div>
                  <div className="text-[9px] font-mono text-toxic-100/40">{pays.join(' / ')} Puke Points</div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-toxic-900/40 pt-2 space-y-1.5">
            {specials.map(([emoji, label, desc]) => (
              <div key={label} className="flex items-start gap-2 px-1">
                <span className="text-lg shrink-0">{emoji}</span>
                <div>
                  <div className="text-[11px] text-radioactive-400 font-display font-bold">{label}</div>
                  <div className="text-[10px] text-toxic-100/50">{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-toxic-100/40 font-mono pt-1 border-t border-toxic-900/40">
            243 contamination veins • 3+ consecutive reels • only winning twists yield Puke Points + 1 XP per twist • ALL Puke Points seal in the vat
          </p>
        </div>
      )}
    </div>
  );
}

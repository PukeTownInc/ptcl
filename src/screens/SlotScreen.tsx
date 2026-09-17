import { useCallback, useEffect, useRef, useState } from 'react';
import { Lock, Tv, Zap, Package, RefreshCw, Layers, Play, X, Coins, Flame, Square, History, Timer } from 'lucide-react';
import type { GameState, SpinResult, SymbolId, WinLine } from '../types';
import { MIN_UNLOCK_PP, SYMBOLS, formatPP } from '../constants';
import * as engine from '../slotEngine';
import type { GameActions } from '../useGameState';
import { isHotStreakActive, isPotAccelActive } from '../useGameState';
import { useToast } from '../components/Toast';
import { AdModal } from '../components/AdModal';
import { SpinWheelModal, type WheelResult } from '../components/SpinWheelModal';
const REEL_DISPLAY = 3;
type ReelPhase = 'idle' | 'spinning' | 'stopped';
type SpinHistoryEntry =
  | { kind: 'spin'; pp: number; symbols: string[]; multiplied?: boolean; multiplier?: string | null }
  | { kind: 'double'; pp: number }
  | { kind: 'half'; pp: number }
  | { kind: 'safe'; pp: number }
  | { kind: 'lose'; pp: number }
  | { kind: 'forfeit'; pp: number };
const MAX_HISTORY = 20;
const PAYTABLE = Object.values(SYMBOLS)
  .filter(s => !s.special)
  .sort((a, b) => b.pays[2] - a.pays[2]);
function SpecialIcon({ symId, label }: { symId: SymbolId; label: string }) {
  const sym = SYMBOLS[symId];
  return (
    <span className="inline-flex items-center gap-1.5">
      {sym.image ? (
        <img 
          src={sym.image} 
          alt={label} 
          className="w-5 h-5 object-contain inline-block"
          style={{ background: 'transparent', boxShadow: 'none', border: 'none' }}
        />
      ) : (
        <span>{sym.emoji}</span>
      )}
      {label}
    </span>
  );
}
function HistorySymbolIcon({ symId }: { symId: SymbolId }) {
  const sym = SYMBOLS[symId];
  return (
    <span className="inline-flex items-center justify-center">
      {sym.image ? (
        <img 
          src={sym.image} 
          alt={symId} 
          className="w-5 h-5 object-contain"
          style={{ background: 'transparent', boxShadow: 'none', border: 'none' }}
        />
      ) : (
        <span className="text-lg">{sym.emoji}</span>
      )}
    </span>
  );
}
export function SlotScreen({ state, actions }: { state: GameState; actions: GameActions }) {
  const toast = useToast();
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
  const [showPaytable, setShowPaytable] = useState(false);
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
    if (!spinning || !lastResult || lastResult.wins.length === 0) return;
    setActiveWinIndex(0);
    if (lastResult.wins.length <= 1) return;
    const interval = setInterval(() => {
      setActiveWinIndex((i) => (i + 1) % lastResult!.wins.length);
    }, 900);
    return () => clearInterval(interval);
  }, [spinning, lastResult]);
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
      let finalPP = res.totalPP;
      const hadPotAccel = isPotAccelActive(state);
      const hadHotStreak = isHotStreakActive(state);
      if (hadPotAccel) finalPP *= 2;
      if (hadHotStreak) finalPP = Math.floor(finalPP * 1.5);
      const posSet = new Set<string>();
      res.wins.forEach((w) => w.positions.forEach(([r, row]) => posSet.add(`${r}-${row}`)));
      res.jackpot && res.grid.forEach((col, r) => col.forEach((s, row) => s === 'jackpot' && posSet.add(`${r}-${row}`)));
      setWinPositions(posSet);
      setWinPP(finalPP);
      const eligibleDoubleUp = finalPP >= 10;
      if (finalPP > 0) {
        if (eligibleDoubleUp) {
          doubleUpResolvedRef.current = false;
          actions.setDoubleUpPending(finalPP);
          setShowDoubleUp(true);
        } else {
          actions.addPP(finalPP);
        }
      }
      actions.addXP(1, false);
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
        ? [...new Set(res.wins.map((w) => w.symbols[0]))]
        : [];
      setSpinHistory((prev) => [{
        kind: 'spin',
        pp: finalPP,
        symbols: winSymbols,
        multiplied: hadPotAccel || hadHotStreak,
        multiplier: hadPotAccel ? 'x2' : hadHotStreak ? 'x1.5' : null,
      }, ...prev].slice(0, MAX_HISTORY));
    }
  }, [spinning, state.spinsRemaining, freeSpinsLeft, actions, toast]);
  const handleWheelResult = useCallback((result: WheelResult) => {
    if (doubleUpResolvedRef.current) return;
    doubleUpResolvedRef.current = true;
    setShowDoubleUp(false);
    actions.useDoubleUp();
    if (result.outcome === 'double') {
      actions.addPP(result.amount);
      toast('success', '☢️ DOUBLED!', `+${formatPP(result.amount)} Puke Points (x2 stake)`);
      setSpinHistory((prev) => [{ kind: 'double', pp: result.amount }, ...prev].slice(0, MAX_HISTORY));
    } 
    else if (result.outcome === 'safe') {
      actions.addPP(result.amount);
      toast('success', '🛡️ SECURED', `+${formatPP(result.amount)} Puke Points (x1 stake)`);
      setSpinHistory((prev) => [{ kind: 'safe', pp: result.amount }, ...prev].slice(0, MAX_HISTORY));
    } 
    else if (result.outcome === 'half') {
      actions.addPP(result.amount);
      toast('info', '⚠️ HALVED', `+${formatPP(result.amount)} Puke Points (0.5× stake)`);
      setSpinHistory((prev) => [{ kind: 'half', pp: result.amount }, ...prev].slice(0, MAX_HISTORY));
    } 
    else if (result.outcome === 'lose') {
      setWinPP(0);
      toast('error', '☠️ SPILLED!', 'Stake lost — nothing returned');
      setSpinHistory((prev) => [{ kind: 'lose', pp: 0 }, ...prev].slice(0, MAX_HISTORY));
    }
  }, [actions, toast]);
  const handleForfeit = useCallback(() => {
    if (doubleUpResolvedRef.current) return;
    doubleUpResolvedRef.current = true;
    setShowDoubleUp(false);
    actions.useDoubleUp();
    toast('info', '☣️ FORFEITED', 'Stake lost — nothing returned');
    setSpinHistory((prev) => [{ kind: 'forfeit', pp: 0 }, ...prev].slice(0, MAX_HISTORY));
  }, [actions, toast]);
  const handleMysteryPack = () => {
    if (state.spinsRemaining > 0) {
      toast('info', 'TWISTS STILL AVAILABLE', 'Mystery Goop Vat only empty when contaminated');
      return;
    }
    setAdModal({
      title: 'Mystery Goop Vat',
      subtitle: 'Absorb radiation to crack open a random sludge barrel',
      reward: '+15 to +25 Toxic Twists',
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
      toast('info', '☢️ ALREADY ACTIVE', 'Sludge fill rate doubled right now!');
      return;
    }
    setAdModal({
      title: 'Sludge Accelerator',
      subtitle: 'Absorb radiation — fill vat TWICE as fast for 5 minutes',
      reward: 'x2 Flow • 5 Minutes',
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
      {/* Bonus Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <BonusBtn
          icon={<Package size={16} />}
          label="Mystery Goop Vat"
          sub="15-25 Twists • only when empty"
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
          disabled={state.dailyPotAccel >= 2 || spinning}
        />
      </div>
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
          {isPotAccelActive(state) && potAccelCountdown && (
            <span className="px-2 py-1 rounded-full bg-radioactive-500/15 border border-radioactive-600/30 text-radioactive-400 text-[10px] font-display font-bold flex items-center gap-1">
              <Timer size={10} /> VAT FLOW x2 • {potAccelCountdown}
            </span>
          )}
        </div>
      )}
      {/* ============================================== */}
      {/* Puke Town Cash Lab — REELS MUCH LOWER          */}
      {/* ============================================== */}
      <div 
        className="relative w-full mx-auto"
        style={{ 
          maxWidth: '480px',
          aspectRatio: '3 / 4',
        }}
      >
        {/* REELS — moved much lower */}
        <div 
          className="absolute z-10"
          style={{
            top: '35.5%',
            bottom: '2.0%',
            left: '7.8%',
            right: '7.8%',
          }}
        >
          <div ref={reelsRef} className="grid grid-cols-5 gap-1.5 h-full">
            {grid.map((reel, ri) => {
              const phase = reelPhases[ri];
              const displayReel = phase === 'spinning' ? (cyclingSymbols[ri] ?? reel) : reel;
              return (
                <div 
                  key={ri} 
                  className={`relative overflow-hidden rounded-sm ${
                    phase === 'spinning' ? 'reel-spinning' : ''
                  } ${phase === 'stopped' ? 'reel-stopped' : ''}`}
                  style={{ backgroundColor: 'transparent' }}
                >
                  {displayReel.map((symId, row) => {
                    const isWin = winPositions.has(`${ri}-${row}`);
                    const sym = SYMBOLS[symId];
                    return (
                      <div key={row} className="aspect-square flex items-center justify-center">
                        <span 
                          className={isWin ? 'win-symbol-pop' : ''}
                          style={{ 
                            filter: isWin ? 'drop-shadow(0 0 8px #39ff14)' : 'none'
                          }}
                        >
                          {sym.image ? (
                            <img 
                              src={sym.image} 
                              alt={sym.label} 
                              className="w-full h-full object-contain p-0.5"
                              style={{ background: 'transparent' }}
                            />
                          ) : (
                            <span className="text-xl">{sym.emoji}</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        {/* FRAME — on TOP, full size */}
        <img
          src="/reel-box.png"
          alt="Puke Town Cash Lab"
          className="absolute inset-0 w-full h-full z-20"
          style={{ pointerEvents: 'none' }}
        />
      </div>
      {/* Info Text & Controls — below frame, unchanged */}
      <div className="max-w-lg mx-auto space-y-3 px-2">
        <div className="min-h-[50px] flex items-center justify-center text-center">
          {spinning ? (
            <div>
              <RefreshCw size={22} className="text-toxic-400/70 animate-spin mx-auto" />
              <div className="font-display text-xs text-toxic-300/50 mt-1.5 tracking-[0.3em] animate-pulse">CONTAMINATING</div>
            </div>
          ) : winPP > 0 ? (
            <div className="animate-pop">
              <div className="font-display font-black text-2xl text-toxic-400 neon-text">+{formatPP(winPP)} Puke Points</div>
              {lastResult && lastResult.wins.length > 0 && (
                <div className="text-[10px] text-toxic-100/50 font-mono mt-1">
                  {lastResult.wins.length} way{lastResult.wins.length > 1 ? 's' : ''} • {lastResult.wins.map((w) => SYMBOLS[w.symbols[0]].label).join(', ')}
                </div>
              )}
            </div>
          ) : (
            <div className="text-toxic-100/30">
              <div className="font-display text-sm">Contaminate the reels for Puke Points</div>
              <div className="text-[10px] font-mono">243 veins • match 3+ • win goops + +1 XP per twist</div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center">
          <span className="font-display font-bold text-sm text-toxic-300">
            Toxic Twists: <span className="text-toxic-400 neon-text tabular-nums">{state.spinsRemaining + freeSpinsLeft}</span>
          </span>
        </div>
        <button
          onClick={doSpin}
          disabled={!canSpin || spinning}
          className="toxic-btn w-full py-4 text-lg

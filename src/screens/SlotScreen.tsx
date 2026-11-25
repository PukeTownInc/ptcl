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
  const currentSpinUsesFreeSpinRef = useRef(false);
  const spinHistory = state.slotHistory ?? [];
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
  const [potAccelCountdown, setPotAccelCountdown] = useState('');
  const [showPaytable, setShowPaytable] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
    const useFreeSpin = state.spinsRemaining > 0;
    if (!useFreeSpin && state.lockedPotPP < state.slotBet) {
      toast('error', 'Insufficient Puke Points', 'You need more locked Puke Points or a free spin.');
      return;
    }
    currentSpinUsesFreeSpinRef.current = useFreeSpin;
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
      let finalPP = res.totalPP * state.slotBet;
      const hadPotAccel = isPotAccelActive(state);
      const hadHotStreak = isHotStreakActive(state);
      if (hadPotAccel) finalPP *= 2;
      if (hadHotStreak) finalPP = Math.floor(finalPP * 1.5);
      finalPP = Math.floor(finalPP);
      const posSet = new Set<string>();
      res.wins.forEach((w) => w.positions.forEach(([r, row]) => posSet.add(`${r}-${row}`)));
      res.jackpot && res.grid.forEach((col, r) => col.forEach((s, row) => s === 'jackpot' && posSet.add(`${r}-${row}`)));
      setWinPositions(posSet);
      setWinPP(finalPP);
      const eligibleDoubleUp = finalPP >= 10;
      const winSymbols = res.wins.length > 0
        ? [...new Set(res.wins.map((w) => w.symbols[0]))]
        : [];
      const historyEntry = {
        id: `slot-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
        kind: 'spin' as const,
        pp: finalPP,
        symbols: winSymbols,
        multiplied: hadPotAccel || hadHotStreak,
        multiplier: hadPotAccel ? 'x2' : hadHotStreak ? 'x1.5' : null,
      };
      const accepted = actions.settleSlotSpin(
        state.slotBet,
        eligibleDoubleUp ? 0 : finalPP,
        currentSpinUsesFreeSpinRef.current,
        historyEntry,
        !!res.jackpot,
      );
      if (!accepted) {
        toast('error', 'Spin not completed', 'Your balance or free-spin count changed. Please try again.');
        return;
      }
      if (eligibleDoubleUp) {
        doubleUpResolvedRef.current = false;
        actions.setDoubleUpPending(finalPP);
        setShowDoubleUp(true);
      }
      if (res.freeSpinsAwarded > 0) {
        actions.addSpins(res.freeSpinsAwarded);
        toast('success', `${res.freeSpinsAwarded} Toxic Twists!`, 'Contamination scatter triggered ☢️');
      }
      if (res.jackpot) {
        setShowJackpot(res.jackpot.type);
        setTimeout(() => setShowJackpot(null), 3000);
      }
      if (autoSpinRef.current) {
        const remaining = Math.max(0, state.slotAutoCount - 1);
        actions.setSlotPreferences(state.slotBet, remaining);
        if (remaining === 0) {
          autoSpinRef.current = false;
          setAutoSpin(false);
          toast('info', 'Auto-spin complete', 'Your queued spins have finished.');
        }
      }
    }
  }, [spinning, state.spinsRemaining, state.lockedPotPP, state.slotBet, state.slotAutoCount, actions, toast]);

  const handleWheelResult = useCallback((result: WheelResult) => {
    if (doubleUpResolvedRef.current) return;
    doubleUpResolvedRef.current = true;
    setShowDoubleUp(false);
    actions.useDoubleUp();
    if (result.outcome === 'double') {
      actions.addPP(result.amount);
      toast('success', '☢️ DOUBLED!', `+${formatPP(result.amount)} Puke Points (x2 stake)`);
      actions.recordSlotHistory({ id: `slot-${Date.now()}-double`, timestamp: Date.now(), kind: 'double', pp: result.amount });
    }
    else if (result.outcome === 'safe') {
      actions.addPP(result.amount);
      toast('success', '🛡️ SECURED', `+${formatPP(result.amount)} Puke Points (x1 stake)`);
      actions.recordSlotHistory({ id: `slot-${Date.now()}-safe`, timestamp: Date.now(), kind: 'safe', pp: result.amount });
    }
    else if (result.outcome === 'half') {
      actions.addPP(result.amount);
      toast('info', '⚠️ HALVED', `+${formatPP(result.amount)} Puke Points (0.5× stake)`);
      actions.recordSlotHistory({ id: `slot-${Date.now()}-half`, timestamp: Date.now(), kind: 'half', pp: result.amount });
    }
    else if (result.outcome === 'lose') {
      setWinPP(0);
      toast('error', '☠️ SPILLED!', 'Stake lost — nothing returned');
      actions.recordSlotHistory({ id: `slot-${Date.now()}-lose`, timestamp: Date.now(), kind: 'lose', pp: 0 });
    }
  }, [actions, toast]);

  const handleForfeit = useCallback(() => {
    if (doubleUpResolvedRef.current) return;
    doubleUpResolvedRef.current = true;
    setShowDoubleUp(false);
    actions.useDoubleUp();
    toast('info', '☣️ FORFEITED', 'Stake lost — nothing returned');
    actions.recordSlotHistory({ id: `slot-${Date.now()}-forfeit`, timestamp: Date.now(), kind: 'forfeit', pp: 0 });
  }, [actions, toast]);

  const handleMysteryPack = () => {
    setAdModal({
      title: 'Mystery Goop Vat',
      subtitle: 'Absorb radiation to crack open a random sludge barrel',
      reward: '+15 to +25 Toxic Twists',
      onComplete: () => {
        const got = actions.openMysteryPack();
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
        toast('success', '☢️ ACCELERATOR ACTIVE', 'Sludge flowing at x2 speed!');
      },
    });
  };

  const canSpin = state.spinsRemaining > 0 || state.lockedPotPP >= state.slotBet;

  const toggleAutoSpin = useCallback(() => {
    setAutoSpin((prev) => {
      const next = !prev;
      autoSpinRef.current = next;
      if (next && state.slotAutoCount <= 0) actions.setSlotPreferences(state.slotBet, 10);
      return next;
    });
  }, [state.slotAutoCount, state.slotBet, actions]);

  useEffect(() => {
    if (!autoSpin) return;
    if (spinning || showDoubleUp || showJackpot || adModal) return;
    if (state.spinsRemaining <= 0 && state.lockedPotPP < state.slotBet) {
      setAutoSpin(false);
      autoSpinRef.current = false;
      toast('info', 'OUT OF GOOPS', 'Auto-contamination halted — get more Twists to continue');
      return;
    }
    const t = setTimeout(() => {
      if (autoSpinRef.current) doSpin();
    }, 600);
    return () => clearTimeout(t);
  }, [autoSpin, spinning, showDoubleUp, showJackpot, adModal, state.spinsRemaining, state.lockedPotPP, state.slotBet, state.slotAutoCount, doSpin, toast]);

  return (
    <div className="space-y-4">
      {/* Bonus Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <BonusBtn
          icon={<Package size={16} />}
          label="Watch Ad for Spins"
          sub="15–25 spins • timed placeholder"
          ad
          onClick={handleMysteryPack}
          disabled={spinning}
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

      {(isHotStreakActive(state) || isPotAccelActive(state)) && (
        <div className="flex flex-wrap gap-2">
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

      {/* REEL BOX */}
      <div
        className="relative w-full mx-auto"
        style={{
          maxWidth: '480px',
          aspectRatio: '433 / 577',
        }}
      >
        <div
          className="absolute z-10"
          style={{
            top: '40%',
            bottom: '8%',
            left: '10.5%',
            right: '10.5%',
          }}
        >
          <div ref={reelsRef} className="grid grid-cols-5 gap-0 h-full">
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
                      <div key={row} className="aspect-square flex items-center justify-center p-2">
                        <span
                          className={isWin ? 'win-symbol-pop' : ''}
                          style={{
                            filter: isWin ? 'drop-shadow(0 0 8px #39ff14)' : 'none',
                            display: 'block',
                            width: '100%',
                            height: '100%'
                          }}
                        >
                          {sym.image ? (
                            <img
                              src={sym.image}
                              alt={sym.label}
                              className="w-full h-full object-contain"
                              style={{ background: 'transparent', display: 'block' }}
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
        <img
          src="/reel-box.png"
          alt="Puke Town Cash Lab"
          className="absolute inset-0 w-full h-full z-20"
          style={{ pointerEvents: 'none' }}
        />
      </div>

      <div className="max-w-lg mx-auto px-2 grid grid-cols-2 gap-2">
        <div className="ghost-btn p-2.5 flex items-center justify-between gap-2">
          <button type="button" aria-label="Decrease bet" onClick={() => actions.setSlotPreferences(Math.max(1, state.slotBet - 5), state.slotAutoCount)} className="rounded border border-toxic-500/50 px-2 py-1 text-toxic-300">−</button>
          <span className="font-mono text-xs text-toxic-200">BET <b className="text-white">{state.slotBet}</b></span>
          <button type="button" aria-label="Increase bet" onClick={() => actions.setSlotPreferences(Math.min(1000, state.slotBet + 5), state.slotAutoCount)} className="rounded border border-toxic-500/50 px-2 py-1 text-toxic-300">+</button>
        </div>
        <div className="ghost-btn p-2.5 flex items-center justify-between gap-2">
          <button type="button" aria-label="Decrease auto spins" onClick={() => actions.setSlotPreferences(state.slotBet, Math.max(1, state.slotAutoCount - 1))} className="rounded border border-toxic-500/50 px-2 py-1 text-toxic-300">−</button>
          <span className="font-mono text-xs text-toxic-200">AUTO <b className="text-white">{state.slotAutoCount}</b></span>
          <button type="button" aria-label="Increase auto spins" onClick={() => actions.setSlotPreferences(state.slotBet, Math.min(100, state.slotAutoCount + 1))} className="rounded border border-toxic-500/50 px-2 py-1 text-toxic-300">+</button>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={actions.claimDailyBonusSpins} disabled={state.freeSpinsClaimed}
          className="ghost-btn p-2.5 text-xs font-display font-bold text-toxic-300 disabled:opacity-40">
          {state.freeSpinsClaimed ? 'DAILY SPINS CLAIMED' : 'CLAIM DAILY SPINS'}
        </button>

      </div>

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
            Toxic Twists: <span className="text-toxic-400 neon-text tabular-nums">{state.spinsRemaining}</span>
          </span>
        </div>

        <button
          onClick={doSpin}
          disabled={!canSpin || spinning}
          className="toxic-btn w-full py-4 text-lg flex items-center justify-center gap-2"
        >
          {spinning ? (
            <><RefreshCw size={22} className="animate-spin" /> CONTAMINATING...</>
          ) : (
            <><Play size={22} /> CONTAMINATE</>
          )}
        </button>

        <button
          onClick={toggleAutoSpin}
          className={`w-full py-2.5 rounded-lg font-display font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all ${
            autoSpin
              ? 'bg-toxic-500/20 border border-toxic-400 text-toxic-400'
              : 'bg-ink-700/50 border border-toxic-900/40 text-toxic-100/40'
          }`}
          style={autoSpin ? { boxShadow: '0 0 14px #39ff1455' } : undefined}
        >
          {autoSpin ? <><Square size={16} /> HALT CONTAMINATION</> : <><Zap size={16} /> AUTO-CONTAMINATE</>}
        </button>
      </div>

      <div className="max-w-lg mx-auto grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setShowHistory(true)}
          className="min-h-[88px] rounded-xl border border-toxic-400/90 bg-gradient-to-b from-toxic-800 via-toxic-900 to-ink-900 text-toxic-100 font-display font-black uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
          style={{ boxShadow: '0 0 14px #39ff1455, inset 0 1px 0 #baff9a55' }}>
          <History size={20} className="text-toxic-300" />
          <span className="text-sm">Spin History</span>
          <span className="text-[9px] text-toxic-100/70 tracking-wide">VIEW RECENT SPINS</span>
        </button>
        <button type="button" onClick={() => setShowPaytable(true)}
          className="min-h-[88px] rounded-xl border border-toxic-400/90 bg-gradient-to-b from-toxic-800 via-toxic-900 to-ink-900 text-toxic-100 font-display font-black uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
          style={{ boxShadow: '0 0 14px #39ff1455, inset 0 1px 0 #baff9a55' }}>
          <Layers size={20} className="text-toxic-300" />
          <span className="text-sm">Paytable</span>
          <span className="text-[9px] text-toxic-100/70 tracking-wide">SYMBOLS &amp; PAYOUTS</span>
        </button>
      </div>

      {showHistory && (
        <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setShowHistory(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="spin-history-title" className="w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-xl border border-toxic-400 bg-ink-900 p-3" style={{ boxShadow: '0 0 28px #39ff1466' }} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 px-1 pb-3">
              <h2 id="spin-history-title" className="font-display font-black text-toxic-300 text-base flex items-center gap-2"><History size={18} /> SPIN HISTORY</h2>
              <button type="button" onClick={() => setShowHistory(false)} aria-label="Close spin history" className="rounded-lg border border-toxic-700 px-3 py-1.5 text-toxic-200 text-xs font-bold">CLOSE</button>
            </div>
            <SpinHistory entries={spinHistory} />
          </section>
        </div>
      )}

      {showPaytable && (
        <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setShowPaytable(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="slot-paytable-title" className="w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-xl border border-toxic-400 bg-ink-900 p-3" style={{ boxShadow: '0 0 28px #39ff1466' }} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 px-1 pb-3">
              <h2 id="slot-paytable-title" className="font-display font-black text-toxic-300 text-base flex items-center gap-2"><Layers size={18} /> ☢️ PAYTABLE</h2>
              <button type="button" onClick={() => setShowPaytable(false)} aria-label="Close paytable" className="rounded-lg border border-toxic-700 px-3 py-1.5 text-toxic-200 text-xs font-bold">CLOSE</button>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-mono text-toxic-100/50">Highest five-symbol payout first. Values are Puke Points per bet unit.</p>
              <div className="grid grid-cols-12 gap-2 text-[9px] font-mono text-toxic-100/50 border-b border-toxic-900/40 pb-2">
                <span className="col-span-5">SYMBOL</span><span className="col-span-2 text-center">3 MATCH</span><span className="col-span-2 text-center">4 MATCH</span><span className="col-span-3 text-center">5 MATCH</span>
              </div>
              {PAYTABLE.map((sym) => (
                <div key={sym.id} className="grid grid-cols-12 gap-2 items-center px-1 py-2 rounded bg-ink-700/40">
                  <span className="col-span-5 min-w-0 font-mono text-[11px] flex items-center gap-1.5">
                    {sym.image ? <img src={sym.image} alt={sym.label} className="w-7 h-7 object-contain shrink-0" style={{ background: 'transparent' }} /> : sym.emoji}
                    <span className="truncate">{sym.label}</span>
                  </span>
                  <span className="col-span-2 text-center font-mono text-toxic-200 text-xs">{sym.pays[0]}</span>
                  <span className="col-span-2 text-center font-mono text-toxic-300 text-xs">{sym.pays[1]}</span>
                  <span className="col-span-3 text-center font-mono text-toxic-400 font-bold text-xs">{sym.pays[2]}</span>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-toxic-900/40 text-[10px] font-mono text-toxic-100/60 space-y-2 px-1">
                <div><SpecialIcon symId="wild" label="= substitutes for any symbol" /></div>
                <div><SpecialIcon symId="scatter" label="= Free Toxic Twists" /></div>
                <div><SpecialIcon symId="hazard" label="= Mystery Goop" /></div>
                <div><SpecialIcon symId="jackpot" label="= Instant Puke Points!" /></div>
              </div>
            </div>
          </section>
        </div>
      )}

      {showDoubleUp && state.doubleUpPending && (
        <SpinWheelModal
          stake={state.doubleUpPending}
          onWatchAd={() => {
            setAdModal({
              title: 'Absorb Radiation',
              subtitle: 'Watch ad to claim your Risk Wheel reward',
              reward: 'Claim Puke Points',
              onComplete: () => setAdModal(null),
            });
          }}
          onClaim={handleWheelResult}
          onLose={() => { setShowDoubleUp(false); handleWheelResult({ outcome: 'lose', amount: 0 }); }}
          onForfeit={handleForfeit}
        />
      )}

      <AdModal
        open={!!adModal}
        onClose={() => setAdModal(null)}
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

function BonusBtn({ icon, label, sub, ad, onClick, disabled }: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  ad?: boolean;
  onClick: () => void;
  disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} className="ghost-btn p-2.5 text-left disabled:opacity-30">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-toxic-400">{icon}</span>
        <span className="font-display font-bold text-xs text-toxic-200">{label}</span>
      </div>
      <div className="text-[10px] text-toxic-100/40 font-mono">{sub}</div>
      {ad && <div className="ad-badge mt-1.5"><Tv size={8} /> Absorb Radiation</div>}
    </button>
  );
}

function SpinHistory({ entries }: { entries: any[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="grunge-panel overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-toxic-500/5">
        <span className="font-display font-bold text-sm text-toxic-300 flex items-center gap-2"><History size={16} /> Contamination Log</span>
        <span className="text-toxic-100/40 text-xs">{open ? 'Hide' : 'Reveal'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1 max-h-64 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="text-[11px] text-toxic-100/30 font-mono text-center py-4">No contamination yet — start the infection!</p>
          ) : (
            entries.map((entry, i) => {
              if (entry.kind === 'spin') {
                return (
                  <div key={i} className={`flex items-center justify-between px-2 py-1.5 rounded ${entry.multiplied ? 'bg-radioactive-500/10 border border-radioactive-600/30' : 'bg-ink-700/40'}`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-mono text-toxic-100/30 shrink-0">#{entries.length - i}</span>
                      {entry.pp > 0 && entry.symbols.length > 0 ? (
                        <span className="flex items-center gap-1">
                          {entry.symbols.map((symId: string, idx: number) => (
                            <HistorySymbolIcon key={idx} symId={symId as SymbolId} />
                          ))}
                          {entry.multiplied && entry.multiplier && (
                            <span className="text-radioactive-400 text-[10px] font-bold font-mono px-1 py-0.5 rounded bg-radioactive-500/15 border border-radioactive-600/30">
                              ☢️ {entry.multiplier}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-toxic-100/30">No contamination</span>
                      )}
                    </div>
                    <span className={`font-mono text-sm tabular-nums ${entry.multiplied ? 'text-radioactive-400 font-bold' : 'text-toxic-300'}`}>+{formatPP(entry.pp)}</span>
                  </div>
                );
              } else if (entry.kind === 'double') {
                return (
                  <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-toxic-500/10 border border-toxic-500/30">
                    <span className="text-sm font-mono text-toxic-400">☢️ DOUBLED!</span>
                    <span className="font-mono text-sm text-toxic-400 font-bold tabular-nums">+{formatPP(entry.pp)}</span>
                  </div>
                );
              } else if (entry.kind === 'half') {
                return (
                  <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-hazard-amber/10 border border-hazard-amber/30">
                    <span className="text-sm font-mono text-hazard-amber">⚠️ HALVED</span>
                    <span className="font-mono text-sm text-hazard-amber tabular-nums">+{formatPP(entry.pp)}</span>
                  </div>
                );
              } else if (entry.kind === 'safe') {
                return (
                  <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-radioactive-500/10 border border-radioactive-600/30">
                    <span className="text-sm font-mono text-radioactive-400">☣️ SECURED</span>
                    <span className="font-mono text-sm text-radioactive-400 tabular-nums">+{formatPP(entry.pp)}</span>
                  </div>
                );
              } else if (entry.kind === 'forfeit') {
                return (
                  <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-red-900/20 border border-red-800/30">
                    <span className="text-sm font-mono text-red-400">☣️ FORFEITED</span>
                    <span className="font-mono text-sm text-red-400">— 0 —</span>
                  </div>
                );
              } else {
                return (
                  <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-red-900/20 border border-red-800/30">
                    <span className="text-sm font-mono text-red-400">☠️ SPILLED</span>
                    <span className="font-mono text-sm text-red-400">— 0 —</span>
                  </div>
                );
              }
            })
          )}
        </div>
      )}
    </div>
  );
}

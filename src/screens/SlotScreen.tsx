import { useCallback, useEffect, useRef, useState } from 'react';
import { Layers, History } from 'lucide-react';
import type { GameState, Screen, SpinResult, SymbolId } from '../types';
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

export function SlotScreen({ state, actions }: { state: GameState; actions: GameActions; onNavigate?: (screen: Screen) => void }) {
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
  const [turbo, setTurbo] = useState(false);

  useEffect(() => {
    return () => {
      if (cycleInterval.current) clearInterval(cycleInterval.current);
      stopTimers.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (state.doubleUpPending && !doubleUpResolvedRef.current) setShowDoubleUp(true);
  }, [state.doubleUpPending]);

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

  const doSpin = useCallback(() => {
    if (spinning) return;
    const useFreeSpin = state.spinsRemaining > 0;
    if (!useFreeSpin && state.lockedPotPP < state.slotBet) {
      toast('error', 'Insufficient Puke Points', 'You need more locked Puke Points or a free spin.');
      return;
    }
    currentSpinUsesFreeSpinRef.current = useFreeSpin;
    stopTimers.current.forEach(clearTimeout);
    stopTimers.current = [];
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
    const baseDelay = turbo ? 420 : 1000;
    const stagger = turbo ? 150 : 320;
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
          const finishTimer = setTimeout(() => finishSpin(result), 500);
          stopTimers.current.push(finishTimer);
        }
      }, baseDelay + r * stagger);
      stopTimers.current.push(t);
    }
    function finishSpin(res: SpinResult) {
      setSpinning(false);
      setReelPhases(['idle', 'idle', 'idle', 'idle', 'idle']);
      setLastResult(res);
      let finalPP = res.wins.reduce((sum, win) => sum + win.pp, 0) * state.slotBet;
      if (res.bonusAwarded !== null) finalPP += res.bonusIsMultiplier ? res.bonusAwarded * state.slotBet : res.bonusAwarded;
      if (res.jackpot) finalPP += res.jackpot.amount;
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
  }, [spinning, state.spinsRemaining, state.lockedPotPP, state.slotBet, state.slotAutoCount, actions, toast, turbo]);

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

  const canSpin = state.spinsRemaining > 0 || state.lockedPotPP >= state.slotBet;

  const toggleAutoSpin = useCallback(() => {
    if (autoSpin) {
      autoSpinRef.current = false;
      setAutoSpin(false);
      return;
    }
    if (state.slotAutoCount <= 0) actions.setSlotPreferences(state.slotBet, 10);
    autoSpinRef.current = true;
    setAutoSpin(true);
  }, [autoSpin, state.slotAutoCount, state.slotBet, actions]);

  useEffect(() => {
    if (!autoSpin) return;
    if (spinning || showDoubleUp || showJackpot || adModal) return;
    if (state.slotAutoCount <= 0) {
      setAutoSpin(false);
      autoSpinRef.current = false;
      toast('info', 'Auto-spin complete', 'Your queued spins have finished.');
      return;
    }
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
    <div className="w-full px-1">
      <div className="relative mx-auto w-full overflow-hidden bg-[#020503] shadow-[0_0_40px_#000]" style={{ maxWidth: '941px', aspectRatio: '941 / 1672', lineHeight: 0 }} aria-label="Puke Town Cash Lab slot machine">
        <img src="/slots/cash-lab-final-art.png" alt="Puke Town Cash Lab final toxic neon slot machine artwork" className="absolute inset-0 h-full w-full select-none" style={{ objectFit: 'fill', pointerEvents: 'none' }} draggable={false} />
        <div className="absolute z-[3] grid h-[19.8%] grid-cols-5 gap-[1.15%] rounded-lg p-[0.65%]" style={{ left: '10.2%', top: '42.8%', width: '79.7%', pointerEvents: 'none' }} aria-hidden="true">
          {grid.map((reel, ri) => {
            const phase = reelPhases[ri];
            const displayReel = phase === 'spinning' ? (cyclingSymbols[ri] ?? reel) : reel;
            return <div key={ri} className={`grid min-w-0 grid-rows-3 gap-[3.5%] overflow-hidden rounded-md border border-[#a6ff3b88] bg-gradient-to-r from-[#071006d9] via-[#071006ad] to-[#071006d9] p-[2%] shadow-[inset_0_0_13px_#8cff2633,0_0_7px_#8cff2620] ${phase === 'spinning' ? 'animate-pulse' : ''}`}>
              {displayReel.map((symId, row) => {
                const sym = SYMBOLS[symId];
                const isWin = winPositions.has(`${ri}-${row}`);
                return <div key={row} className={`flex min-h-0 items-center justify-center overflow-hidden rounded border bg-gradient-to-br from-[#1a2b10d9] via-[#020603e8] to-[#17270cdd] ${isWin ? 'border-[#f5ff68] shadow-[inset_0_0_16px_#91ff4b,0_0_14px_#d7ff37]' : 'border-[#b6ff4350]'}`}>
                  {sym.image ? <img src={sym.image} alt="" className="h-full w-full object-contain" /> : <span className="text-2xl">{sym.emoji}</span>}
                </div>;
              })}
            </div>;
          })}
        </div>
        <div className="absolute z-[7] flex items-center justify-center rounded-md border border-[#a6ff3b] bg-gradient-to-r from-[#061006ee] via-[#183600ee] to-[#061006ee] font-black text-[#efff70] shadow-[0_0_12px_#8cff3b88,inset_0_0_9px_#9dff3744] [text-shadow:0_0_9px_#eaff43]" style={{ left: '34%', top: '31%', width: '32%', height: '5.3%', fontSize: 'clamp(13px,3.1vw,27px)' }}>{formatPP(state.lockedPotPP)} PP</div>
        <div className="absolute z-[7] flex items-center justify-center font-black text-white [text-shadow:0_0_8px_#fff]" style={{ left: '17%', top: '66.6%', width: '12%', height: '2.5%', fontSize: 'clamp(12px,2.3vw,22px)' }}>{state.slotBet}</div>
        <div className="absolute z-[7] flex items-center justify-center font-black text-white [text-shadow:0_0_8px_#fff]" style={{ left: '72%', top: '66.6%', width: '9%', height: '2.5%', fontSize: 'clamp(12px,2.3vw,22px)' }}>{state.slotAutoCount}</div>
        <div className="absolute z-[9] flex items-center justify-center bg-[#020503f7] font-black text-white [text-shadow:0_0_7px_#fff]" style={{ left: '64.2%', top: '83.35%', width: '8%', height: '2.55%', fontSize: 'clamp(14px,2.5vw,24px)' }}>{state.spinsRemaining}</div>
        <button type="button" aria-label="Watch a rewarded advert for free spins" onClick={() => toast('info', 'Rewarded ads not connected', 'Free spins will be enabled when a verified advert provider is integrated.')} disabled={spinning} className="absolute z-[8] rounded-lg border border-[#d14cff] bg-gradient-to-br from-[#260044] via-[#6500a5] to-[#1b0032] p-1 text-center font-black leading-tight text-white shadow-[inset_0_0_10px_#a900ff,0_0_8px_#c100ff65] disabled:opacity-50" style={{ left: '5.1%', top: '65.05%', width: '28.1%', height: '7.9%', fontSize: 'clamp(10px,2.2vw,17px)' }}>▶ WATCH AD<br/>GET 15–25 SPINS</button>
        <button type="button" aria-pressed={autoSpin} onClick={toggleAutoSpin} disabled={spinning} className={`absolute z-[8] rounded-lg border p-1 text-center font-black leading-tight disabled:opacity-50 ${autoSpin ? 'border-[#eaffcf] bg-[#396f08] text-white' : 'border-[#8bff2d] bg-gradient-to-br from-[#102500] via-[#2b6500] to-[#0a1900] text-[#eaffcf]'}`} style={{ left: '66%', top: '65.05%', width: '28.1%', height: '7.9%', fontSize: 'clamp(10px,2.2vw,17px)' }}>AUTO SPIN: {autoSpin ? 'ON' : 'OFF'}</button>
        <button type="button" aria-label="Decrease bet" disabled={spinning || state.slotBet <= 1} onClick={() => actions.setSlotPreferences(Math.max(1, state.slotBet - 5), state.slotAutoCount)} className="absolute z-10 rounded-lg bg-transparent active:bg-lime-300/20" style={{ left: '11.7%', top: '65.7%', width: '6.4%', height: '3.4%' }} />
        <button type="button" aria-label="Increase bet" disabled={spinning || state.slotBet >= 1000} onClick={() => actions.setSlotPreferences(Math.min(1000, state.slotBet + 5), state.slotAutoCount)} className="absolute z-10 rounded-lg bg-transparent active:bg-lime-300/20" style={{ left: '26.9%', top: '65.7%', width: '6.4%', height: '3.4%' }} />
        <button type="button" aria-label={spinning ? 'Reels spinning' : 'Spin reels'} disabled={!canSpin || spinning} onClick={doSpin} className="absolute z-10 rounded-lg bg-transparent active:bg-lime-300/20 disabled:cursor-not-allowed" style={{ left: '36%', top: '64.5%', width: '28%', height: '10.8%' }} />
        <button type="button" aria-label="Decrease auto spins" disabled={spinning || state.slotAutoCount <= 0} onClick={() => actions.setSlotPreferences(state.slotBet, Math.max(0, state.slotAutoCount - 1))} className="absolute z-10 rounded-lg bg-transparent active:bg-lime-300/20" style={{ left: '67.5%', top: '65.7%', width: '6.4%', height: '3.4%' }} />
        <button type="button" aria-label="Increase auto spins" disabled={spinning || state.slotAutoCount >= 100} onClick={() => actions.setSlotPreferences(state.slotBet, Math.min(100, state.slotAutoCount + 1))} className="absolute z-10 rounded-lg bg-transparent active:bg-lime-300/20" style={{ left: '83.2%', top: '65.7%', width: '6.4%', height: '3.4%' }} />
        <button type="button" aria-label={turbo ? 'Disable turbo mode' : 'Enable turbo mode'} aria-pressed={turbo} onClick={() => setTurbo(v => !v)} className="absolute z-10 rounded-lg bg-transparent active:bg-lime-300/20" style={{ left: '70.3%', top: '69.3%', width: '19%', height: '3.2%' }} />
        <button type="button" aria-label="Use a free spin" disabled={!canSpin || spinning} onClick={doSpin} className="absolute z-10 rounded-lg bg-transparent active:bg-lime-300/20 disabled:cursor-not-allowed" style={{ left: '57%', top: '90.8%', width: '17%', height: '3.2%' }} />
        <button type="button" aria-label="Claim daily spin reward" disabled={state.freeSpinsClaimed} onClick={actions.claimDailyBonusSpins} className="absolute z-10 rounded-lg bg-transparent active:bg-lime-300/20 disabled:cursor-not-allowed" style={{ left: '29.4%', top: '91.3%', width: '20%', height: '3.2%' }} />
        <button type="button" onClick={() => setShowHistory(true)} aria-label="View spin history" className="absolute z-[9] flex flex-col items-center justify-center gap-[10%] rounded-lg border border-[#8bff2d] bg-gradient-to-br from-[#061006f5] via-[#102900f5] to-[#020603f5] px-1 py-2 text-center font-black text-[#caff83] shadow-[inset_0_0_18px_#79ff2830,0_0_10px_#80ff3045]" style={{ left: '5.1%', top: '78.2%', width: '18.5%', height: '16.1%', fontSize: 'clamp(9px,2.1vw,17px)' }}><span>SPIN HISTORY</span><strong className="w-[94%] rounded-md border border-[#8bff2d] bg-gradient-to-br from-[#102500] via-[#2b6500] to-[#0a1900] px-1 py-2 text-[#eaffcf]">VIEW HISTORY</strong></button>
        <button type="button" onClick={() => setShowPaytable(true)} aria-label="View paytable" className="absolute z-[9] flex flex-col items-center justify-center gap-[10%] rounded-lg border border-[#d14cff] bg-gradient-to-br from-[#10051bf5] via-[#260044f5] to-[#08030df5] px-1 py-2 text-center font-black text-[#efbaff] shadow-[inset_0_0_18px_#a900ff35,0_0_10px_#c000ff55]" style={{ left: '76.4%', top: '78.2%', width: '18.5%', height: '16.1%', fontSize: 'clamp(9px,2.1vw,17px)' }}><span>TOXIC PAY TABLE</span><strong className="w-[94%] rounded-md border border-[#d14cff] bg-gradient-to-br from-[#260044] via-[#6500a5] to-[#1b0032] px-1 py-2 text-white">VIEW PAY TABLE</strong></button>
        {spinning && <div className="absolute inset-x-0 top-[74%] z-20 text-center text-xs font-black tracking-widest text-lime-200">CONTAMINATING…</div>}
        {!spinning && winPP > 0 && <div className="absolute inset-x-0 top-[74%] z-20 text-center text-sm font-black text-lime-200 [text-shadow:0_0_10px_#9dff37]">+{formatPP(winPP)} PUKE POINTS</div>}
      </div>
      {(isHotStreakActive(state) || isPotAccelActive(state)) && <div className="mx-auto mt-3 flex max-w-[941px] flex-wrap justify-center gap-2">
        {isHotStreakActive(state) && <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[10px] font-bold text-amber-300">FEVER PITCH x1.5</span>}
        {isPotAccelActive(state) && potAccelCountdown && <span className="rounded-full border border-lime-500/30 bg-lime-500/10 px-2 py-1 text-[10px] font-bold text-lime-300">VAT FLOW x2 • {potAccelCountdown}</span>}
      </div>}
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

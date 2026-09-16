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
  | { kind: 'lose'; pp: number };
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
    if (!reelsRef.current) return;
    const measure = () => {
      const rect = reelsRef.current!.getBoundingClientRect();
      setReelsDims({ w: rect.width, h: rect.height });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
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
      if (finalPP === 0) {
        // Pot full check removed
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

  // ✅ PERFECTED WHEEL RESULT HANDLER — ONLY PROFITS ADDED
  const handleWheelResult = useCallback((result: WheelResult) => {
    if (doubleUpResolvedRef.current) return;
    doubleUpResolvedRef.current = true;
    setShowDoubleUp(false);
    const stake = state.doubleUpPending ?? 0;
    actions.useDoubleUp(); // Stake already removed from pending

    if (result.outcome === 'lose') {
      setWinPP(0);
      toast('error', '☠️ SPILLED!', 'All lost — better containment next time!');
      setSpinHistory((prev) => [{ kind: 'lose', pp: 0 }, ...prev].slice(0, MAX_HISTORY));
    } 
    else if (result.outcome === 'safe') {
      // ✅ Safe = stake returned exactly → $0 profit, nothing added
      toast('success', '🛡️ SECURED', `${formatPP(stake)} PP — stake returned!`);
      setSpinHistory((prev) => [{ kind: 'safe', pp: stake }, ...prev].slice(0, MAX_HISTORY));
    } 
    else if (result.outcome === 'double') {
      // ✅ Double = add ONLY profit (stake × 2 − stake = stake)
      const profit = result.finalPP - stake;
      if (profit > 0) actions.addPP(profit);
      toast('success', '☢️ DOUBLED!', `+${formatPP(profit)} PP profit!`);
      setSpinHistory((prev) => [{ kind: 'double', pp: result.finalPP }, ...prev].slice(0, MAX_HISTORY));
    } 
    else if (result.outcome === 'half') {
      // ✅ Half = add ONLY half back (stake × 0.5 = returned portion)
      const halfReturn = result.finalPP; // already = stake * 0.5
      if (halfReturn > 0) actions.addPP(halfReturn);
      toast('info', '⚠️ HALVED', `${formatPP(halfReturn)} PP returned`);
      setSpinHistory((prev) => [{ kind: 'half', pp: halfReturn }, ...prev].slice(0, MAX_HISTORY));
    }
  }, [state.doubleUpPending, actions, toast]);

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
      <div className="relative grunge-panel p-3 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 hazard-stripes opacity-30" />
        <div className="absolute bottom-0 left-0 right-0 h-1 hazard-stripes opacity-30" />
        <div ref={reelsRef} className="relative grid grid-cols-5 gap-1.5 bg-ink-900 rounded-lg p-2 border border-toxic-900/40">
          {grid.map((reel, ri) => {
            const phase = reelPhases[ri];
            const displayReel = phase === 'spinning' ? (cyclingSymbols[ri] ?? reel) : reel;
            return (
              <div key={ri} className={`relative overflow-hidden rounded-md border-0 ${phase === 'spinning' ? 'reel-spinning' : ''} ${phase === 'stopped' ? 'reel-stopped' : ''}`} style={{ background: 'transparent !important', backgroundColor: 'transparent !important' }}>
                {displayReel.map((symId, row) => {
                  const isWin = winPositions.has(`${ri}-${row}`);
                  const sym = SYMBOLS[symId];
                  return (
                    <div
                      key={row}
                      className={`aspect-square flex items-center justify-center reel-symbol border-0 p-0 m-0 ${isWin ? 'win' : ''} ${phase === 'spinning' ? 'reel-blur' : ''} ${phase === 'stopped' ? 'reel-land' : ''}`}
                      style={{ backgroundColor: '#ffffff' }}
                    >
                      <span className={isWin ? 'win-symbol-pop' : ''} style={{ background: 'transparent !important', backgroundColor: 'transparent !important', boxShadow: 'none !important', ...(isWin ? { filter: 'drop-shadow(0 0 8px #39ff14)' } : {}) }}>
                        {sym.image ? (
                          <img 
                            src={sym.image} 
                            alt={sym.label} 
                            className="w-10 h-10 object-contain"
                            style={{ background: 'transparent !important', backgroundColor: 'transparent !important', boxShadow: 'none !important', border: 'none !important' }}
                          />
                        ) : (
                          sym.emoji
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="mt-3 min-h-[60px] flex items-center justify-center">
          {spinning ? (
            <div className="text-center">
              <RefreshCw size={22} className="text-toxic-400/70 animate-spin mx-auto" />
              <div className="font-display text-xs text-toxic-300/50 mt-1.5 tracking-[0.3em] animate-pulse">CONTAMINATING</div>
            </div>
          ) : winPP > 0 ? (
            <div className="text-center animate-pop">
              <div className="font-display font-black text-2xl text-toxic-400 neon-text">+{winPP} Puke Points</div>
              {lastResult && lastResult.wins.length > 0 && (
                <div className="text-[10px] text-toxic-100/50 font-mono mt-1">
                  {lastResult.wins.length} way{lastResult.wins.length > 1 ? 's' : ''} • {lastResult.wins.map((w) => SYMBOLS[w.symbols[0]].label).join(', ')}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-toxic-100/30">
              <div className="font-display text-sm">Contaminate the reels for Puke Points</div>
              <div className="text-[10px] font-mono">243 veins • match 3+ • win goops + +1 XP per twist</div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center mb-2 mt-2">
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
        </div>
      </div>
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
      <SpinHistory entries={spinHistory} />
      <div className="grunge-panel overflow-hidden">
        <button
          onClick={() => setShowPaytable((o) => !o)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-toxic-500/5"
        >
          <span className="font-display font-bold text-sm text-toxic-300 flex items-center gap-2">
            <Layers size={16} /> ☢️ GOOP PAYTABLE
          </span>
          <span className="text-toxic-100/40 text-xs">{showPaytable ? 'Collapse' : 'Reveal'}</span>
        </button>
        {showPaytable && (
          <div className="px-3 pb-3 space-y-2 animate-slide-up">
            <div className="grid grid-cols-12 gap-2 text-[10px] font-mono text-toxic-100/50 border-b border-toxic-900/40 pb-2">
              <span className="col-span-5">SYMBOL</span>
              <span className="col-span-2 text-center">MATCH 3</span>
              <span className="col-span-2 text-center">MATCH 4</span>
              <span className="col-span-3 text-center">MATCH 5 ☢️</span>
            </div>
            {PAYTABLE.map((sym, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center px-1 py-1.5 rounded bg-ink-700/30">
                <span className="col-span-5 font-mono text-sm flex items-center gap-2">
                  {sym.image ? (
                    <img 
                      src={sym.image} 
                      alt={sym.label} 
                      className="w-6 h-6 object-contain"
                      style={{ background: 'transparent', boxShadow: 'none', border: 'none' }}
                    />
                  ) : (
                    sym.emoji
                  )}
                  {sym.label}
                </span>
                <span className="col-span-2 text-center font-mono text-toxic-200 text-sm">{sym.pays[0]}</span>
                <span className="col-span-2 text-center font-mono text-toxic-300 text-sm">{sym.pays[1]}</span>
                <span className="col-span-3 text-center font-mono text-toxic-400 font-bold text-sm">{sym.pays[2]}</span>
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-toxic-900/40 text-[10px] font-mono text-toxic-100/50 space-y-1.5 px-1">
              <div><SpecialIcon symId="wild" label="= substitutes for any symbol" /></div>
              <div><SpecialIcon symId="scatter" label="= Free Toxic Twists" /></div>
              <div><SpecialIcon symId="hazard" label="= Mystery Goop" /></div>
              <div><SpecialIcon symId="jackpot" label="= Instant Puke Points!" /></div>
              <div className="flex items-center gap-2">
                <img 
                  src="/radioactive-risk-wheel.png" 
                  alt="Risk Wheel" 
                  className="w-4 h-4 object-contain"
                />
                <span>= Radioactive Risk Wheel</span>
              </div>
            </div>
          </div>
        )}
      </div>
      {showDoubleUp && state.doubleUpPending && (
        <SpinWheelModal
          stake={state.doubleUpPending}
          onClaim={handleWheelResult}
          onLose={() => { setShowDoubleUp(false); toast('error', '☠️ SPILLED!', 'All lost!'); }}
          onForfeit={() => { setShowDoubleUp(false); actions.addPP(state.doubleUpPending || 0); }}
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
function SpinHistory({ entries }: { entries: SpinHistoryEntry[] }) {
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
                          {entry.symbols.map((symId, idx) => (
                            <HistorySymbolIcon key={idx} symId={symId as SymbolId} />
                          ))}
                          {entry.multiplied && entry.multiplier && (
                            <span className="text-radioactive-400 text-[10px] font-bold font-mono px-1 py-0.5 rounded bg-radioactive-500/15 border border-radioactive-500/30">
                              ☢️ {entry.multiplier}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-toxic-100/30">No contamination</span>
                      )}
                    </div>
                    <span className={`font-mono text-sm tabular-nums ${entry.multiplied ? 'text-radioactive-400 font-bold' : 'text-toxic-300'}`}>+{entry.pp}</span>
                  </div>
                );
              } else if (entry.kind === 'double') {
                return (
                  <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-toxic-500/10 border border-toxic-500/30">
                    <span className="text-sm font-mono text-toxic-400">☢️ DOUBLED!</span>
                    <span className="font-mono text-sm text-toxic-400 font-bold tabular-nums">+{entry.pp}</span>
                  </div>
                );
              } else if (entry.kind === 'half') {
                return (
                  <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-hazard-amber/10 border border-hazard-amber/30">
                    <span className="text-sm font-mono text-hazard-amber">⚠️ HALVED</span>
                    <span className="font-mono text-sm text-hazard-amber tabular-nums">+{entry.pp}</span>
                  </div>
                );
              } else if (entry.kind === 'safe') {
                return (
                  <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-radioactive-500/10 border border-radioactive-600/30">
                    <span className="text-sm font-mono text-radioactive-400">☣️ SECURED</span>
                    <span className="font-mono text-sm text-radioactive-400 tabular-nums">+{entry.pp}</span>
                  </div>
                );
              } else {
                return (
                  <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded bg-red-900/20 border border-red-800/30">
                    <span className="text-sm font-mono text-red-400">☠️ SPILLED</span>
                    <span className="font-mono text-sm text-red-400 tabular-nums">+{entry.pp}</span>
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

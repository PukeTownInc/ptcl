import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, RefreshCw, Zap } from 'lucide-react';
import type { Screen } from '../types';
import { formatPP } from '../constants';
import { useToast } from './Toast';

const VIAL_SLOTS = [
  { id: 'top1', name: 'Green Vial', color: '#39FF14' },
  { id: 'top2', name: 'Orange Vial', color: '#FF8800' },
  { id: 'top3', name: 'Orange Vial', color: '#FF9900' },
  { id: 'bot1', name: 'Purple Vial', color: '#9933FF' },
  { id: 'bot2', name: 'Yellow Vial', color: '#FFFF00' },
  { id: 'bot3', name: 'Blue Vial', color: '#00CCFF' },
];

const VIAL_TIERS = [
  { id: 'common', label: 'Sewer Sludge', minVal: 10, maxVal: 25, weight: 45, successBonus: 1.00 },
  { id: 'uncommon', label: 'Radioactive Serum', minVal: 25, maxVal: 60, weight: 28, successBonus: 0.95 },
  { id: 'rare', label: 'Toxic Elixir', minVal: 60, maxVal: 150, weight: 15, successBonus: 0.85 },
  { id: 'epic', label: 'Contaminated Goo', minVal: 150, maxVal: 350, weight: 8, successBonus: 0.75 },
  { id: 'legendary', label: 'Pure Radiation', minVal: 350, maxVal: 1000, weight: 4, successBonus: 0.60 },
];

type Vial = { id: string; tier: typeof VIAL_TIERS[number]; value: number; slotId: string };
type MixResult = 'idle' | 'mixing' | 'success' | 'fail' | 'critical';

interface Props {
  onNavigate: (s: Screen) => void;
  balancePP: number;
  onEarnPP: (amount: number, source: string) => void;
  onWatchAd: () => Promise<boolean>;
}

const STORAGE_KEY = 'puketown_vialmixer';

function weightedRandomVial() {
  const total = VIAL_TIERS.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const tier of VIAL_TIERS) { r -= tier.weight; if (r <= 0) return tier; }
  return VIAL_TIERS[0];
}

function generateVials(): Vial[] {
  return VIAL_SLOTS.map((slot, i) => {
    const tier = weightedRandomVial();
    const value = Math.floor(tier.minVal + Math.random() * (tier.maxVal - tier.minVal));
    return { id: `v-${Date.now()}-${i}`, tier, value, slotId: slot.id };
  });
}

export function VialMixerScreen({ onNavigate, balancePP, onEarnPP, onWatchAd }: Props) {
  const toast = useToast();
  const [vials, setVials] = useState<Vial[]>([]);
  const [selected, setSelected] = useState<Vial[]>([]);
  const [result, setResult] = useState<MixResult>('idle');
  const [freeClaimedToday, setFreeClaimedToday] = useState(false);
  const [dailyUsed, setDailyUsed] = useState(0);
  const [screenShake, setScreenShake] = useState(false);
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; y: number; color: string; delay: number }>>([]);
  const TODAY = new Date().toISOString().slice(0, 10);

  const confettiTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.date === TODAY) {
          setFreeClaimedToday(data.freeClaimed ?? false);
          setDailyUsed(data.dailyUsed ?? 0);
        }
      }
    } catch {}
    setVials(generateVials());
  }, [TODAY]);

  const saveState = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: TODAY, freeClaimed: freeClaimedToday, dailyUsed }));
  }, [TODAY, freeClaimedToday, dailyUsed]);

  useEffect(saveState, [saveState]);

  const toggleVial = (vial: Vial) => {
    if (result !== 'idle') return;
    if (selected.find(v => v.id === vial.id)) {
      setSelected(selected.filter(v => v.id !== vial.id));
    } else if (selected.length < 3) {
      setSelected([...selected, vial]);
    }
  };

  const refreshVials = async (useAd: boolean) => {
    if (!useAd && balancePP < 10) {
      toast.show('⚠️ Need 10 Puke Points or watch an ad', 'warning');
      return;
    }
    if (useAd) { const ok = await onWatchAd(); if (!ok) return; }
    setVials(generateVials());
    setSelected([]);
    setResult('idle');
    setDailyUsed(p => p + 1);
    toast.show('🧪 New vials loaded!', 'success');
  };

  const performMix = async () => {
    if (selected.length !== 3) return;
    if (freeClaimedToday && dailyUsed === 0) {
      toast.show('⚠️ Daily free mix used — refresh for more!', 'warning');
      return;
    }

    setResult('mixing');
    await new Promise(r => setTimeout(r, 2000));

    const avgSuccess = selected.reduce((s, v) => s * v.tier.successBonus, 1);
    const successChance = Math.round(avgSuccess * 100);
    const roll = Math.random() * 100;
    const isCritical = Math.random() < 0.05;

    if (roll < successChance) {
      const totalBase = selected.reduce((s, v) => s + v.value, 0);
      let payout = Math.round(totalBase * (0.85 + Math.random() * 0.5));
      if (isCritical) payout *= 2;

      setResult(isCritical ? 'critical' : 'success');
      onEarnPP(payout, 'Vial Mixer');
      toast.show(`✅ ${isCritical ? '⚡ CRITICAL ×2! ' : ''}+${formatPP(payout)} PP!`, 'success');

      if (isCritical) {
        setScreenShake(true);
        setConfetti(
          Array.from({ length: 60 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            color: ['#FFD700', '#FF0000', '#39FF14', '#00CCFF'][Math.floor(Math.random() * 4)],
            delay: Math.random() * 0.35,
          }))
        );

        confettiTimerRef.current = setTimeout(() => {
          setScreenShake(false);
          setConfetti([]);
        }, 1200);
      }
    } else {
      setResult('fail');
      setScreenShake(true);
      toast.show('💀 CONTAMINATED — Vials destroyed!', 'error');

      confettiTimerRef.current = setTimeout(() => {
        setScreenShake(false);
      }, 800);
    }

    if (!freeClaimedToday) setFreeClaimedToday(true);
    setDailyUsed(p => p + 1);

    setTimeout(() => {
      setVials(generateVials());
      setSelected([]);
      setResult('idle');
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    };
  }, []);

  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-transform duration-100 ${
        screenShake ? 'animate-shake' : ''
      }`}
      style={{
        backgroundImage: "url('/vial-mixer-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#1a1a1a',
      }}
    >
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 10px currentColor, 0 0 20px currentColor; }
          50% { box-shadow: 0 0 20px currentColor, 0 0 40px currentColor; }
        }
        @keyframes float-bubble {
          0% { transform: translateY(100%); opacity: 0; }
          20% { opacity: 0.6; }
          100% { transform: translateY(-100%); opacity: 0; }
        }
        @keyframes spin-slow {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes spin-fast {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(720deg); }
        }
        @keyframes splash {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
        }
        @keyframes ripple {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .vial-bubble {
          position: absolute; width: 6px; height: 6px;
          background: rgba(255,255,255,0.35); border-radius: 50%;
          animation: float-bubble 1.4s infinite ease-in-out;
        }
        .selected-vial-glow { animation: pulse-glow 1.2s infinite ease-in-out; }
        .mix-chamber-swirl {
          position: absolute; top: 48%; left: 50%;
          width: 55%; height: 18%; border-radius: 50%;
          background: radial-gradient(circle, rgba(57,255,20,0.75), transparent 70%);
          animation: spin-slow 8s linear infinite; pointer-events: none;
        }
        .mixing .mix-chamber-swirl {
          animation: spin-fast 1.2s linear infinite;
          background: radial-gradient(circle, rgba(57,255,20,0.9), transparent 70%);
        }
        .splash-ring {
          position: absolute; top: 48%; left: 50%;
          width: 45%; height: 15%; border-radius: 50%;
          border: 2px solid rgba(57,255,20,0.8);
          animation: splash 0.8s ease-out forwards; pointer-events: none;
        }
        .ripple-ring {
          position: absolute; top: 48%; left: 50%;
          width: 50%; height: 17%; border-radius: 50%;
          border: 3px solid rgba(255,215,0,0.85);
          animation: ripple 1s ease-out forwards; pointer-events: none;
        }
        .confetti-piece {
          position: fixed; z-index: 9999;
          width: 10px; height: 10px;
          animation: confetti-fall 1.4s ease-in forwards;
        }
      `}</style>

      {confetti.map(piece => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.x}%`, top: `${piece.y}%`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
          }}
        />
      ))}

      <div className="relative z-10 px-4 pt-6 flex items-center justify-between">
        <button onClick={() => onNavigate('home')} className="text-green-400 hover:text-green-300 bg-black/40 p-2 rounded-full backdrop-blur-sm">
          <ChevronLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-white font-bold text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
            {selected.length === 0 ? 'TAP 3 VIALS TO SELECT' : `${selected.length}/3 SELECTED`}
          </h2>
        </div>
        <div className="w-10" />
      </div>

      <div className={`relative z-10 w-full max-w-md mx-auto ${result === 'mixing' ? 'mixing' : ''}`} style={{ minHeight: '100vh' }}>
        
        <div className="mix-chamber-swirl" />
        {result === 'mixing' && <div className="splash-ring" />}
        {result === 'success' && <div className="ripple-ring" />}
        {result === 'critical' && <div className="ripple-ring" style={{ borderColor: 'rgba(255,215,0,0.9)' }} />}
        {result === 'fail' && <div className="splash-ring" style={{ borderColor: 'rgba(255,0,0,0.8)' }} />}

        <div className="absolute top-32 left-0 right-0 px-8">
          <div className="grid grid-cols-3 gap-4">
            {vials.slice(0, 3).map((vial) => {
              const isSel = !!selected.find(v => v.id === vial.id);
              return (
                <button
                  key={vial.id}
                  onClick={() => toggleVial(vial)}
                  disabled={result !== 'idle'}
                  className={`relative w-full aspect-[3/4] rounded-lg transition-all duration-300 ${
                    isSel ? 'selected-vial-glow ring-4 ring-white scale-105 bg-black/20' : 'bg-transparent hover:bg-white/10'
                  } ${result !== 'idle' ? 'pointer-events-none' : ''}`}
                  style={{ color: isSel ? VIAL_SLOTS.find(s => s.id === vial.slotId)?.color : 'transparent' }}
                >
                  {isSel && (
                    <>
                      <div className="vial-bubble" style={{ left: '35%', bottom: '20%', animationDelay: '0s' }} />
                      <div className="vial-bubble" style={{ left: '55%', bottom: '25%', animationDelay: '0.2s' }} />
                      <div className="vial-bubble" style={{ left: '45%', bottom: '15%', animationDelay: '0.4s' }} />
                    </>
                  )}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-full text-center">
                    <div className="text-white text-xs font-bold drop-shadow-lg bg-black/60 rounded px-1">
                      {formatPP(vial.value)}
                    </div>
                    <div className="text-green-300 text-[10px] drop-shadow mt-0.5">
                      {vial.tier.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="absolute top-72 left-0 right-0 px-8">
          <div className="grid grid-cols-3 gap-4">
            {vials.slice(3, 6).map((vial) => {
              const isSel = !!selected.find(v => v.id === vial.id);
              return (
                <button
                  key={vial.id}
                  onClick={() => toggleVial(vial)}
                  disabled={result !== 'idle'}
                  className={`relative w-full aspect-[3/4] rounded-lg transition-all duration-300 ${
                    isSel ? 'selected-vial-glow ring-4 ring-white scale-105 bg-black/20' : 'bg-transparent hover:bg-white/10'
                  } ${result !== 'idle' ? 'pointer-events-none' : ''}`}
                  style={{ color: isSel ? VIAL_SLOTS.find(s => s.id === vial.slotId)?.color : 'transparent' }}
                >
                  {isSel && (
                    <>
                      <div className="vial-bubble" style={{ left: '35%', bottom: '20%', animationDelay: '0s' }} />
                      <div className="vial-bubble" style={{ left: '55%', bottom: '25%', animationDelay: '0.2s' }} />
                      <div className="vial-bubble" style={{ left: '45%', bottom: '15%', animationDelay: '0.4s' }} />
                    </>
                  )}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-full text-center">
                    <div className="text-white text-xs font-bold drop-shadow-lg bg-black/60 rounded px-1">
                      {formatPP(vial.value)}
                    </div>
                    <div className="text-green-300 text-[10px] drop-shadow mt-0.5">
                      {vial.tier.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {result !== 'idle' && (
          <div className="absolute top-[420px] left-1/2 -translate-x-1/2 text-center z-20">
            <div className={`text-3xl font-black drop-shadow-lg ${
              result === 'success' ? 'text-green-400' :
              result === 'critical' ? 'text-yellow-300' : 'text-red-500'
            }`} style={{ textShadow: '0 0 20px currentColor' }}>
              {result === 'mixing' && '⚗️ MIXING...'}
              {result === 'success' && '✅ STABLE!'}
              {result === 'critical' && '⚡ CRITICAL!'}
              {result === 'fail' && '💀 CONTAMINATED!'}
            </div>
          </div>
        )}

        <div className="absolute bottom-12 left-0 right-0 px-6 z-10">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <button
              onClick={() => refreshVials(false)}
              disabled={result !== 'idle'}
              className="flex items-center justify-center gap-2 py-3 rounded-lg bg-black/60 border-2 border-gray-500 text-white backdrop-blur-sm disabled:opacity-40"
            >
              <RefreshCw size={16} />
              <span className="text-sm font-bold">10 PP</span>
            </button>
            <button
              onClick={() => refreshVials(true)}
              disabled={result !== 'idle'}
              className="flex items-center justify-center gap-2 py-3 rounded-lg bg-black/60 border-2 border-yellow-500/70 text-yellow-300 backdrop-blur-sm disabled:opacity-40"
            >
              <Zap size={16} />
              <span className="text-sm font-bold">WATCH AD</span>
            </button>
          </div>

          <button
            onClick={performMix}
            disabled={selected.length !== 3 || result !== 'idle'}
            className="w-full py-4 rounded-lg font-black text-xl tracking-widest border-4 border-green-400/80 bg-green-600/90 text-white shadow-lg shadow-green-500/30 backdrop-blur-sm disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ boxShadow: '0 0 25px rgba(74,222,128,0.5), inset 0 2px 10px rgba(255,255,255,0.3)' }}
          >
            ⚗️ MIX VIALS
          </button>
        </div>
      </div>
    </div>
  );
}

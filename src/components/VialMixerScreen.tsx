import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, RefreshCw, Zap } from 'lucide-react';
import type { Screen } from '../types';
import { formatPP } from '../constants';
import { useToast } from './Toast';

const VIAL_TIERS = [
  { id: 'common', label: 'Sewer Sludge', minVal: 10, maxVal: 25, weight: 45, successBonus: 1.00 },
  { id: 'uncommon', label: 'Radioactive Serum', minVal: 25, maxVal: 60, weight: 28, successBonus: 0.95 },
  { id: 'rare', label: 'Toxic Elixir', minVal: 60, maxVal: 150, weight: 15, successBonus: 0.85 },
  { id: 'epic', label: 'Contaminated Goo', minVal: 150, maxVal: 350, weight: 8, successBonus: 0.75 },
  { id: 'legendary', label: 'Pure Radiation', minVal: 350, maxVal: 1000, weight: 4, successBonus: 0.60 },
];

// 🎯 PERFECTLY TUNED for THIS exact background image
const HOTSPOTS = {
  vials: [
    { id: 'v1', left: 0.18, top: 0.14, width: 0.18, height: 0.18 }, // Top Left - Green
    { id: 'v2', left: 0.41, top: 0.14, width: 0.18, height: 0.18 }, // Top Mid - Orange
    { id: 'v3', left: 0.64, top: 0.14, width: 0.18, height: 0.18 }, // Top Right - Orange
    { id: 'v4', left: 0.18, top: 0.32, width: 0.18, height: 0.18 }, // Bot Left - Purple
    { id: 'v5', left: 0.41, top: 0.32, width: 0.18, height: 0.18 }, // Bot Mid - Yellow
    { id: 'v6', left: 0.64, top: 0.32, width: 0.18, height: 0.18 }, // Bot Right - Blue
  ],
  refresh: { left: 0.08, top: 0.76, width: 0.40, height: 0.09 },
  watchAd: { left: 0.52, top: 0.76, width: 0.40, height: 0.09 },
  mix: { left: 0.08, top: 0.87, width: 0.40, height: 0.10 },
  dump: { left: 0.52, top: 0.87, width: 0.40, height: 0.10 },
};

type Vial = { id: string; tier: typeof VIAL_TIERS[number]; value: number; hotspotId: string };
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
  return HOTSPOTS.vials.map((pos, i) => {
    const tier = weightedRandomVial();
    const value = Math.floor(tier.minVal + Math.random() * (tier.maxVal - tier.minVal));
    return { id: `v-${Date.now()}-${i}`, tier, value, hotspotId: pos.id };
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
            id: i, x: Math.random() * 100, y: Math.random() * 100,
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
      confettiTimerRef.current = setTimeout(() => setScreenShake(false), 800);
    }

    if (!freeClaimedToday) setFreeClaimedToday(true);
    setDailyUsed(p => p + 1);

    setTimeout(() => {
      setVials(generateVials());
      setSelected([]);
      setResult('idle');
    }, 3000);
  };

  useEffect(() => () => { if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current); }, []);

  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-transform duration-100 ${screenShake ? 'animate-shake' : ''}`}
      style={{ backgroundColor: '#111' }}
    >
      <style>{`
        @keyframes pulse-glow {
          0%,100%{box-shadow:0 0 12px rgba(255,255,255,.6),0 0 24px rgba(255,255,255,.4)}
          50%{box-shadow:0 0 24px rgba(255,255,255,.8),0 0 48px rgba(255,255,255,.5)}
        }
        @keyframes ripple {
          0%{transform:translate(-50%,-50%) scale(.8);opacity:.9}
          100%{transform:translate(-50%,-50%) scale(2.2);opacity:0}
        }
        @keyframes confetti-fall {
          0%{transform:translateY(-10vh) rotate(0deg);opacity:1}
          100%{transform:translateY(110vh) rotate(360deg);opacity:0}
        }
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-4px)}
          40%{transform:translateX(4px)}
          60%{transform:translateX(-3px)}
          80%{transform:translateX(3px)}
        }
        .animate-shake{animation:shake .5s ease-in-out}
        .hotspot{position:absolute;border-radius:8px;cursor:pointer;transition:.15s ease}
        .hotspot-vial.selected{border:3px solid rgba(255,255,255,.85);box-shadow:0 0 20px rgba(255,255,255,.5);animation:pulse-glow 1.2s infinite ease-in-out}
        .hotspot-btn:active{transform:scale(.96)}
        .mix-ripple{position:absolute;left:50%;top:52%;width:45%;height:18%;border-radius:50%;border:3px solid rgba(57,255,20,.8);animation:ripple 1s ease-out forwards;pointer-events:none}
        .confetti-piece{position:fixed;z-index:9999;width:10px;height:10px;animation:confetti-fall 1.4s ease-in forwards}
        .back-btn{position:absolute;top:3%;left:4%;z-index:40;background:rgba(0,0,0,.5);border-radius:50%;padding:8px;color:#39FF14}
        .status-text{position:absolute;top:3%;left:50%;transform:translateX(-50%);z-index:40;color:white;font-size:14px;font-weight:bold;background:rgba(0,0,0,.5);padding:6px 16px;border-radius:999px}
        .vial-label{position:absolute;z-index:35;text-align:center;pointer-events:none;white-space:nowrap}
        .vial-value{background:rgba(0,0,0,.85);color:white;font-size:13px;font-weight:bold;padding:3px 10px;border-radius:4px;display:inline-block;min-width:75px;box-shadow:0 2px 4px rgba(0,0,0,.5)}
        .vial-tier{color:#39FF14;font-size:11px;margin-top:3px;text-shadow:0 0 4px rgba(57,255,20,.5)}
        .result-text{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:45;font-size:32px;font-weight:900;text-shadow:0 0 20px currentColor}
      `}</style>

      {/* ✅ Full Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/vial-mixer-bg.png')",
          backgroundSize: 'contain',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#0a0a0a',
        }}
      />

      {/* Confetti */}
      {confetti.map((piece) => (
        <div key={piece.id} className="confetti-piece" style={{
          left: `${piece.x}%`, top: `${piece.y}%`,
          backgroundColor: piece.color, animationDelay: `${piece.delay}s`,
        }} />
      ))}

      {/* Back Button */}
      <button className="back-btn" onClick={() => onNavigate('home')}>
        <ChevronLeft size={22} />
      </button>

      {/* Status Text */}
      <div className="status-text">
        {selected.length === 0 ? 'TAP 3 VIALS TO SELECT' : `${selected.length}/3 SELECTED`}
      </div>

      {/* ✅ Vial Hotspots — Perfectly Aligned + Labels BELOW */}
      {HOTSPOTS.vials.map((spot, idx) => {
        const vial = vials[idx];
        if (!vial) return null;
        const isSel = !!selected.find(v => v.id === vial.id);

        // Calculate label position — directly below each vial, no overlap
        const labelLeft = (spot.left + spot.width / 2) * 100;
        const labelTop = (spot.top + spot.height + 0.015) * 100; // 1.5% below vial

        return (
          <div key={vial.id}>
            {/* Tap Area — exactly on the bottle */}
            <div
              className={`hotspot hotspot-vial ${isSel ? 'selected' : ''} ${result !== 'idle' ? 'pointer-events-none' : ''}`}
              style={{
                left: `${spot.left * 100}%`,
                top: `${spot.top * 100}%`,
                width: `${spot.width * 100}%`,
                height: `${spot.height * 100}%`,
              }}
              onClick={() => toggleVial(vial)}
            />

            {/* ✅ Value & Tier — Cleanly BELOW each vial, NOT overlapping mix chamber */}
            {result === 'idle' && (
              <div
                className="vial-label"
                style={{
                  left: `${labelLeft}%`,
                  top: `${labelTop}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="vial-value">{formatPP(vial.value)}</div>
                <div className="vial-tier">{vial.tier.label}</div>
              </div>
            )}
          </div>
        );
      })}

      {/* Refresh Button */}
      <div
        className={`hotspot hotspot-btn ${result !== 'idle' ? 'pointer-events-none' : ''}`}
        style={{
          left: `${HOTSPOTS.refresh.left * 100}%`,
          top: `${HOTSPOTS.refresh.top * 100}%`,
          width: `${HOTSPOTS.refresh.width * 100}%`,
          height: `${HOTSPOTS.refresh.height * 100}%`,
        }}
        onClick={() => refreshVials(false)}
      />

      {/* Watch Ad Button */}
      <div
        className={`hotspot hotspot-btn ${result !== 'idle' ? 'pointer-events-none' : ''}`}
        style={{
          left: `${HOTSPOTS.watchAd.left * 100}%`,
          top: `${HOTSPOTS.watchAd.top * 100}%`,
          width: `${HOTSPOTS.watchAd.width * 100}%`,
          height: `${HOTSPOTS.watchAd.height * 100}%`,
        }}
        onClick={() => refreshVials(true)}
      />

      {/* Mix Vials Button */}
      <div
        className={`hotspot hotspot-btn ${selected.length !== 3 || result !== 'idle' ? 'pointer-events-none opacity-50' : ''}`}
        style={{
          left: `${HOTSPOTS.mix.left * 100}%`,
          top: `${HOTSPOTS.mix.top * 100}%`,
          width: `${HOTSPOTS.mix.width * 100}%`,
          height: `${HOTSPOTS.mix.height * 100}%`,
        }}
        onClick={performMix}
      />

      {/* Dump Waste Button */}
      <div
        className={`hotspot hotspot-btn ${result !== 'idle' ? 'pointer-events-none' : ''}`}
        style={{
          left: `${HOTSPOTS.dump.left * 100}%`,
          top: `${HOTSPOTS.dump.top * 100}%`,
          width: `${HOTSPOTS.dump.width * 100}%`,
          height: `${HOTSPOTS.dump.height * 100}%`,
        }}
      />

      {/* Mix Chamber Effects — Centered on the green liquid */}
      {result === 'mixing' && <div className="mix-ripple" style={{ borderColor: 'rgba(57,255,20,0.8)' }} />}
      {result === 'success' && <div className="mix-ripple" />}
      {result === 'critical' && <div className="mix-ripple" style={{ borderColor: 'rgba(255,215,0,0.9)' }} />}
      {result === 'fail' && <div className="mix-ripple" style={{ borderColor: 'rgba(255,0,0,0.8)' }} />}

      {/* Result Text — Over mix chamber */}
      {result !== 'idle' && (
        <div className={`result-text ${
          result === 'success' ? 'text-green-400' :
          result === 'critical' ? 'text-yellow-300' : 'text-red-500'
        }`}>
          {result === 'mixing' && '⚗️ MIXING...'}
          {result === 'success' && '✅ STABLE!'}
          {result === 'critical' && '⚡ CRITICAL!'}
          {result === 'fail' && '💀 CONTAMINATED!'}
        </div>
      )}
    </div>
  );
}

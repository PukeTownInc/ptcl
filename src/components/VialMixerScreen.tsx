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

const HOTSPOTS = {
  vials: [
    { id: 'v1', left: 0.08, top: 0.18, width: 0.22, height: 0.18 },
    { id: 'v2', left: 0.39, top: 0.18, width: 0.22, height: 0.18 },
    { id: 'v3', left: 0.70, top: 0.18, width: 0.22, height: 0.18 },
    { id: 'v4', left: 0.08, top: 0.34, width: 0.22, height: 0.18 },
    { id: 'v5', left: 0.39, top: 0.34, width: 0.22, height: 0.18 },
    { id: 'v6', left: 0.70, top: 0.34, width: 0.22, height: 0.18 },
  ],
  refresh: { left: 0.08, top: 0.76, width: 0.42, height: 0.09 },
  watchAd: { left: 0.50, top: 0.76, width: 0.42, height: 0.09 },
  mix: { left: 0.08, top: 0.87, width: 0.84, height: 0.11 },
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
  for (const tier of VIAL_TIERS) {
    r -= tier.weight;
    if (r <= 0) return tier;
  }
  return VIAL_TIERS[0];
}

function generateVials(): Vial[] {
  return HOTSPOTS.vials.map((_, i) => {
    const tier = weightedRandomVial();
    const value = Math.floor(tier.minVal + Math.random() * (tier.maxVal - tier.minVal));
    return {
      id: `v-${Date.now()}-${i}`,
      tier,
      value,
      hotspotId: HOTSPOTS.vials[i].id,
    };
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
    if (selected.find((v) => v.id === vial.id)) {
      setSelected(selected.filter((v) => v.id !== vial.id));
    } else if (selected.length < 3) {
      setSelected([...selected, vial]);
    }
  };

  const refreshVials = async (useAd: boolean) => {
    if (!useAd && balancePP < 10) {
      toast.show('⚠️ Need 10 Puke Points or watch an ad', 'warning');
      return;
    }
    if (useAd) {
      const ok = await onWatchAd();
      if (!ok) return;
    }
    setVials(generateVials());
    setSelected([]);
    setResult('idle');
    setDailyUsed((p) => p + 1);
    toast.show('🧪 New vials loaded!', 'success');
  };

  const performMix = async () => {
    if (selected.length !== 3) return;
    if (freeClaimedToday && dailyUsed === 0) {
      toast.show('⚠️ Daily free mix used — refresh for more!', 'warning');
      return;
    }

    setResult('mixing');
    await new Promise((r) => setTimeout(r, 2000));

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
      confettiTimerRef.current = setTimeout(() => setScreenShake(false), 800);
    }

    if (!freeClaimedToday) setFreeClaimedToday(true);
    setDailyUsed((p) => p + 1);

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
      style={{ backgroundColor: '#111' }}
    >
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 10px currentColor, 0 0 20px currentColor; }
          50% { box-shadow: 0 0 20px currentColor, 0 0 40px currentColor; }
        }
        @keyframes spin-fast {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(720deg); }
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
        .hotspot {
          position: absolute;
          border-radius: 12px;
          cursor: pointer;
          transition: 0.18s ease;
          background: rgba(255,255,255,0.04);
        }
        .hotspot:hover {
          background: rgba(255,255,255,0.12);
        }
        .hotspot-vial.selected {
          border: 3px solid rgba(255,255,255,0.85);
          box-shadow: 0 0 18px rgba(255,255,255,0.5), inset 0 0 12px rgba(255,255,255,0.25);
          animation: pulse-glow 1.2s infinite ease-in-out;
        }
        .hotspot-btn {
          background: rgba(0,0,0,0.35);
          border: 2px solid rgba(255,255,255,0.35);
        }
        .hotspot-btn:active {
          transform: scale(0.96);
          background: rgba(0,0,0,0.55);
        }
        .mix-ripple {
          position: absolute;
          left: 50%;
          top: 52%;
          width: 40%;
          height: 16%;
          border-radius: 50%;
          border: 3px solid rgba(255,215,0,0.85);
          animation: ripple 1s ease-out forwards;
          pointer-events: none;
        }
        .confetti-piece {
          position: fixed;
          z-index: 9999;
          width: 10px;
          height: 10px;
          animation: confetti-fall 1.4s ease-in forwards;
        }
        .back-button {
          position: absolute;
          top: 2.5%;
          left: 5%;
          z-index: 30;
          background: rgba(0,0,0,0.45);
          border-radius: 50%;
          padding: 10px;
          color: #39FF14;
        }
        .status-text {
          position: absolute;
          top: 3%;
          left: 50%;
          transform: translateX(-50%);
          z-index: 30;
          background: rgba(0,0,0,0.55);
          color: white;
          font-size: 14px;
          font-weight: bold;
          padding: 8px 14px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .vial-label {
          position: absolute;
          z-index: 25;
          text-align: center;
          pointer-events: none;
        }
        .vial-value {
          background: rgba(0,0,0,0.75);
          color: white;
          font-size: 14px;
          font-weight: bold;
          padding: 4px 8px;
          border-radius: 6px;
        }
        .vial-tier {
          color: #39FF14;
          font-size: 11px;
          margin-top: 2px;
        }
        .result-text {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          z-index: 35;
          font-size: 34px;
          font-weight: 900;
          text-shadow: 0 0 20px currentColor;
        }
      `}</style>

      {/* Full Original Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/vial-mixer-bg.png')",
          backgroundSize: 'contain',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Confetti */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
          }}
        />
      ))}

      {/* Back Button */}
      <button className="back-button" onClick={() => onNavigate('home')}>
        <ChevronLeft size={24} />
      </button>

      {/* Status Text */}
      <div className="status-text">
        {selected.length === 0 ? 'TAP 3 VIALS TO SELECT' : `${selected.length}/3 SELECTED`}
      </div>

      {/* Vial Hotspots — Only invisible tappable areas */}
      {HOTSPOTS.vials.map((spot, idx) => {
        const vial = vials[idx];
        if (!vial) return null;
        const isSel = !!selected.find((v) => v.id === vial.id);

        return (
          <div key={vial.id}>
            <div
              className={`hotspot hotspot-vial ${isSel ? 'selected' : ''} ${
                result !== 'idle' ? 'pointer-events-none' : ''
              }`}
              style={{
                left: `${spot.left * 100}%`,
                top: `${spot.top * 100}%`,
                width: `${spot.width * 100}%`,
                height: `${spot.height * 100}%`,
              }}
              onClick={() => toggleVial(vial)}
            />

            {/* Only show labels when idle so they don't break the image */}
            {result === 'idle' && (
              <div
                className="vial-label"
                style={{
                  left: `${spot.left * 100 + spot.width * 50}%`,
                  top: `${spot.top * 100 + spot.height * 100 + 2}%`,
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

      {/* Refresh Button Hotspot */}
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

      {/* Watch Ad Button Hotspot */}
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

      {/* Mix Button Hotspot */}
      <div
        className={`hotspot hotspot-btn ${
          selected.length !== 3 || result !== 'idle' ? 'pointer-events-none opacity-40' : ''
        }`}
        style={{
          left: `${HOTSPOTS.mix.left * 100}%`,
          top: `${HOTSPOTS.mix.top * 100}%`,
          width: `${HOTSPOTS.mix.width * 100}%`,
          height: `${HOTSPOTS.mix.height * 100}%`,
        }}
        onClick={performMix}
      />

      {/* Mixing / Result Effects */}
      {result === 'mixing' && (
        <div className="mix-ripple" style={{ borderColor: 'rgba(57,255,20,0.8)' }} />
      )}
      {result === 'success' && <div className="mix-ripple" />}
      {result === 'critical' && <div className="mix-ripple" style={{ borderColor: 'rgba(255,215,0,0.9)' }} />}
      {result === 'fail' && <div className="mix-ripple" style={{ borderColor: 'rgba(255,0,0,0.8)' }} />}

      {result !== 'idle' && (
        <div
          className={`result-text ${
            result === 'success' ? 'text-green-400' : result === 'critical' ? 'text-yellow-300' : 'text-red-500'
          }`}
        >
          {result === 'mixing' && '⚗️ MIXING...'}
          {result === 'success' && '✅ STABLE!'}
          {result === 'critical' && '⚡ CRITICAL!'}
          {result === 'fail' && '💀 CONTAMINATED!'}
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Tv, X, Play } from 'lucide-react';
import { formatPP } from '../constants';

export type WheelOutcome = 'double' | 'lose' | 'half' | 'safe';
export interface WheelResult {
  outcome: WheelOutcome;
  amount: number;
}

// ✅ MATCHES YOUR IMAGE — Top=DOUBLE → Clockwise: HALF → LOSE → SAFE
// WEIGHTS: Double 25% • Half 30% • Lose 40% • Safe 20%
const SEGMENTS = [
  { id: 'double' as const, label: 'DOUBLE',  multiplier: 2,   weight: 25, startAngle: 0,   endAngle: 90 },
  { id: 'half'   as const, label: 'HALF',    multiplier: 0.5, weight: 30, startAngle: 90,  endAngle: 180 },
  { id: 'lose'   as const, label: 'LOSE',    multiplier: 0,   weight: 40, startAngle: 180, endAngle: 270 },
  { id: 'safe'   as const, label: 'SAFE',    multiplier: 1,   weight: 20, startAngle: 270, endAngle: 360 },
];

function pickSegmentIndex(): number {
  let r = Math.random() * 100;
  for (let i = 0; i < SEGMENTS.length; i++) {
    r -= SEGMENTS[i].weight;
    if (r <= 0) return i;
  }
  return 0;
}

interface Props {
  stake: number;
  onClaim: (result: WheelResult) => void;
  onLose: () => void;
  onForfeit: () => void;
}

type Phase = 'idle' | 'spinning' | 'result';

export function SpinWheelModal({ stake, onClaim, onLose, onForfeit }: Props) {
  const safeStake = Math.max(0, stake);
  const [rotation, setRotation] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [landedIndex, setLandedIndex] = useState<number | null>(null);
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (spinTimer.current) clearTimeout(spinTimer.current); };
  }, []);

  const handleSpin = useCallback(() => {
    if (phase !== 'idle') return;
    setPhase('spinning');
    setLandedIndex(null);

    const targetIndex = pickSegmentIndex();
    const targetSeg = SEGMENTS[targetIndex];
    
    // ✅ FIXED: Spin COUNTER-CLOCKWISE so the CORRECT segment lands at the pointer
    // Calculate: rotate so the TOP of the target segment lands exactly at the top pointer
    const targetTop = targetSeg.startAngle;
    const fullSpins = 5 + Math.floor(Math.random() * 3);
    // NEGATIVE = counter-clockwise — matches visual flow
    const totalRotation = rotation - (fullSpins * 360 + targetTop);
    
    setRotation(totalRotation);

    spinTimer.current = setTimeout(() => {
      setLandedIndex(targetIndex);
      setPhase('result');
    }, 3800);
  }, [phase, rotation]);

  const handleClaim = useCallback(() => {
    if (landedIndex === null || phase !== 'result') return;
    const seg = SEGMENTS[landedIndex];
    const amount = safeStake * seg.multiplier;
    onClaim({ outcome: seg.id, amount });
  }, [landedIndex, phase, safeStake, onClaim]);

  const handleClose = useCallback(() => {
    if (phase === 'spinning') return;
    if (landedIndex === null) {
      onForfeit();
      return;
    }
    if (SEGMENTS[landedIndex].id === 'lose') {
      onLose();
    } else {
      onForfeit();
    }
  }, [phase, landedIndex, onLose, onForfeit]);

  const landed = landedIndex !== null ? SEGMENTS[landedIndex] : null;
  const winAmount = landed ? safeStake * landed.multiplier : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="grunge-panel neon-border p-5 max-w-xs w-full text-center relative">
        <button
          onClick={handleClose}
          disabled={phase === 'spinning'}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-ink-700/80 text-toxic-200 hover:text-toxic-400 disabled:opacity-30"
        >
          <X size={16} />
        </button>

        <h3 className="font-display font-black text-lg text-radioactive-400 mb-1">☢️ RADIOACTIVE RISK WHEEL</h3>
        <p className="text-[11px] text-toxic-100/50 font-mono mb-3">Staked: {formatPP(safeStake)} PP</p>

        {/* WHEEL */}
        <div className="relative mx-auto mb-4" style={{ width: 220, height: 220 }}>
          {/* Fixed top pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30" style={{ marginTop: -4 }}>
            <div style={{
              width: 0, height: 0,
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderTop: '20px solid #FFFF00',
              filter: 'drop-shadow(0 0 8px #FFFF00)',
            }} />
          </div>

          {/* Rotating wheel — ✅ spins COUNTER-CLOCKWISE */}
          <div
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: phase === 'spinning'
                ? 'transform 3.8s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
                : 'none',
              boxShadow: '0 0 25px #39ff1466, 0 0 50px #39ff1433',
              border: '4px solid #39ff14',
            }}
          >
            <img
              src="/radioactive-risk-wheel.png"
              alt="Risk Wheel"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Center hub */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 rounded-full bg-ink-900 border-3 border-toxic-400 flex items-center justify-center"
            style={{ width: 56, height: 56, boxShadow: '0 0 15px #39ff14' }}
          >
            <img src="/logo-192.png" alt="Puke Town" className="w-12 h-12 object-contain" />
          </div>
        </div>

        {/* RESULT — EXACTLY WHAT LANDED */}
        {phase === 'result' && landed && (
          <div className="mb-4 space-y-2">
            <div className="text-4xl">
              {landed.id === 'double' && '☢️'}
              {landed.id === 'lose'   && '☠️'}
              {landed.id === 'half'   && '⚠️'}
              {landed.id === 'safe'   && '🛡️'}
            </div>
            <div className={`font-display font-black text-xl ${
              landed.id === 'double' ? 'text-green-400' :
              landed.id === 'lose'   ? 'text-red-400' :
              landed.id === 'half'   ? 'text-amber-400' : 'text-blue-400'
            }`}>
              {landed.label}
            </div>
            <p className="font-mono text-lg">
              {landed.id === 'lose'
                ? <span className="text-red-400">— 0 — Stake Lost</span>
                : <span className="text-green-400">+{formatPP(winAmount)} PP</span>
              }
            </p>
            {landed.id !== 'lose' && (
              <p className="text-[10px] text-toxic-100/40 font-mono">Watch ad → claim amount</p>
            )}
          </div>
        )}

        {phase === 'idle' && (
          <button onClick={handleSpin} className="toxic-btn w-full py-3.5 flex items-center justify-center gap-2">
            <Play size={18} /> SPIN
          </button>
        )}
        {phase === 'spinning' && (
          <p className="py-3 text-toxic-300/60 font-mono animate-pulse">CONTAMINATING...</p>
        )}
        {phase === 'result' && landed && landed.id !== 'lose' && (
          <>
            <button onClick={handleClaim} className="toxic-btn w-full py-3 flex items-center justify-center gap-2">
              <Tv size={16} /> Absorb Radiation to Claim
            </button>
            <button onClick={handleClose} className="w-full mt-2 py-2 text-[11px] text-red-400/50 hover:text-red-400/80 font-mono">
              Forfeit
            </button>
          </>
        )}
        {phase === 'result' && landed && landed.id === 'lose' && (
          <button onClick={handleClose} className="ghost-btn w-full py-3 text-red-400">
            Close — Stake Lost
          </button>
        )}
      </div>
    </div>
  );
}

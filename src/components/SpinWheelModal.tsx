import { useCallback, useEffect, useRef, useState } from 'react';
import { Tv, X, Play } from 'lucide-react';
import { formatPP } from '../constants';

export type WheelOutcome = 'double' | 'lose' | 'half' | 'safe';
export interface WheelResult {
  outcome: WheelOutcome;
  multiplier: number;
  finalPP: number;
  profit: number; // ✅ NEW — clear separation
}

interface Segment {
  id: WheelOutcome;
  label: string;
  probability: number;
  startAngle: number;
  endAngle: number;
}

// ✅ Matches your PNG visually — weighted probabilities behind scenes
const SEGMENTS: Segment[] = [
  { id: 'half',    label: 'HALF',   probability: 30, startAngle: 0,   endAngle: 90 },
  { id: 'lose',    label: 'LOSE',   probability: 40, startAngle: 90,  endAngle: 180 },
  { id: 'safe',    label: 'SAFE',   probability: 20, startAngle: 180, endAngle: 270 },
  { id: 'double',  label: 'DOUBLE', probability: 10, startAngle: 270, endAngle: 360 },
];

function pickWeightedIndex(): number {
  let r = Math.random() * 100;
  for (let i = 0; i < SEGMENTS.length; i++) {
    r -= SEGMENTS[i].probability;
    if (r <= 0) return i;
  }
  return 0;
}

function getMultiplier(outcome: WheelOutcome): number {
  switch (outcome) {
    case 'double': return 2;
    case 'lose':   return 0;
    case 'half':   return 0.5;
    case 'safe':   return 1;
  }
}

interface Props {
  stake: number;
  onClaim: (result: WheelResult) => void;
  onLose: () => void;
  onForfeit: () => void;
}

type Phase = 'idle' | 'spinning' | 'result';

export function SpinWheelModal({ stake, onClaim, onLose, onForfeit }: Props) {
  const safeStake = Math.max(0, Math.round(stake));
  const [rotation, setRotation] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [resultIndex, setResultIndex] = useState<number | null>(null);
  const [effect, setEffect] = useState<'confetti' | 'redflash' | 'amberflash' | 'blueflash' | null>(null);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinFiredRef = useRef(false);

  const outcome = resultIndex !== null ? SEGMENTS[resultIndex] : null;
  const multiplier = outcome ? getMultiplier(outcome.id) : 0;
  const finalPP = outcome ? Math.round(safeStake * multiplier) : 0;
  const profit = finalPP - safeStake; // ✅ Pure profit only

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  const handleSpin = useCallback(() => {
    if (phase !== 'idle' || spinFiredRef.current) return;
    spinFiredRef.current = true;
    setPhase('spinning');
    setResultIndex(null);
    setEffect(null);

    const targetIndex = pickWeightedIndex();
    const targetSeg = SEGMENTS[targetIndex];
    const targetCenter = (targetSeg.startAngle + targetSeg.endAngle) / 2;
    const fullRotations = 5 + Math.floor(Math.random() * 3);
    const targetRotation = rotation + fullRotations * 360 + (360 - targetCenter);

    setRotation(targetRotation);

    spinTimerRef.current = setTimeout(() => {
      setResultIndex(targetIndex);
      setPhase('result');
      if (targetSeg.id === 'double') setEffect('confetti');
      else if (targetSeg.id === 'lose') setEffect('redflash');
      else if (targetSeg.id === 'half') setEffect('amberflash');
      else setEffect('blueflash');
      spinFiredRef.current = false;
    }, 3800);
  }, [phase, rotation]);

  const handleWatchAd = () => {
    if (!outcome || phase !== 'result') return;
    onClaim({ 
      outcome: outcome.id, 
      multiplier, 
      finalPP,
      profit // ✅ Pass clean profit value up
    });
  };

  const handleClose = () => {
    if (phase === 'spinning') {
      onForfeit();
      return;
    }
    if (phase === 'result' && outcome) {
      if (outcome.id === 'lose') onLose();
      else onForfeit();
    } else onForfeit();
  };

  useEffect(() => {
    if (effect === 'redflash' || effect === 'amberflash' || effect === 'blueflash') {
      const t = setTimeout(() => setEffect(null), 1000);
      return () => clearTimeout(t);
    }
  }, [effect]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
      {effect === 'redflash' && <div className="absolute inset-0 bg-red-600/30 animate-fade-in pointer-events-none" />}
      {effect === 'amberflash' && <div className="absolute inset-0 bg-amber-500/20 animate-fade-in pointer-events-none" />}
      {effect === 'blueflash' && <div className="absolute inset-0 bg-blue-500/20 animate-fade-in pointer-events-none" />}
      {effect === 'confetti' && <ConfettiBurst />}
      
      <div className="grunge-panel neon-border p-5 max-w-xs w-full text-center animate-slide-up relative">
        <button
          onClick={handleClose}
          disabled={phase === 'spinning'}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-ink-700/80 text-toxic-200 hover:text-toxic-400 disabled:opacity-30"
        >
          <X size={16} />
        </button>

        <h3 className="font-display font-black text-lg text-radioactive-400 neon-text-yellow mb-1">☢️ RADIOACTIVE RISK WHEEL</h3>
        <p className="text-[11px] text-toxic-100/50 font-mono mb-2">Risk it all for DOUBLE?</p>
        
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-toxic-500/10 border border-toxic-600/30 mb-4">
          <span className="text-[10px] text-toxic-100/50 font-mono uppercase">Stake:</span>
          <span className="font-display font-bold text-toxic-400">{formatPP(safeStake)} Puke Points</span>
        </div>

        <div className="relative mx-auto mb-4" style={{ width: 220, height: 220 }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30" style={{ marginTop: -4 }}>
            <div
              className="w-0 h-0"
              style={{
                borderLeft: '12px solid transparent',
                borderRight: '12px solid transparent',
                borderTop: '20px solid #ffff00',
                filter: 'drop-shadow(0 0 8px #ffff00)',
              }}
            />
          </div>
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
              alt="Radioactive Risk Wheel"
              className="w-full h-full object-contain"
            />
          </div>
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 rounded-full bg-ink-900 border-3 border-toxic-400 flex items-center justify-center"
            style={{ width: 56, height: 56, boxShadow: '0 0 15px #39ff14' }}
          >
            <img src="/logo-192.png" alt="Puke Town" className="w-12 h-12 object-contain" />
          </div>
        </div>

        {phase === 'result' && outcome && (
          <div className="animate-pop mb-3">
            <div className="text-4xl mb-1">
              {outcome.id === 'double' && '☢️'}
              {outcome.id === 'lose' && '☠️'}
              {outcome.id === 'half' && '⚠️'}
              {outcome.id === 'safe' && '🛡️'}
            </div>
            <div
              className={`font-display font-black text-xl ${
                outcome.id === 'double' ? 'text-toxic-400 neon-text' :
                outcome.id === 'lose' ? 'text-red-400' :
                outcome.id === 'half' ? 'text-hazard-amber' : 'text-blue-400'
              }`}
            >
              {outcome.id === 'double' && `DOUBLED! +${formatPP(profit)} Puke Points`}
              {outcome.id === 'lose' && `SPILLED! All lost`}
              {outcome.id === 'half' && `HALVED! ${profit === 0 ? 'Even' : formatPP(profit)} Puke Points`}
              {outcome.id === 'safe' && `SECURED! Stake Kept`}
            </div>
            {outcome.id !== 'lose' && (
              <p className="text-[10px] text-toxic-100/40 font-mono mt-1">Absorb radiation to secure reward</p>
            )}
          </div>
        )}

        {phase === 'idle' && (
          <button onClick={handleSpin} className="yellow-btn w-full py-3.5 flex items-center justify-center gap-2 text-sm">
            <Play size={18} /> SPIN THE WHEEL
          </button>
        )}

        {phase === 'spinning' && (
          <div className="py-3">
            <span className="font-display text-sm text-toxic-300/60 animate-pulse tracking-[0.3em]">CONTAMINATING...</span>
          </div>
        )}

        {phase === 'result' && outcome && outcome.id !== 'lose' && (
          <>
            <button onClick={handleWatchAd} className="toxic-btn w-full py-3 flex items-center justify-center gap-2 text-sm">
              <Tv size={16} /> Absorb Radiation to Claim
            </button>
            <button onClick={handleClose} className="w-full mt-2 py-2 text-[11px] text-toxic-100/30 hover:text-toxic-100/50 font-mono">
              Skip — Keep Original {formatPP(safeStake)} PP
            </button>
          </>
        )}

        {phase === 'result' && outcome && outcome.id === 'lose' && (
          <button onClick={handleClose} className="ghost-btn w-full py-3 text-sm">
            Close
          </button>
        )}
      </div>
    </div>
  );
}

function ConfettiBurst() {
  const particles = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((i) => {
        const angle = (i / particles.length) * 360;
        const distance = 80 + Math.random() * 120;
        const x = Math.cos((angle * Math.PI) / 180) * distance;
        const y = Math.sin((angle * Math.PI) / 180) * distance;
        return (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
            style={{
              background: ['#39ff14', '#ffff00', '#ff2d2d'][i % 3],
              animation: `confetti-burst 1.2s ease-out ${i * 0.05}s forwards`,
              '--tx': `${x}px`, '--ty': `${y}px`,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}

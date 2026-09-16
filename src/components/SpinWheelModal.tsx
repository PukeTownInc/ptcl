import { useCallback, useEffect, useRef, useState } from 'react';
import { Tv, X, Play } from 'lucide-react';
import { formatPP } from '../constants';

export type WheelOutcome = 'double' | 'lose' | 'half' | 'safe';
export interface WheelResult {
  outcome: WheelOutcome;
  amount: number;
}

interface Segment {
  id: WheelOutcome;
  label: string;
  probability: number;
  startAngle: number;
  endAngle: number;
}

// ✅ MATCHES YOUR WHEEL IMAGE EXACTLY — CLOCKWISE FROM TOP:
// LOSE (red, 40%) → HALF (orange, 30%) → SAFE (green, 20%) → DOUBLE (bright green, 10%)
const SEGMENTS: Segment[] = [
  { id: 'lose',   label: 'LOSE',   probability: 0.40, startAngle: 0,    endAngle: 144 },
  { id: 'half',   label: 'HALF',   probability: 0.30, startAngle: 144,  endAngle: 252 },
  { id: 'safe',   label: 'SAFE',   probability: 0.20, startAngle: 252,  endAngle: 324 },
  { id: 'double', label: 'DOUBLE', probability: 0.10, startAngle: 324,  endAngle: 360 },
];

function pickSegment(): Segment {
  const r = Math.random();
  let cumulative = 0;
  for (const seg of SEGMENTS) {
    cumulative += seg.probability;
    if (r < cumulative) return seg;
  }
  return SEGMENTS[0];
}

// ✅ PAYOUTS — EXACTLY WHAT IT LANDS ON
function getAmount(outcome: WheelOutcome, stake: number): number {
  switch (outcome) {
    case 'double': return stake * 2;
    case 'safe':   return stake;
    case 'half':   return Math.floor(stake * 0.5);
    case 'lose':   return 0;
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
  const safeStake = Math.max(0, stake);
  const [rotation, setRotation] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [selected, setSelected] = useState<Segment | null>(null);
  const spinTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimeout.current) clearTimeout(spinTimeout.current);
    };
  }, []);

  const handleSpin = useCallback(() => {
    if (phase !== 'idle') return;
    setPhase('spinning');
    
    const seg = pickSegment();
    setSelected(seg);
    
    const segmentArc = seg.endAngle - seg.startAngle;
    const targetAngle = seg.startAngle + segmentArc / 2;
    const fullSpins = 5;
    const totalRotation = fullSpins * 360 + (360 - targetAngle);
    
    setRotation((prev) => prev + totalRotation);
    
    spinTimeout.current = setTimeout(() => {
      setPhase('result');
    }, 4000);
  }, [phase]);

  const handleClaim = useCallback(() => {
    if (!selected || phase !== 'result') return;
    const amount = getAmount(selected.id, safeStake);
    onClaim({ outcome: selected.id, amount });
  }, [selected, phase, safeStake, onClaim]);

  const handleClose = useCallback(() => {
    if (phase === 'spinning') return;
    if (phase === 'result' && selected?.id === 'lose') {
      onLose();
    } else {
      onForfeit();
    }
  }, [phase, selected, onLose, onForfeit]);

  const resultAmount = selected ? getAmount(selected.id, safeStake) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-gray-900 rounded-xl p-6 max-w-sm w-full text-center border border-green-500/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-green-400">☢️ RADIOACTIVE RISK WHEEL</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        
        <p className="text-xs text-gray-400 mb-4">Staked: {formatPP(safeStake)} PP</p>
        
        {/* Wheel */}
        <div className="relative w-64 h-64 mx-auto mb-4">
          <div 
            className="w-full h-full rounded-full border-4 border-yellow-400 relative overflow-hidden transition-transform duration-[4000ms] ease-out"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <img 
              src="/radioactive-risk-wheel.png" 
              alt="Risk Wheel"
              className="w-full h-full object-contain"
            />
          </div>
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-yellow-400" />
          </div>
        </div>

        {phase === 'result' && selected && (
          <div className="mb-4 space-y-2">
            <p className="text-xl font-bold">
              {selected.id === 'double' && <span className="text-green-400">☢️ DOUBLE!</span>}
              {selected.id === 'lose' && <span className="text-red-400">☠️ LOSE ALL</span>}
              {selected.id === 'half' && <span className="text-orange-400">⚠️ HALVED</span>}
              {selected.id === 'safe' && <span className="text-blue-400">🛡️ SAFE</span>}
            </p>
            <p className="text-lg font-mono">
              {selected.id === 'lose' ? (
                <span className="text-red-400">— 0 —</span>
              ) : (
                <span className="text-green-400">+{formatPP(resultAmount)} PP</span>
              )}
            </p>
          </div>
        )}

        {phase === 'idle' && (
          <button
            onClick={handleSpin}
            className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Play size={18} /> SPIN WHEEL
          </button>
        )}

        {phase === 'spinning' && (
          <p className="text-gray-400 py-3">Spinning...</p>
        )}

        {phase === 'result' && (
          <button
            onClick={handleClaim}
            className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold transition-colors"
          >
            {selected?.id === 'lose' ? 'CONFIRM' : 'COLLECT & CONTINUE'}
          </button>
        )}
      </div>
    </div>
  );
}

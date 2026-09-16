import { useCallback, useEffect, useRef, useState } from 'react';
import { Tv, X, Play } from 'lucide-react';
import { formatPP } from '../constants';

export type WheelOutcome = 'double' | 'lose' | 'half' | 'safe';

export interface WheelResult {
  outcome: WheelOutcome;
  multiplier: number;
  finalPP: number;
}

interface Props {
  stake: number;
  isOpen: boolean;
  onClose: () => void;
  onResult: (result: WheelResult) => void;
}

// ✅ ODDS: Lose 40% • Half 30% • Safe 20% • Double 10%
const SEGMENTS = [
  { id: 'lose' as const,    label: 'LOSE ALL',  color: '#ef4444', weight: 40, multiplier: 0 },
  { id: 'half' as const,    label: 'LOSE HALF', color: '#f59e0b', weight: 30, multiplier: 0.5 },
  { id: 'safe' as const,    label: 'SAFE',      color: '#3b82f6', weight: 20, multiplier: 1 },
  { id: 'double' as const,  label: 'DOUBLE',    color: '#39FF14', weight: 10, multiplier: 2 },
];

const TOTAL_WEIGHT = SEGMENTS.reduce((s, seg) => s + seg.weight, 0);

function pickSegment(): typeof SEGMENTS[number] {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const seg of SEGMENTS) {
    roll -= seg.weight;
    if (roll <= 0) return seg;
  }
  return SEGMENTS[0];
}

export function SpinWheelModal({ stake, isOpen, onClose, onResult }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<WheelResult | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ✅ Calculate final values
  const getFinalValue = useCallback((multiplier: number) => {
    return Math.round(stake * multiplier);
  }, [stake]);

  // Draw wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2 - 10;

    ctx.clearRect(0, 0, w, h);
    let startAngle = -Math.PI / 2;

    SEGMENTS.forEach((seg) => {
      const sliceAngle = (seg.weight / TOTAL_WEIGHT) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(seg.label, r - 20, 5);
      ctx.restore();

      startAngle += sliceAngle;
    });

    // Center logo circle
    ctx.beginPath();
    ctx.arc(cx, cy, 50, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#39FF14';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Center text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RISK', cx, cy - 5);
    ctx.font = '9px sans-serif';
    ctx.fillText('WHEEL', cx, cy + 10);
  }, [isOpen]);

  const spin = useCallback(() => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);

    const picked = pickSegment();
    const finalPP = getFinalValue(picked.multiplier);
    
    // Calculate rotation so it lands on the picked segment
    const segIndex = SEGMENTS.findIndex(s => s.id === picked.id);
    const segAngle = (picked.weight / TOTAL_WEIGHT) * 360;
    const randomOffset = (Math.random() - 0.5) * segAngle * 0.6;
    const targetRotation = rotation + 1800 + randomOffset;

    setRotation(targetRotation);

    setTimeout(() => {
      const wheelResult: WheelResult = {
        outcome: picked.id,
        multiplier: picked.multiplier,
        finalPP,
      };
      setResult(wheelResult);
      setSpinning(false);
    }, 4000);
  }, [spinning, rotation, getFinalValue]);

  const handleClaim = useCallback(() => {
    if (!result) return;
    onResult(result);
    setResult(null);
    onClose();
  }, [result, onResult, onClose]);

  // ✅ Close = return stake as SAFE
  const handleClose = useCallback(() => {
    if (spinning) return;
    if (!result) {
      // User closed without spinning → return stake unchanged
      onResult({
        outcome: 'safe',
        multiplier: 1,
        finalPP: stake,
      });
    }
    onClose();
  }, [spinning, result, stake, onResult, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-ink-800 border-2 border-toxic-400 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-[0_0_30px_rgba(57,255,20,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-toxic-300 font-mono">☢️ RADIOACTIVE RISK WHEEL</h2>
          <button 
            onClick={handleClose}
            className="text-toxic-100/50 hover:text-toxic-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stake Display */}
        <div className="text-center mb-4">
          <p className="text-[10px] text-toxic-100/50 uppercase tracking-wider">AT STAKE</p>
          <p className="font-mono text-lg font-bold text-radioactive-400">
            {formatPP(stake)} PP
          </p>
        </div>

        {/* Wheel */}
        <div className="relative w-full aspect-square max-w-xs mx-auto mb-4">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 text-toxic-300 text-2xl">▼</div>
          
          <div 
            className="w-full h-full transition-transform duration-[4000ms] ease-out"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <canvas 
              ref={canvasRef} 
              width={320} 
              height={320} 
              className="w-full h-full rounded-full"
            />
          </div>
        </div>

        {/* ✅ RESULT — Correct values per outcome */}
        {result && !spinning && (
          <div className="text-center space-y-3 mb-4 animate-pulse">
            <p className="text-lg font-bold">
              {result.outcome === 'double' && (
                <span className="text-toxic-300">🎉 DOUBLE — ×2!</span>
              )}
              {result.outcome === 'safe' && (
                <span className="text-blue-400">🛡️ SAFE — Stake Returned!</span>
              )}
              {result.outcome === 'half' && (
                <span className="text-amber-400">⚠️ HALVED — ×0.5</span>
              )}
              {result.outcome === 'lose' && (
                <span className="text-red-400">☠️ LOST — ×0</span>
              )}
            </p>
            
            {/* ✅ Shows exactly what applies */}
            <p className="font-mono text-xl font-bold text-white">
              {result.outcome === 'lose' ? (
                <span className="text-red-400">0 PP</span>
              ) : result.outcome === 'safe' ? (
                <span className="text-blue-400">{formatPP(result.finalPP)} PP — Stake Kept</span>
              ) : (
                <span className={result.outcome === 'double' ? 'text-toxic-300' : 'text-amber-400'}>
                  {formatPP(result.finalPP)} PP
                </span>
              )}
            </p>
            
            <button
              onClick={handleClaim}
              className="w-full py-2.5 bg-toxic-500 text-black font-bold rounded-lg hover:bg-toxic-400 transition-colors"
            >
              CLAIM
            </button>
          </div>
        )}

        {/* Spin Button */}
        {!result && (
          <button
            onClick={spin}
            disabled={spinning}
            className="w-full py-3 bg-radioactive-500 text-black font-bold rounded-lg hover:bg-radioactive-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Play size={18} />
            {spinning ? 'SPINNING...' : 'SPIN TO RISK'}
          </button>
        )}

        {/* Legend — ✅ Clear what each gives */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div className="bg-green-900/30 p-2 rounded border border-green-500/30">
            <span className="text-green-400 font-bold">DOUBLE ×2</span>
            <p className="text-toxic-100/50 mt-1">= {formatPP(stake * 2)} PP</p>
          </div>
          <div className="bg-blue-900/30 p-2 rounded border border-blue-500/30">
            <span className="text-blue-400 font-bold">SAFE</span>
            <p className="text-toxic-100/50 mt-1">= {formatPP(stake)} PP — Stake Back</p>
          </div>
          <div className="bg-amber-900/30 p-2 rounded border border-amber-500/30">
            <span className="text-amber-400 font-bold">HALF ×0.5</span>
            <p className="text-toxic-100/50 mt-1">= {formatPP(Math.round(stake * 0.5))} PP</p>
          </div>
          <div className="bg-red-900/30 p-2 rounded border border-red-500/30">
            <span className="text-red-400 font-bold">LOSE ALL ×0</span>
            <p className="text-toxic-100/50 mt-1">= 0 PP</p>
          </div>
        </div>
      </div>
    </div>
  );
}

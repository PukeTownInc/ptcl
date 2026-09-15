import { useState, useEffect } from 'react';
import { X, Zap, AlertTriangle, Trophy, Coins, ShieldCheck } from 'lucide-react';
import { formatPP } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

export type WheelResult = {
  outcome: 'double' | 'half' | 'safe';
  finalPP: number;
};

interface Props {
  stake: number;
  onClaim: (result: WheelResult) => void;
  onLose: () => void;
  onForfeit: () => void;
}

// ✅ NEW ODDS: Lose 40% • Half 30% • Safe 20% • Double 10%
const SEGMENTS = [
  { label: 'DOUBLE', color: '#39FF14', weight: 10, outcome: 'double' as const, multiplier: 2 },
  { label: 'HALF', color: '#FFFF00', weight: 30, outcome: 'half' as const, multiplier: 0.5 },
  { label: 'SAFE', color: '#4488FF', weight: 20, outcome: 'safe' as const, multiplier: 1 },
  { label: 'SPILL', color: '#FF4444', weight: 40, outcome: 'lose' as const, multiplier: 0 },
];

const TOTAL_WEIGHT = SEGMENTS.reduce((sum, s) => sum + s.weight, 0);

function pickSegment() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const seg of SEGMENTS) {
    roll -= seg.weight;
    if (roll <= 0) return seg;
  }
  return SEGMENTS[SEGMENTS.length - 1];
}

export function SpinWheelModal({ stake, onClaim, onLose, onForfeit }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<typeof SEGMENTS[number] | null>(null);
  const [rotation, setRotation] = useState(0);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);

    const winningSeg = pickSegment();
    const segAngle = 360 / SEGMENTS.length;
    const targetAngle = SEGMENTS.indexOf(winningSeg) * segAngle + segAngle / 2;
    const spins = 5 + Math.random() * 3;
    const finalRotation = rotation + spins * 360 + (360 - targetAngle);

    setRotation(finalRotation);

    setTimeout(() => {
      setResult(winningSeg);
      setSpinning(false);

      if (winningSeg.outcome === 'lose') {
        onLose();
      } else {
        onClaim({
          outcome: winningSeg.outcome,
          finalPP: Math.floor(stake * winningSeg.multiplier),
        });
      }
    }, 4000);
  };

  const forfeit = () => {
    onForfeit();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm px-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-sm grunge-panel p-6 relative"
        >
          <button
            onClick={forfeit}
            disabled={spinning}
            className="absolute top-3 right-3 text-toxic-100/40 hover:text-toxic-100 disabled:opacity-30"
          >
            <X size={20} />
          </button>

          <div className="text-center mb-4">
            <h2 className="font-display font-bold text-xl text-radioactive-400 flex items-center justify-center gap-2">
              ⚖️ Radioactive Risk Wheel
            </h2>
            <p className="text-sm text-toxic-100/50 mt-1">
              Stake: <span className="font-mono text-toxic-300 font-bold">{formatPP(stake)} Puke Points</span>
            </p>
          </div>

          {/* Wheel */}
          <div className="relative w-64 h-64 mx-auto mb-6">
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
              <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[24px] border-l-transparent border-r-transparent border-t-radioactive-400 drop-shadow-lg" />
            </div>

            {/* Spinning Wheel */}
            <div
              className="w-full h-full rounded-full border-8 border-radioactive-400 relative overflow-hidden shadow-[0_0_30px_rgba(255,255,0,0.3)]"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
              }}
            >
              {SEGMENTS.map((seg, i) => {
                const angle = 360 / SEGMENTS.length;
                const rotate = i * angle;
                return (
                  <div key={i} className="absolute inset-0" style={{ transform: `rotate(${rotate}deg)` }}>
                    <div
                      className="absolute top-0 left-1/2 w-1/2 h-1/2 origin-bottom-left flex items-start justify-center pt-4"
                      style={{
                        transform: `rotate(${angle / 2}deg) skewY(${90 - angle}deg)`,
                        backgroundColor: seg.color,
                        opacity: 0.85,
                      }}
                    >
                      <span
                        className="text-black font-bold text-xs font-mono tracking-wider"
                        style={{ transform: `skewY(${angle - 90}deg) rotate(${angle / 4}deg)` }}
                      >
                        {seg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
              {/* Center cap */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black border-4 border-radioactive-400 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,0,0.5)]">
                <Zap size={28} className="text-radioactive-400" />
              </div>
            </div>
          </div>

          {/* Result display */}
          <AnimatePresence>
            {result && !spinning && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center mb-4 p-3 rounded-lg border"
                style={{
                  backgroundColor: `${result.color}15`,
                  borderColor: `${result.color}50`,
                }}
              >
                {result.outcome === 'lose' ? (
                  <>
                    <AlertTriangle size={28} className="text-red-400 mx-auto mb-1" />
                    <div className="font-display font-bold text-lg text-red-400">☠️ SPILLED!</div>
                    <div className="text-sm text-red-300/70">All washed away — better containment next time</div>
                  </>
                ) : result.outcome === 'double' ? (
                  <>
                    <Trophy size={28} className="text-toxic-400 mx-auto mb-1" />
                    <div className="font-display font-bold text-lg text-toxic-400">☢️ DOUBLED!</div>
                    <div className="font-mono text-xl font-bold text-toxic-300">+{formatPP(Math.floor(stake * 2))} PP</div>
                  </>
                ) : result.outcome === 'half' ? (
                  <>
                    <Coins size={28} className="text-hazard-amber mx-auto mb-1" />
                    <div className="font-display font-bold text-lg text-hazard-amber">⚠️ HALVED</div>
                    <div className="font-mono text-xl font-bold text-hazard-amber">+{formatPP(Math.floor(stake * 0.5))} PP</div>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={28} className="text-blue-400 mx-auto mb-1" />
                    <div className="font-display font-bold text-lg text-blue-400">☣️ SECURED</div>
                    <div className="font-mono text-xl font-bold text-blue-300">+{formatPP(Math.floor(stake))} PP — Stake Protected</div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Updated odds legend */}
          <div className="text-center text-[10px] font-mono text-toxic-100/40 mb-4 space-y-1">
            <div className="flex flex-wrap justify-center gap-3">
              <span className="text-toxic-400">☢️ Double: 10%</span>
              <span className="text-hazard-amber">⚠️ Half: 30%</span>
              <span className="text-blue-400">☣️ Safe: 20%</span>
              <span className="text-red-400">☠️ Spill: 40%</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={forfeit}
              disabled={spinning || !!result}
              className="flex-1 ghost-btn py-2.5 text-sm disabled:opacity-30"
            >
              Bank Stake
            </button>
            <button
              onClick={spin}
              disabled={spinning || !!result}
              className="flex-1 toxic-btn py-2.5 text-sm disabled:opacity-30"
            >
              {spinning ? 'Spinning...' : 'CONTAMINATE'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

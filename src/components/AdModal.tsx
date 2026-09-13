import { useEffect, useState } from 'react';
import { Tv, X, CheckCircle2, Loader2 } from 'lucide-react';

interface AdModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  title: string;
  subtitle?: string;
  reward: string;
  duration?: number;
}

export function AdModal({ open, onClose, onComplete, title, subtitle, reward, duration = 5 }: AdModalProps) {
  const [phase, setPhase] = useState<'countdown' | 'playing' | 'done'>('countdown');
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      setPhase('countdown');
      setSecondsLeft(duration);
      setProgress(0);
      return;
    }
    setPhase('playing');
    setSecondsLeft(duration);
  }, [open, duration]);

  useEffect(() => {
    if (!open || phase !== 'playing') return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setPhase('done');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [open, phase]);

  useEffect(() => {
    if (!open) return;
    const pct = ((duration - secondsLeft) / duration) * 100;
    setProgress(pct);
  }, [secondsLeft, open, duration]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="grunge-panel neon-border-yellow w-full max-w-sm overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-4 py-3 bg-radioactive-500/10 border-b border-radioactive-600/30">
          <div className="flex items-center gap-2">
            <Tv size={18} className="text-radioactive-400" />
            <span className="font-display font-bold text-radioactive-400 uppercase text-sm">Rewarded Ad</span>
          </div>
          <span className="font-mono text-xs text-radioactive-300">{secondsLeft}s</span>
        </div>

        <div className="p-6 text-center">
          <div className="relative mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-b from-ink-700 to-ink-900 border border-radioactive-600/30">
            {phase === 'playing' ? (
              <Loader2 size={48} className="animate-spin text-radioactive-400" />
            ) : phase === 'done' ? (
              <CheckCircle2 size={56} className="text-toxic-400 animate-pop" />
            ) : (
              <Tv size={48} className="text-radioactive-400" />
            )}
            <div className="absolute -bottom-1 left-2 right-2 h-1 bg-ink-600 rounded-full overflow-hidden">
              <div className="h-full bg-radioactive-400 transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <h3 className="font-display font-bold text-lg text-toxic-300 neon-text">{title}</h3>
          {subtitle && <p className="text-sm text-toxic-100/60 mt-1">{subtitle}</p>}

          {phase === 'done' ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-toxic-500/10 border border-toxic-600/40 py-2 px-3">
                <span className="text-toxic-400 font-display font-bold neon-text">Reward: {reward}</span>
              </div>
              <button
                className="toxic-btn w-full py-3"
                onClick={() => { onComplete(); onClose(); }}
              >
                Claim Reward
              </button>
            </div>
          ) : (
            <p className="mt-4 text-xs text-radioactive-300/70 font-mono">
              {phase === 'playing' ? 'Ad playing... do not close' : 'Loading ad...'}
            </p>
          )}
        </div>

        {phase !== 'done' && (
          <button
            className="absolute top-2 right-2 p-1.5 rounded-full bg-ink-700/80 text-toxic-200 hover:text-toxic-400"
            onClick={onClose}
            aria-label="Close ad"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

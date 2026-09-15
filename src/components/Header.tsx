import { useEffect, useState } from 'react';
import type { Screen } from '../types';
import { NavDropdown } from './NavDropdown';
import { formatPP, ppToUsd } from '../constants';

interface HeaderProps {
  active: Screen;
  onChange: (s: Screen, target?: string) => void;
  children?: React.ReactNode;
  lockedPP: number;
  withdrawablePP: number;
}

export function Header({ active, onChange, children, lockedPP, withdrawablePP }: HeaderProps) {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const utc = now.toISOString().slice(11, 16);
      setTime(utc + ' UTC');
    };
    tick();
    const i = setInterval(tick, 30000);
    return () => clearInterval(i);
  }, []);

  const UNLOCK_THRESHOLD = 50000;
  const progressPct = Math.min(100, (lockedPP / UNLOCK_THRESHOLD) * 100);
  const isUnlocked = lockedPP >= UNLOCK_THRESHOLD;

  return (
    <header className="sticky top-0 z-30 safe-top">
      {/* Top Nav Bar */}
      <div className="bg-ink-900/80 backdrop-blur-md border-b border-toxic-900/40">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center justify-between">
          <NavDropdown active={active} onChange={onChange} />
          <div className="flex items-center gap-3">
            {children}
            <div className="text-right">
              <div className="font-mono text-[10px] text-toxic-100/50">{time}</div>
              <div className="text-[8px] font-mono text-toxic-100/30">Resets 00:00 UTC</div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ PERMANENT BALANCE SUB-HEADER */}
      <div className="bg-ink-800/60 backdrop-blur-sm border-b border-toxic-900/30">
        <div className="mx-auto max-w-md px-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            {/* LOCKED CONTAGION VAULT */}
            <div className="text-left">
              <div className="text-[9px] font-display uppercase tracking-wider text-toxic-400/70">
                ☢️ LOCKED CONTAGION VAULT
              </div>
              {/* ✅ BIG NUMBER: Value / 50,000 (XX%) */}
              <div className="font-mono text-sm font-bold text-toxic-300">
                {formatPP(lockedPP)} / 50,000 ({Math.round(progressPct)}%)
              </div>
              <div className="flex items-center gap-1 mt-1">
                <div className="h-1 flex-1 rounded-full bg-ink-900 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${isUnlocked ? 'bg-hazard-amber' : 'bg-toxic-400'}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
              <div className="text-[8px] font-mono text-toxic-100/30 mt-0.5">
                {isUnlocked ? '✅ UNLOCKED!' : 'Watch ads to unlock'}
              </div>
            </div>

            {/* UNLOCKED CONTAGION VAULT */}
            <div className="text-right">
              <div className="text-[9px] font-display uppercase tracking-wider text-radioactive-400/70">
                ⚡ UNLOCKED CONTAGION VAULT
              </div>
              <div className="font-mono text-sm font-bold text-radioactive-400 neon-text-yellow">
                {formatPP(withdrawablePP)} PP
              </div>
              <div className="text-[8px] font-mono text-radioactive-300/40 mt-1">
                ${ppToUsd(withdrawablePP).toFixed(2)} USD
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

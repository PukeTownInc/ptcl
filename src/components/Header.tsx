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
  xp: number;
}

// ✅ INFINITE LEVELS — 1,000 XP per level, NO CAP
const XP_PER_LEVEL = 1000;

export function Header({
  active,
  onChange,
  children,
  lockedPP,
  withdrawablePP,
  xp,
}: HeaderProps) {
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

  // Vault unlock at 50,000 — matches your requirement
  const UNLOCK_THRESHOLD = 50000;
  const progressPct = Math.min(100, (lockedPP / UNLOCK_THRESHOLD) * 100);
  const isUnlocked = lockedPP >= UNLOCK_THRESHOLD;

  // ✅ PERFECT INFINITE LEVEL CALCS
  const currentLevel = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = xp % XP_PER_LEVEL;
  const xpProgressPct = Math.min(100, (xpIntoLevel / XP_PER_LEVEL) * 100);
  const xpNeeded = XP_PER_LEVEL - xpIntoLevel;

  return (
    <header className="sticky top-0 z-40 safe-top">
      {/* TOP NAV BAR */}
      <div className="bg-ink-900/80 backdrop-blur-md border-b border-toxic-900/40 relative z-40">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center justify-between">
          <div className="relative z-50">
            <NavDropdown active={active} onChange={onChange} />
          </div>
          <div className="flex items-center gap-3">
            {children}
            <div className="text-right">
              <div className="font-mono text-[10px] text-toxic-100/50">{time}</div>
              <div className="text-[8px] font-mono text-toxic-100/30">Resets 00:00 UTC</div>
            </div>
          </div>
        </div>
      </div>

      {/* BALANCE + XP SUB-HEADER */}
      <div className="bg-ink-800/60 backdrop-blur-sm border-b border-toxic-900/30 relative z-30">
        <div className="mx-auto max-w-md px-3 py-2 space-y-2">
          {/* VAULT ROW */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-left">
              <div className="text-[9px] font-display uppercase tracking-wider text-toxic-400/70">
                ☢️ LOCKED CONTAGION VAULT
              </div>
              <div className="font-mono text-sm font-bold text-toxic-300">
                {formatPP(lockedPP)} / 50,000 ({Math.round(progressPct)}%)
              </div>
              {isUnlocked && (
                <div className="text-[8px] font-mono text-hazard-amber mt-0.5">
                  ✅ UNLOCKED!
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[9px] font-display uppercase tracking-wider text-radioactive-400/70">
                ⚡ UNLOCKED CONTAGION VAULT
              </div>
              <div className="font-mono text-sm font-bold text-radioactive-400 neon-text-yellow">
                {formatPP(withdrawablePP)} PP{' '}
                <span className="text-radioactive-300/60 font-normal">
                  ${ppToUsd(withdrawablePP).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* RADIATION EXPOSURE — LEVEL + PROGRESS */}
          <div className="flex items-center gap-3 pt-1 border-t border-toxic-900/20">
            <div className="text-[9px] font-display uppercase tracking-wider text-toxic-400/70 whitespace-nowrap">
              ☢️ RADIATION EXPOSURE
            </div>
            <span className="font-mono text-xs font-bold text-radioactive-400 whitespace-nowrap">
              LVL {currentLevel}
            </span>
            <span className="font-mono text-xs font-bold text-toxic-300 whitespace-nowrap">
              {xpIntoLevel.toLocaleString()}/{XP_PER_LEVEL.toLocaleString()}
            </span>
            <div className="flex-1 h-2 rounded-full bg-ink-900 overflow-hidden">
              <div
                className="h-full bg-toxic-400 transition-all duration-500"
                style={{ width: `${xpProgressPct}%` }}
              />
            </div>
            <span className="font-mono text-[11px] text-toxic-300/80 whitespace-nowrap">
              {xpNeeded} XP ➜ LVL{currentLevel + 1}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

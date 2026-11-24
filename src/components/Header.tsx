import { useEffect, useState } from 'react';
import type { Screen } from '../types';
import { NavDropdown } from './NavDropdown';
import { formatPP, ppToUsd } from '../constants';
import { useAuth } from '../lib/auth';
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
  const { signOut } = useAuth();
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const utc = now.toISOString().slice(11, 16);
      setTime(utc + ' UTC');
    };
    tick();
    const i = setInterval(tick, 30000);
    return (
    <header className="pt-global-header safe-top">
      <div className="pt-header-grid">
        <div className="pt-header-brand"><NavDropdown active={active} onChange={onChange} /></div>
        <div className="pt-header-player">
          <span className="pt-header-caption">PLAYER STATUS</span>
          <strong>CONTAMINATION LEVEL {currentLevel}</strong>
          <div className="pt-header-xp-track"><i style={{ width: `${xpProgressPct}%` }} /></div>
          <small>{xpIntoLevel.toLocaleString()} / {XP_PER_LEVEL.toLocaleString()} EXPOSURE XP</small>
        </div>
        <div className="pt-header-stat pt-header-locked">
          <span>LOCKED VAULT</span><strong>{formatPP(lockedPP)}</strong><small>{Math.round(progressPct)}% TO UNLOCK</small>
        </div>
        <div className="pt-header-stat pt-header-unlocked">
          <span>UNLOCKED VAULT</span><strong>{formatPP(withdrawablePP)} PP</strong><small>EST. ${ppToUsd(withdrawablePP).toFixed(2)}</small>
        </div>
        <div className="pt-header-actions">
          <span>{time || '— UTC'}</span>
          <button onClick={() => signOut()}>LOG OUT</button>
        </div>
      </div>
      <div className="pt-header-reset">☢ DAILY SYSTEM RESET · 00:00 UTC</div>
    </header>
  );
}

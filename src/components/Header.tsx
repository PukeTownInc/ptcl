import { useEffect, useState } from 'react';
import type { Screen } from '../types';
import { NavDropdown } from './NavDropdown';

interface HeaderProps {
  active: Screen;
  onChange: (s: Screen, target?: string) => void;
  children?: React.ReactNode;
}

export function Header({ active, onChange, children }: HeaderProps) {
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

  return (
    <header className="sticky top-0 z-30 safe-top">
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
    </header>
  );
}

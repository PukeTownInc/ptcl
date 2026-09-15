import { useEffect, useRef, useState } from 'react';
import { Home, Gamepad2, Target, Trophy, Wallet, Settings, User, Check, Zap, FlaskConical, ChevronDown, ChevronRight } from 'lucide-react';
import type { Screen } from '../types';

const SUBMENU_ALLIES_LABEL = '☣️ TOXIC ALLIES';
const SUBMENU_ALLIES_ITEMS: { id: Screen; label: string; icon: typeof Home }[] = [
  { id: 'profile', label: 'Radiation Profile', icon: User },
  // FUTURE: add factions/teams here later
];

const SUBMENU_INFECTION_LABEL = '☢️ INFECTION & RANKS';
const SUBMENU_INFECTION_ITEMS: { id: Screen; label: string; icon: typeof Home }[] = [
  { id: 'missions', label: 'Daily Contamination', icon: Target },
  { id: 'leaderboards', label: 'Infection Ranks', icon: Trophy },
];

const SUBMENU_GAMES_LABEL = '⚛️ REACTOR WORKS';
const SUBMENU_GAMES_ITEMS: { id: Screen; label: string; icon: typeof Home }[] = [
  { id: 'slots', label: 'Reactor Reels', icon: Gamepad2 },
  { id: 'vialmixer', label: 'Contamination Lab', icon: FlaskConical },
];

const SUBMENU_ECOSYSTEM_LABEL = '🛡️ ECOSYSTEM OPTIONS';
const SUBMENU_ECOSYSTEM_ITEMS: { id: Screen; label: string; icon: typeof Home }[] = [
  { id: 'roadmap', label: 'Fallout Forecast', icon: Zap },
  { id: 'withdraw', label: 'Waste Withdrawal', icon: Wallet },
  { id: 'settings', label: 'Lab Controls', icon: Settings },
];

export function NavDropdown({ active, onChange }: { active: Screen; onChange: (s: Screen, target?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [subAlliesOpen, setSubAlliesOpen] = useState(false);
  const [subInfectionOpen, setSubInfectionOpen] = useState(false);
  const [subGamesOpen, setSubGamesOpen] = useState(false);
  const [subEcosystemOpen, setSubEcosystemOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setSubAlliesOpen(false);
      setSubInfectionOpen(false);
      setSubGamesOpen(false);
      setSubEcosystemOpen(false);
      return;
    }
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSubAlliesOpen(false);
        setSubInfectionOpen(false);
        setSubGamesOpen(false);
        setSubEcosystemOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSubAlliesOpen(false);
        setSubInfectionOpen(false);
        setSubGamesOpen(false);
        setSubEcosystemOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleSelect = (s: Screen) => {
    onChange(s);
    setOpen(false);
    setSubAlliesOpen(false);
    setSubInfectionOpen(false);
    setSubGamesOpen(false);
    setSubEcosystemOpen(false);
  };

  const isAlliesActive = SUBMENU_ALLIES_ITEMS.some(item => item.id === active);
  const isInfectionActive = SUBMENU_INFECTION_ITEMS.some(item => item.id === active);
  const isGamesActive = SUBMENU_GAMES_ITEMS.some(item => item.id === active);
  const isEcosystemActive = SUBMENU_ECOSYSTEM_ITEMS.some(item => item.id === active);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 active:scale-[0.97] transition-transform"
        aria-label="Toggle navigation menu"
      >
        <div className="relative">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-b from-toxic-400 to-toxic-700 flex items-center justify-center animate-glow-pulse">
            <img 
              src="/logo-192.png" 
              alt="Menu" 
              style={{ 
                height: '28px', 
                width: '28px',
                objectFit: 'contain',
                display: 'block'
              }} 
            />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-radioactive-400 animate-pulse" />
        </div>
        <div className="text-left">
          <h1 className="font-display font-black text-sm text-toxic-400 neon-text leading-none tracking-wide">PUKE TOWN</h1>
          <p className="text-[8px] font-mono text-radioactive-400/70 leading-none mt-0.5">CASH LAB ☢️</p>
        </div>
      </button>

      {open && (
        <div
          className="absolute top-[50px] left-0 z-[999] py-2 min-w-[220px] animate-fade-in"
          style={{
            background: '#0f1f14',
            border: '2px solid #22c55e',
            borderRadius: '12px',
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)',
          }}
        >
          {/* 1. Contamination Zone */}
          <button
            onClick={() => handleSelect('home')}
            className={`w-full flex items-center gap-3 px-5 py-3.5 text-[15px] font-medium transition-all ${
              active === 'home' ? 'bg-green-500/15 text-green-400 border-l-[3px] border-green-500' : 'text-gray-200 hover:bg-green-500/10 hover:text-green-400'
            }`}
          >
            <Home size={18} />
            <span className="flex-1 text-left">Contamination Zone</span>
            {active === 'home' && <Check size={16} className="text-green-400" />}
          </button>

          {/* ☣️ TOXIC ALLIES */}
          <button
            onClick={() => setSubAlliesOpen((v) => !v)}
            className={`w-full flex items-center gap-3 px-5 py-3.5 text-[15px] font-medium transition-all border-t border-green-900/30 ${
              isAlliesActive || subAlliesOpen ? 'bg-green-500/10 text-green-400' : 'text-gray-200 hover:bg-green-500/10 hover:text-green-400'
            }`}
          >
            {subAlliesOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span className="flex-1 text-left font-semibold">{SUBMENU_ALLIES_LABEL}</span>
          </button>
          {subAlliesOpen && (
            <div className="border-t border-green-900/20">
              {SUBMENU_ALLIES_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleSelect(id)}
                  className={`w-full flex items-center gap-3 px-5 py-3 pl-10 text-[15px] font-medium transition-all ${
                    active === id ? 'bg-green-500/15 text-green-400 border-l-[3px] border-green-500' : 'text-gray-300 hover:bg-green-500/10 hover:text-green-400'
                  }`}
                >
                  <Icon size={16} />
                  <span className="flex-1 text-left">{label}</span>
                  {active === id && <Check size={14} className="text-green-400" />}
                </button>
              ))}
            </div>
          )}

          {/* ☢️ INFECTION & RANKS */}
          <button
            onClick={() => setSubInfectionOpen((v) => !v)}
            className={`w-full flex items-center gap-3 px-5 py-3.5 text-[15px] font-medium transition-all border-t border-green-900/30 ${
              isInfectionActive || subInfectionOpen ? 'bg-green-500/10 text-green-400' : 'text-gray-200 hover:bg-green-500/10 hover:text-green-400'
            }`}
          >
            {subInfectionOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span className="flex-1 text-left font-semibold">{SUBMENU_INFECTION_LABEL}</span>
          </button>
          {subInfectionOpen && (
            <div className="border-t border-green-900/20">
              {SUBMENU_INFECTION_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleSelect(id)}
                  className={`w-full flex items-center gap-3 px-5 py-3 pl-10 text-[15px] font-medium transition-all ${
                    active === id ? 'bg-green-500/15 text-green-400 border-l-[3px] border-green-500' : 'text-gray-300 hover:bg-green-500/10 hover:text-green-400'
                  }`}
                >
                  <Icon size={16} />
                  <span className="flex-1 text-left">{label}</span>
                  {active === id && <Check size={14} className="text-green-400" />}
                </button>
              ))}
            </div>
          )}

          {/* ⚛️ REACTOR WORKS */}
          <button
            onClick={() => setSubGamesOpen((v) => !v)}
            className={`w-full flex items-center gap-3 px-5 py-3.5 text-[15px] font-medium transition-all border-t border-green-900/30 ${
              isGamesActive || subGamesOpen ? 'bg-green-500/10 text-green-400' : 'text-gray-200 hover:bg-green-500/10 hover:text-green-400'
            }`}
          >
            {subGamesOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span className="flex-1 text-left font-semibold">{SUBMENU_GAMES_LABEL}</span>
          </button>
          {subGamesOpen && (
            <div className="border-t border-green-900/20">
              {SUBMENU_GAMES_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleSelect(id)}
                  className={`w-full flex items-center gap-3 px-5 py-3 pl-10 text-[15px] font-medium transition-all ${
                    active === id ? 'bg-green-500/15 text-green-400 border-l-[3px] border-green-500' : 'text-gray-300 hover:bg-green-500/10 hover:text-green-400'
                  }`}
                >
                  <Icon size={16} />
                  <span className="flex-1 text-left">{label}</span>
                  {active === id && <Check size={14} className="text-green-400" />}
                </button>
              ))}
            </div>
          )}

          {/* 🛡️ ECOSYSTEM OPTIONS */}
          <button
            onClick={() => setSubEcosystemOpen((v) => !v)}
            className={`w-full flex items-center gap-3 px-5 py-3.5 text-[15px] font-medium transition-all border-t border-green-900/30 ${
              isEcosystemActive || subEcosystemOpen ? 'bg-green-500/10 text-green-400' : 'text-gray-200 hover:bg-green-500/10 hover:text-green-400'
            }`}
          >
            {subEcosystemOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            <span className="flex-1 text-left font-semibold">{SUBMENU_ECOSYSTEM_LABEL}</span>
          </button>
          {subEcosystemOpen && (
            <div className="border-t border-green-900/20">
              {SUBMENU_ECOSYSTEM_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleSelect(id)}
                  className={`w-full flex items-center gap-3 px-5 py-3 pl-10 text-[15px] font-medium transition-all ${
                    active === id ? 'bg-green-500/15 text-green-400 border-l-[3px] border-green-500' : 'text-gray-300 hover:bg-green-500/10 hover:text-green-400'
                  }`}
                >
                  <Icon size={16} />
                  <span className="flex-1 text-left">{label}</span>
                  {active === id && <Check size={14} className="text-green-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { ArrowLeft, Boxes, CircleDot, Dice5, Gem, Grid3X3, Play, Radio, ShieldAlert, Sparkles } from 'lucide-react';
import type { Screen } from '../types';

type Props = { onNavigate: (screen: Screen) => void };

const machines = [
  { id: 'slots', title: 'Cash Lab Slots', subtitle: 'Reactor reels', icon: Sparkles, live: true },
  { id: 'plinko', title: 'Plinko', subtitle: 'Temporarily unavailable', icon: CircleDot, live: false },
  { id: 'crash', title: 'Crash', subtitle: 'Coming soon', icon: Radio, live: false },
  { id: 'dice', title: 'Dice', subtitle: 'Coming soon', icon: Dice5, live: false },
  { id: 'mines', title: 'Mines', subtitle: 'Coming soon', icon: Grid3X3, live: false },
  { id: 'towers', title: 'Towers', subtitle: 'Coming soon', icon: ShieldAlert, live: false },
  { id: 'wheel', title: 'Risk Wheel', subtitle: 'Available in Reactor Reels', icon: CircleDot, live: true },
  { id: 'cases', title: 'Contagion Cache', subtitle: 'Open reward crates', icon: Boxes, live: true },
] as const;

export function GameArenaScreen({ onNavigate }: Props) {
  return (
    <section className="pt-arena min-h-[70vh] max-w-5xl mx-auto overflow-hidden rounded-2xl">
      <div className="pt-arena-top flex items-center justify-between gap-3 p-4 sm:p-6">
        <button onClick={() => onNavigate('home')} className="pt-outline-button inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Town
        </button>
        <span className="text-[10px] tracking-[.22em] text-lime-300/70">TOXIC INDUSTRIES · ARCADE DISTRICT</span>
      </div>
      <div className="px-4 pb-5 text-center sm:px-8">
        <div className="text-4xl text-lime-300 drop-shadow-[0_0_18px_#84ff36]">☢</div>
        <h1 className="mt-2 text-3xl font-black tracking-wider text-lime-300 sm:text-5xl">GAMES ARENA</h1>
        <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-emerald-100/65 sm:text-sm">
          Select an operational machine. Unreleased games remain clearly marked and cannot affect your account.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4 sm:gap-4 sm:p-6">
        {machines.map(({ id, title, subtitle, icon: Icon, live }) => (
          <button
            key={id}
            type="button"
            disabled={!live}
            onClick={() => {
              if (id === 'slots') onNavigate('slots');
              if (id === 'cases') onNavigate('contagioncache');
              if (id === 'wheel') onNavigate('slots');
            }}
            className={`pt-machine group min-h-36 rounded-xl p-3 text-left transition-all sm:min-h-44 sm:p-4 ${live ? 'pt-machine-live' : 'pt-machine-locked'}`}
          >
            <div className="flex items-center justify-between">
              <span className="pt-machine-icon"><Icon size={25} /></span>
              <span className={`rounded-full px-2 py-1 text-[8px] font-black tracking-widest ${live ? 'bg-lime-300/15 text-lime-200' : 'bg-white/5 text-white/35'}`}>
                {live ? 'AVAILABLE' : 'LOCKED'}
              </span>
            </div>
            <strong className="mt-5 block text-sm font-black text-white sm:text-base">{title}</strong>
            <span className="mt-1 block text-[10px] text-emerald-100/55">{subtitle}</span>
            {live && <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-lime-300"><Play size={11} /> ENTER DISTRICT</span>}
          </button>
        ))}
      </div>
      <div className="px-4 pb-5 text-center text-[9px] tracking-[.18em] text-emerald-100/30 sm:px-8">
        PUKE TOWN · ARCADE SECTOR 01
      </div>
    </section>
  );
}

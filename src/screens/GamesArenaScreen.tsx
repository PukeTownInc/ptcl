import { useState } from 'react';
import { ArrowLeft, Boxes, Dice5, Flame, Gem, Grid3X3, Layers, Lock, ShieldAlert, Sparkles, Target, Trophy, Zap } from 'lucide-react';
import type { Screen } from '../types';
import { useToast } from '../components/Toast';

interface Props {
  onNavigate: (screen: Screen) => void;
}

const districts = [
  { id: 'slots', title: 'CASH LAB SLOTS', sub: 'Reactor reels · Spin for Puke Points', icon: Sparkles, status: 'PLAY NOW', color: 'lime', target: 'slots' as Screen },
  { id: 'cache', title: 'CONTAGION WAREHOUSE', sub: 'Sealed crates · Mystery rewards', icon: Boxes, status: 'OPEN BAY', color: 'cyan', target: 'contagioncache' as Screen },
  { id: 'missions', title: 'HAZARD DUTIES', sub: 'Daily missions · Exposure XP', icon: Target, status: 'AVAILABLE', color: 'amber', target: 'missions' as Screen },
  { id: 'ranks', title: 'TOXICITY RANKS', sub: 'Player rankings · Monthly standings', icon: Trophy, status: 'AVAILABLE', color: 'purple', target: 'leaderboards' as Screen },
];

const futureGames = [
  { title: 'PLINKO', icon: Layers }, { title: 'CRASH', icon: Flame },
  { title: 'DICE', icon: Dice5 }, { title: 'MINES', icon: Grid3X3 },
  { title: 'TOWERS', icon: Gem }, { title: 'RADIATION WHEEL', icon: Zap },
];

export function GamesArenaScreen({ onNavigate }: Props) {
  const toast = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <section className="pt-arena space-y-4">
      <div className="pt-arena-hero">
        <div className="pt-arena-kicker"><ShieldAlert size={14} /> TOXIC INDUSTRIES · DISTRICT 02</div>
        <h1>GAMES <span>ARENA</span></h1>
        <p>Choose an active game bay. Your existing Puke Town account and saved progress remain connected.</p>
        <button className="pt-outline-button" onClick={() => onNavigate('home')}><ArrowLeft size={16}/> BACK TO TOWN</button>
      </div>
      <div className="pt-district-grid">
        {districts.map((d) => {
          const Icon = d.icon;
          return <button key={d.id} className={`pt-district-card pt-${d.color}`} onClick={() => onNavigate(d.target)}>
            <span className="pt-district-icon"><Icon size={25}/></span>
            <span className="pt-district-copy"><strong>{d.title}</strong><small>{d.sub}</small></span>
            <span className="pt-district-status">{d.status}</span>
          </button>;
        })}
      </div>
      <div className="pt-section-heading"><span>OTHER GAME BAYS</span><i>UNDER DEVELOPMENT</i></div>
      <div className="pt-future-grid">
        {futureGames.map(({title,icon:Icon}) => <button key={title} onClick={() => {setSelected(title);toast('info', `${title} is not enabled yet`, 'No game balance has been changed.');}}><Icon size={20}/><b>{title}</b><Lock size={12}/></button>)}
      </div>
      {selected && <p className="pt-muted-note">{selected} is shown as a future bay only. It cannot currently be entered.</p>}
    </section>
  );
}

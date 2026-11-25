import { Tv, Gift, Users, ChevronRight, Sparkles, Play, Target, Zap } from 'lucide-react';
import type { GameState, Screen } from '../types';
import type { GameActions } from '../useGameState';
import { useToast } from '../components/Toast';
interface Props {
  state: GameState;
  actions: GameActions;
  onNavigate: (s: Screen, target?: string) => void;
}
export function HomeScreen({ state, onNavigate }: Props) {
  const toast = useToast();
  const handleDailyBonus = () => toast('info', 'Daily spins paused', 'The daily spin reward will return after its server-side claim is ready.');
  const handleDailyBoost = () => toast('info', 'Rewarded ads unavailable', 'No verified advert provider is connected yet.');
  return (
    <div className="space-y-4">
      {/* Logo panel */}
      <div className="relative grunge-panel overflow-hidden">
        <div className="absolute inset-0 hazard-stripes opacity-[0.03]" />
        <div className="relative p-3 text-center flex items-center justify-center min-h-[140px]">
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ 
              height: 'calc(100% - 16px)',
              width: 'auto',
              maxWidth: 'calc(100% - 16px)',
              objectFit: 'contain',
              display: 'block'
            }} 
          />
        </div>
      </div>
      {/* Twists banner */}
      <button
        onClick={() => onNavigate('slots')}
        className="toxic-btn w-full py-4 flex items-center justify-between px-5 group"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={20} />
          <span className="text-left">
            <div className="text-sm">{state.spinsRemaining} Toxic Twists Ready</div>
            <div className="text-[10px] opacity-70 font-normal">Twist reels & gather Puke Points</div>
          </span>
        </div>
        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
      </button>
      {/* Daily buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleDailyBonus}
          disabled
          className="yellow-btn p-3 text-left h-full disabled:opacity-30"
        >
          <Gift size={20} className="mb-1" />
          <div className="text-xs">Daily Contagion</div>
          <div className="text-[10px] opacity-80 font-normal">Temporarily paused</div>
        </button>
        <button
          onClick={handleDailyBoost}
          disabled
          className="yellow-btn p-3 text-left h-full disabled:opacity-30"
        >
          <Tv size={20} className="mb-1" />
          <div className="text-xs">Radiation Surge</div>
          <div className="text-[10px] opacity-80 font-normal">Rewarded ads not connected</div>
        </button>
      </div>
      {/* Quick links */}
      <div className="grunge-panel divide-y divide-toxic-900/30">
        <QuickLink icon={<Target />} label="Daily Contamination" sub="Infect every target → Unlock maximum radiation exposure!" onClick={() => onNavigate('missions')} />
        <QuickLink icon={<Play />} label="Reactor Reels" sub="Twist reels & collect Puke Points" onClick={() => onNavigate('slots')} />
        <QuickLink icon={<Users />} label="Spread Infection" sub="+30 Twists + 100 Exposure each" onClick={() => onNavigate('profile', 'referral-box')} />
        <QuickLink icon={<Zap />} label="Fallout Forecast" sub="See what's contaminating the app next!" onClick={() => onNavigate('roadmap')} />
      </div>
    </div>
  );
}
function QuickLink({ icon, label, sub, onClick }: { icon: React.ReactNode; label: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 px-4 py-3 w-full hover:bg-toxic-500/5 transition-colors text-left">
      <span className="text-toxic-400">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-sm text-toxic-200">{label}</div>
        <div className="text-[11px] text-toxic-100/40 truncate">{sub}</div>
      </div>
      <ChevronRight size={16} className="text-toxic-100/30" />
    </button>
  );
}

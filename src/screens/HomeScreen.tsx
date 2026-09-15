import { useState } from 'react';
import { Tv, Gift, Users, ChevronRight, Sparkles, Play, Target } from 'lucide-react';
import type { GameState, Screen } from '../types';
import type { GameActions } from '../useGameState';
import { AdModal } from '../components/AdModal';
import { useToast } from '../components/Toast';

interface Props {
  state: GameState;
  actions: GameActions;
  onNavigate: (s: Screen, target?: string) => void;
}

export function HomeScreen({ state, actions, onNavigate }: Props) {
  const toast = useToast();
  const [adModal, setAdModal] = useState<null | { title: string; subtitle?: string; reward: string; onComplete: () => void }>(null);

  const handleDailyBonus = () => {
    if (state.freeSpinsClaimed) {
      toast('info', 'Already Contaminated', 'Return tomorrow for more');
      return;
    }
    setAdModal({
      title: 'Daily Contagion Bonus',
      subtitle: 'Absorb radiation to claim reward',
      reward: '+10 Toxic Twists',
      onComplete: () => {
        actions.claimDailyBonusSpins();
        actions.watchAd();
        toast('success', 'Contagion Absorbed!', '+10 Twists added');
      },
    });
  };

  const handleDailyBoost = () => {
    if (state.dailyBoostClaimed) {
      toast('info', 'Already Exposed', 'Return tomorrow for more');
      return;
    }
    setAdModal({
      title: 'Radiation Surge',
      subtitle: 'Absorb broadcast for daily boost',
      reward: '+5 Twists + 50 Exposure',
      onComplete: () => {
        actions.claimDailyBoost();
        actions.addXP(50, true);
        actions.watchAd();
        toast('success', 'Surge Active!', '+5 Twists + 50 Exposure');
      },
    });
  };

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
          disabled={state.freeSpinsClaimed}
          className="yellow-btn p-3 text-left h-full disabled:opacity-30"
        >
          <Gift size={20} className="mb-1" />
          <div className="text-xs">Daily Contagion</div>
          <div className="text-[10px] opacity-80 font-normal">+10 Toxic Twists</div>
          <div className="ad-badge mt-1.5"><Tv size={8} /> Toxic Broadcast</div>
        </button>
        <button
          onClick={handleDailyBoost}
          disabled={state.dailyBoostClaimed}
          className="yellow-btn p-3 text-left h-full disabled:opacity-30"
        >
          <Tv size={20} className="mb-1" />
          <div className="text-xs">Radiation Surge</div>
          <div className="text-[10px] opacity-80 font-normal">+5 Twists + 50 Exposure</div>
          <div className="ad-badge mt-1.5"><Tv size={8} /> Contagion Feed</div>
        </button>
      </div>

      {/* Quick links */}
      <div className="grunge-panel divide-y divide-toxic-900/30">
        <QuickLink icon={<Target />} label="Daily Contamination" sub="Infect every target → Unlock maximum radiation exposure!" onClick={() => onNavigate('missions')} />
        <QuickLink icon={<Play />} label="Enter Contagion" sub="Twist reels & collect Puke Points" onClick={() => onNavigate('slots')} />
        <QuickLink icon={<Users />} label="Spread Infection" sub="+30 Twists + 100 Exposure each" onClick={() => onNavigate('profile', 'referral-box')} />
      </div>

      <AdModal
        open={!!adModal}
        onClose={() => setAdModal(null)}
        onComplete={() => adModal?.onComplete()}
        title={adModal?.title ?? ''}
        subtitle={adModal?.subtitle}
        reward={adModal?.reward ?? ''}
      />
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

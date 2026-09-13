import { useState } from 'react';
import { Tv, Gift, Users, ChevronRight, Sparkles, Play, Target } from 'lucide-react';
import type { GameState, Screen } from '../types';
import { getTier } from '../constants';
import type { GameActions } from '../useGameState';
import { Logo } from '../components/Logo';
import { BalanceCard } from '../components/BalanceCard';
import { AdModal } from '../components/AdModal';
import { useToast } from '../components/Toast';

interface Props {
  state: GameState;
  actions: GameActions;
  onNavigate: (s: Screen, target?: string) => void;
}

export function HomeScreen({ state, actions, onNavigate }: Props) {
  const toast = useToast();
  const tier = getTier(state.xp);
  const [adModal, setAdModal] = useState<null | { title: string; subtitle?: string; reward: string; onComplete: () => void }>(null);

  const handleDailyBonus = () => {
    if (state.freeSpinsClaimed) {
      toast('info', 'Already Claimed', 'Come back tomorrow for more free spins');
      return;
    }
    setAdModal({
      title: 'Daily Bonus Spins',
      subtitle: 'Watch this video to claim your daily reward',
      reward: '+10 Spins',
      onComplete: () => {
        actions.claimDailyBonusSpins();
        actions.watchAd();
        toast('success', 'Daily Bonus Claimed!', '+10 Spins added to your account');
      },
    });
  };

  const handleDailyBoost = () => {
    if (state.dailyBoostClaimed) {
      toast('info', 'Already Claimed', 'Come back tomorrow for your next Daily Boost');
      return;
    }
    setAdModal({
      title: 'Daily Boost',
      subtitle: 'Watch this video for your daily boost reward',
      reward: '+5 Spins + 50 XP',
      onComplete: () => {
        actions.claimDailyBoost();
        actions.addXP(50, true);
        actions.watchAd();
        toast('success', 'Daily Boost Claimed!', '+5 Spins + 50 XP');
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Hero / logo panel */}
      <div className="relative grunge-panel overflow-hidden">
        <div className="absolute inset-0 hazard-stripes opacity-[0.03]" />
        <div className="relative p-5 text-center">
          <div className="animate-float flex justify-center">
            <Logo large />
          </div>
          <h2 className="font-display font-black text-xl text-radioactive-400 neon-text-yellow tracking-[0.3em]">CASH LAB</h2>
        </div>
      </div>

      {/* Balance overview */}
      <BalanceCard
        lockedPP={state.lockedPotPP}
        withdrawablePP={state.withdrawablePP}
        tierBadge={tier.badge}
        tierLabel={tier.label}
        potCap={tier.potCap}
        xp={state.xp}
        nextXp={null}
        compact
      />

      {/* Spins remaining banner */}
      <button
        onClick={() => onNavigate('slots')}
        className="toxic-btn w-full py-4 flex items-center justify-between px-5 group"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={20} />
          <span className="text-left">
            <div className="text-sm">{state.spinsRemaining} Spins Ready</div>
            <div className="text-[10px] opacity-70 font-normal">Tap to spin & win Puke Points</div>
          </span>
        </div>
        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
      </button>

      {/* Daily bonus + daily boost */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleDailyBonus}
          disabled={state.freeSpinsClaimed}
          className="yellow-btn p-3 text-left h-full disabled:opacity-30"
        >
          <Gift size={20} className="mb-1" />
          <div className="text-xs">Daily Bonus</div>
          <div className="text-[10px] opacity-80 font-normal">+10 Spins</div>
          <div className="ad-badge mt-1.5"><Tv size={8} /> Video</div>
        </button>

        <button
          onClick={handleDailyBoost}
          disabled={state.dailyBoostClaimed}
          className="yellow-btn p-3 text-left h-full disabled:opacity-30"
        >
          <Tv size={20} className="mb-1" />
          <div className="text-xs">Daily Boost</div>
          <div className="text-[10px] opacity-80 font-normal">+5 Spins + 50 XP</div>
          <div className="ad-badge mt-1.5"><Tv size={8} /> Video</div>
        </button>
      </div>

      {/* Quick links */}
      <div className="grunge-panel divide-y divide-toxic-900/30">
        <QuickLink icon={<Target />} label="Daily Missions" sub="Complete all for 200 XP + 20 spins" onClick={() => onNavigate('missions')} />
        <QuickLink icon={<Play />} label="Get Spinning" sub="Spin the slots & win Puke Points" onClick={() => onNavigate('slots')} />
        <QuickLink icon={<Users />} label="Refer Friends" sub="+30 spins + 100 XP for each signup" onClick={() => onNavigate('profile', 'referral-box')} />
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



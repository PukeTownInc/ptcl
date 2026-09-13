import { useState, useEffect } from 'react';
import { Tv, Zap, Flame, Users, ChevronRight, Target, Wallet } from 'lucide-react';
import type { GameState, Screen } from '../types';
import { getTier, getNextTier, NEXT_MONTHLY_RESET, formatPP, ppToUsd } from '../constants';
import type { GameActions } from '../useGameState';
import { isXPBoostActive, isHotStreakActive } from '../useGameState';
import { Logo } from '../components/Logo';
import { XPBar } from '../components/XPBar';
import { StatsGrid } from '../components/StatsGrid';
import { AdModal } from '../components/AdModal';
import { useToast } from '../components/Toast';

interface Props {
  state: GameState;
  actions: GameActions;
  onNavigate: (screen: Screen) => void;
}

export function HomeScreen({ state, actions, onNavigate }: Props) {
  const toast = useToast();
  const [showAd, setShowAd] = useState(false);
  const [adReward, setAdReward] = useState<{ pp: number; xp: number } | null>(null);

  const tier = getTier(state.xp);
  const nextTier = getNextTier(state.xp);

  const handleAdComplete = (rewardPP: number, rewardXP: number) => {
    actions.earnPP(rewardPP);
    actions.earnXP(rewardXP);
    setAdReward({ pp: rewardPP, xp: rewardXP });
    setShowAd(false);
    toast('success', 'Ad Watched!', `+${rewardPP} Puke Points • +${rewardXP} XP`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Logo />
        <div className="text-right">
          <div className="text-sm font-bold text-toxic-300 uppercase tracking-wider">{tier.label}</div>
          <div className="text-xs text-gray-400">Tier {tier.level}</div>
        </div>
      </div>

      {/* ✅ WORKING BALANCE BOX — same as Withdraw Screen */}
      <div className="grunge-panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={20} className="text-radioactive-400" />
          <h2 className="font-display font-bold text-sm text-radioactive-400">☢️ DECONTAMINATION CHAMBER</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {/* LEFT — CONTAGION VAULT */}
          <div className="rounded-lg bg-ink-700/50 border border-toxic-900/40 p-3">
            <div className="text-[10px] text-toxic-100/40 uppercase">CONTAGION VAULT</div>
            <div className="font-mono text-xl font-bold text-toxic-300">{formatPP(state.lockedPotPP)}</div>
            <div className="text-[10px] text-toxic-100/30 font-mono">Watch video to unlock</div>
          </div>
          {/* RIGHT — CONTAGION CACHE */}
          <div className="rounded-lg bg-radioactive-500/10 border border-radioactive-600/30 p-3">
            <div className="text-[10px] text-radioactive-400/60 uppercase">CONTAGION CACHE</div>
            <div className="font-mono text-xl font-bold text-radioactive-400 neon-text-yellow">{formatPP(state.withdrawablePP)}</div>
            <div className="text-[10px] text-radioactive-300/40 font-mono">${ppToUsd(state.withdrawablePP).toFixed(2)} USD</div>
          </div>
        </div>
      </div>

      <XPBar xp={state.xp} nextXp={nextTier?.xpRequired ?? null} tierLabel={tier.label} />

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('slots')}
          className="grunge-panel p-3 flex items-center gap-2 hover:border-toxic-400 transition-colors"
        >
          <Zap size={20} className="text-toxic-400 flex-shrink-0" />
          <div className="text-left">
            <div className="font-bold text-sm">Spin Slots</div>
            <div className="text-xs text-gray-400">Free spins daily</div>
          </div>
          <ChevronRight size={16} className="text-gray-500 ml-auto" />
        </button>

        <button
          onClick={() => onNavigate('missions')}
          className="grunge-panel p-3 flex items-center gap-2 hover:border-radioactive-400 transition-colors"
        >
          <Target size={20} className="text-radioactive-400 flex-shrink-0" />
          <div className="text-left">
            <div className="font-bold text-sm">Missions</div>
            <div className="text-xs text-gray-400">Daily rewards</div>
          </div>
          <ChevronRight size={16} className="text-gray-500 ml-auto" />
        </button>

        <button
          onClick={() => setShowAd(true)}
          className="grunge-panel p-3 flex items-center gap-2 hover:border-toxic-400 transition-colors"
        >
          <Tv size={20} className="text-toxic-400 flex-shrink-0" />
          <div className="text-left">
            <div className="font-bold text-sm">Watch Ad</div>
            <div className="text-xs text-gray-400">Earn Puke Points</div>
          </div>
          <ChevronRight size={16} className="text-gray-500 ml-auto" />
        </button>

        <button
          onClick={() => onNavigate('leaderboards')}
          className="grunge-panel p-3 flex items-center gap-2 hover:border-radioactive-400 transition-colors"
        >
          <Users size={20} className="text-radioactive-400 flex-shrink-0" />
          <div className="text-left">
            <div className="font-bold text-sm">Leaderboards</div>
            <div className="text-xs text-gray-400">Weekly rankings</div>
          </div>
          <ChevronRight size={16} className="text-gray-500 ml-auto" />
        </button>
      </div>

      <StatsGrid state={state} />

      <div className="grunge-panel p-3 text-center text-xs text-gray-400">
        ⏱️ Monthly Reset: {NEXT_MONTHLY_RESET} 00:00 UTC
      </div>

      {showAd && (
        <AdModal
          onClose={() => setShowAd(false)}
          onComplete={handleAdComplete}
          rewardPP={50}
          rewardXP={5}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Tv, CheckCircle2, Gift, Trophy, Calendar, Target, Lock, Flame, Zap } from 'lucide-react';
import type { GameState } from '../types';
import { MISSIONS, ALL_MISSIONS_BONUS, STREAK_REWARDS, MAX_STREAK_DAY } from '../constants';
import type { GameActions } from '../useGameState';
import { isStreakPPBoostActive } from '../useGameState';
import { useToast } from '../components/Toast';
import { AdModal } from '../components/AdModal';

interface Props {
  state: GameState;
  actions: GameActions;
}

function isMissionComplete(state: GameState, id: string): boolean {
  switch (id) {
    case 'spins': return state.missions.spins >= 20;
    case 'ads': return state.missions.adsWatched >= 5;
    case 'wheel': return state.missions.wheelSpins >= 3;
    case 'claistreak': return state.streakClaimedToday;
    case 'earnpp': return state.ppEarnedToday >= 100;
    default: return false;
  }
}

function missionProgress(state: GameState, id: string): number {
  switch (id) {
    case 'spins': return Math.min(state.missions.spins, 20);
    case 'ads': return Math.min(state.missions.adsWatched, 5);
    case 'wheel': return Math.min(state.missions.wheelSpins, 3);
    case 'claistreak': return state.streakClaimedToday ? 1 : 0;
    case 'earnpp': return Math.min(state.ppEarnedToday, 100);
    default: return 0;
  }
}

function useResetCountdown() {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);
  return remaining;
}

export function MissionsScreen({ state, actions }: Props) {
  const toast = useToast();
  const [adModal, setAdModal] = useState<null | { title: string; subtitle?: string; reward: string; onComplete: () => void }>(null);
  const countdown = useResetCountdown();

  const claimsUsed = state.dailyMissionClaims.length;

  const completedCount = MISSIONS.filter((m) => isMissionComplete(state, m.id)).length;
  const allComplete = completedCount === MISSIONS.length;

  const allMissionsClaimed = MISSIONS.every((m) => state.dailyMissionClaims.includes(m.id));

  const claimedDays = state.streakDay;
  const nextDay = claimedDays >= 7 ? 1 : claimedDays + 1;
  const streakReward = STREAK_REWARDS[nextDay - 1];
  const isDay7 = nextDay === MAX_STREAK_DAY;
  const streakBoostActive = isStreakPPBoostActive(state);

  const handleStreakClaim = () => {
    if (state.streakClaimedToday) {
      toast('info', 'Already Claimed', 'Come back tomorrow for your next streak reward');
      return;
    }
    setAdModal({
      title: `Daily Streak — Day ${nextDay}/7`,
      subtitle: 'Watch ad to claim your streak reward',
      reward: `+${streakReward.spins} Spins +${streakReward.xp} XP${streakReward.ppBoost ? ' + ×1.2 PP 24h' : ''}`,
      onComplete: () => {
        actions.claimStreakRewardViaAd(streakReward);
        toast('success', `Day ${nextDay} Complete!`, `+${streakReward.spins} Spins +${streakReward.xp} XP${streakReward.ppBoost ? ' + ×1.2 PP' : ''}`);
      },
    });
  };

  const handleClaimBase = (id: string, baseXp: number, baseSpins?: number) => {
    if (state.dailyMissionClaims.includes(id)) {
      toast('info', 'Already Claimed', 'Base reward collected today');
      return;
    }
    const accepted = actions.claimMissionReward(id);
    if (!accepted) return;
    actions.addXP(baseXp, false);
    if (baseSpins) actions.addSpins(baseSpins);
    toast('success', 'Mission Reward!', `+${baseXp} XP${baseSpins ? ` + ${baseSpins} spins` : ''}`);
  };

  const handleClaimAdBonus = (id: string, adXp: number, adSpins?: number) => {
    if (state.dailyMissionClaims.includes(`${id}:ad`)) {
      toast('info', 'Ad Bonus Claimed', 'Already collected today');
      return;
    }
    if (!state.dailyMissionClaims.includes(id)) {
      toast('error', 'Claim Base First', 'Collect the base reward first');
      return;
    }
    setAdModal({
      title: 'Mission Ad Bonus',
      subtitle: 'Watch video for bonus mission rewards',
      reward: `+75 XP + 5 spins`,
      onComplete: () => {
        const accepted = actions.claimMissionReward(`${id}:ad`);
        if (!accepted) return;
        actions.addXP(adXp, true);
        if (adSpins) actions.addSpins(adSpins);
        actions.watchAd();
        toast('success', 'Ad Bonus Claimed!', `+${adXp} XP${adSpins ? ` + ${adSpins} spins` : ''}`);
      },
    });
  };

  const handleAllBase = () => {
    if (state.allMissionsBonusClaimed) return;
    if (!allMissionsClaimed) {
      toast('error', 'Missions Incomplete', 'Claim all daily missions first');
      return;
    }
    const accepted = actions.claimAllMissionsBonus();
    if (!accepted) return;
    actions.claimMissionReward('allBonus');
    actions.addXP(ALL_MISSIONS_BONUS.baseXp, false);
    toast('success', 'All Missions Complete!', `+${ALL_MISSIONS_BONUS.baseXp} XP bonus`);
  };

  const handleAllAdBonus = () => {
    if (state.allMissionsAdBonusClaimed) return;
    if (!state.allMissionsBonusClaimed) {
      toast('error', 'Claim Base First', 'Collect the base all-missions bonus');
      return;
    }
    setAdModal({
      title: 'All Missions Ad Bonus',
      subtitle: 'Watch video for the ultimate bonus reward',
      reward: `+${ALL_MISSIONS_BONUS.adXp} XP + ${ALL_MISSIONS_BONUS.adSpins} spins`,
      onComplete: () => {
        const accepted = actions.claimAllMissionsAdBonus();
        if (!accepted) return;
        actions.claimMissionReward('allAdBonus');
        actions.addXP(ALL_MISSIONS_BONUS.adXp, true);
        actions.addSpins(ALL_MISSIONS_BONUS.adSpins);
        actions.watchAd();
        toast('success', 'Ultimate Bonus!', `+${ALL_MISSIONS_BONUS.adXp} XP + ${ALL_MISSIONS_BONUS.adSpins} spins`);
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Daily Missions title box */}
      <div className="grunge-panel p-4 text-center">
        <Target size={28} className="text-toxic-400 mx-auto mb-2" />
        <h2 className="font-display font-black text-lg text-toxic-400 neon-text">DAILY MISSIONS</h2>
        <p className="text-[11px] text-toxic-100/50 mt-1">Complete all daily missions → Get BONUS rewards</p>

        {/* Reset countdown */}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-mono text-toxic-100/50">
          <Calendar size={10} className="text-toxic-400" />
          <span>Daily missions reset in: <span className="text-toxic-400 font-bold tabular-nums">{countdown}</span></span>
        </div>
      </div>

      {/* 7-Day Streak Challenge */}
      <div className={`grunge-panel p-4 ${isDay7 ? 'neon-border-yellow' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame size={20} className={isDay7 ? 'text-radioactive-400 animate-pulse' : 'text-toxic-400'} />
            <div>
              <div className="font-display font-bold text-sm text-toxic-300">7 Day Streak Challenge</div>
              <div className="text-[10px] text-toxic-100/40 font-mono">Day {claimedDays}/7 claimed • Next: Day {nextDay} • Re claim in {countdown}</div>
            </div>
          </div>
          {streakBoostActive && (
            <span className="px-2 py-1 rounded-full bg-radioactive-500/15 border border-radioactive-600/40 text-radioactive-400 text-[10px] font-display font-bold flex items-center gap-1">
              <Zap size={10} /> ×1.2 PP
            </span>
          )}
        </div>

        {/* 7-day indicators */}
        <div className="flex justify-between gap-1 mb-3">
          {STREAK_REWARDS.map((r) => {
            const filled = r.day <= claimedDays;
            const isCurrent = r.day === nextDay && !state.streakClaimedToday;
            return (
              <div
                key={r.day}
                className={`flex-1 text-center rounded-md py-2 transition-all ${
                  filled
                    ? isDay7 && r.day === 7
                      ? 'bg-radioactive-500/20 border border-radioactive-600/40'
                      : 'bg-toxic-500/20 border border-toxic-600/30'
                    : isCurrent
                    ? isDay7
                      ? 'bg-radioactive-500/25 border border-radioactive-600/50 animate-pulse'
                      : 'bg-toxic-500/25 border border-toxic-400/50 animate-pulse'
                    : 'bg-ink-900/50 border border-toxic-900/30'
                }`}
              >
                <div className={`text-[9px] font-mono ${
                  filled || isCurrent
                    ? isDay7 && r.day === 7 ? 'text-radioactive-400' : 'text-toxic-400'
                    : 'text-toxic-100/30'
                }`}>
                  {r.day === 7 ? '🏆' : `D${r.day}`}
                </div>
                <div className={`text-[8px] font-mono mt-0.5 ${
                  filled || isCurrent ? 'text-toxic-300/60' : 'text-toxic-100/20'
                }`}>
                  +{r.spins}S
                </div>
              </div>
            );
          })}
        </div>

        {/* Reward + claim button */}
        {state.streakClaimedToday ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <CheckCircle2 size={16} className="text-toxic-400" />
            <span className="text-[12px] font-mono text-toxic-400">Day {claimedDays} Claimed — come back tomorrow for Day {nextDay}!</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-center text-[11px] font-mono text-toxic-100/60">
              Reward: +{streakReward.spins} Spins +{streakReward.xp} XP{streakReward.ppBoost ? ' + ×1.2 PP 24h' : ''}
            </div>
            <button
              onClick={handleStreakClaim}
              className="yellow-btn w-full py-3 text-xs flex items-center justify-center gap-2"
            >
              <Tv size={14} /> Watch Ad to Claim Day {nextDay}
            </button>
          </div>
        )}

        {/* Warning */}
        {claimedDays > 0 && claimedDays < MAX_STREAK_DAY && !state.streakClaimedToday && (
          <div className="mt-2 text-[10px] text-hazard-amber/70 font-mono text-center">
            Miss a day = reset! Keep your {claimedDays}-day streak alive!
          </div>
        )}
        {claimedDays === 0 && !state.streakClaimedToday && (
          <div className="mt-2 text-[10px] text-toxic-100/40 font-mono text-center">
            Start your streak — claim Day 1 today!
          </div>
        )}
        {isDay7 && !state.streakClaimedToday && (
          <div className="mt-2 text-[10px] text-radioactive-400 font-mono animate-pulse text-center">
            DAY 7 — WEEKLY MAX! Claim for +{streakReward.spins} Spins +{streakReward.xp} XP + ×1.2 PP!
          </div>
        )}
      </div>

      {/* Mission cards */}
      {MISSIONS.map((m) => {
        const complete = isMissionComplete(state, m.id);
        const progress = missionProgress(state, m.id);
        const pct = (progress / m.target) * 100;
        const hasClaimed = state.dailyMissionClaims.includes(m.id);
        const hasAdClaimed = state.dailyMissionClaims.includes(`${m.id}:ad`);

        return (
          <div key={m.id} className="grunge-panel p-3.5">
            <div className="flex items-start gap-3">
              <div className="text-2xl shrink-0">{m.icon}</div>
              <div className="flex-1 min-w0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-sm text-toxic-200">{m.label}</h3>
                  {complete && <CheckCircle2 size={14} className="text-toxic-400 shrink-0" />}
                </div>
                <div className="text-[10px] text-toxic-100/40 font-mono mt-0.5">
                  {m.id === 'ads' ? (
                    <>Base: +{m.baseXp} XP • Ad: +{m.adXp} XP + {(m as any).adSpins} spins</>
                  ) : (
                    <>Base: +{m.baseXp} XP{(m as any).baseSpins ? ` + ${(m as any).baseSpins} spins` : ''} • Ad: +{m.adXp} XP + {(m as any).adSpins} spins</>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-ink-700 overflow-hidden">
                    <div className={`h-full transition-all ${complete ? 'bg-toxic-400' : 'bg-radioactive-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="font-mono text-[10px] text-toxic-100/50">{progress}/{m.target}</span>
                </div>
                <div className="flex gap-2 mt-2.5">
                  <button
                    onClick={() => handleClaimBase(m.id, m.baseXp, (m as any).baseSpins)}
                    disabled={!complete || hasClaimed}
                    className={`flex-1 py-2 text-[11px] flex items-center justify-center gap-1 transition-all ${
                      hasClaimed ? 'toxic-btn opacity-60' : !complete ? 'ghost-btn opacity-40 cursor-not-allowed' : 'toxic-btn'
                    }`}
                  >
                    {hasClaimed ? <><CheckCircle2 size={12} /> Done Today</> : <><Gift size={12} /> +{m.baseXp} XP</>}
                  </button>
                  <button
                    onClick={() => handleClaimAdBonus(m.id, m.adXp, (m as any).adSpins)}
                    disabled={!hasClaimed || hasAdClaimed}
                    className={`flex-1 py-2 text-[11px] flex items-center justify-center gap-1 transition-all ${
                      hasAdClaimed ? 'yellow-btn opacity-60' : !hasClaimed ? 'ghost-btn opacity-40 cursor-not-allowed' : 'yellow-btn'
                    }`}
                  >
                    {hasAdClaimed ? <><CheckCircle2 size={12} /> Done</> : <><Tv size={12} /> +75 XP + 5 spins</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Complete All Daily Missions bonus */}
      <div className={`grunge-panel p-4 ${allMissionsClaimed ? 'neon-border-yellow' : 'opacity-60'}`}>
        <div className="flex items-center gap-3 mb-3">
          <Trophy size={24} className="text-radioactive-400" />
          <div className="flex-1">
            <h3 className="font-display font-bold text-sm text-radioactive-400">Complete All Daily Missions</h3>
            <p className="text-[10px] text-toxic-100/50">Finish every daily mission for bonus reward!</p>
          </div>
        </div>

        {/* Progress tracker */}
        <div className="mb-3 flex items-center justify-center gap-2">
          <div className="h-2 w-32 rounded-full bg-ink-700 overflow-hidden">
            <div className="h-full bg-toxic-400 transition-all" style={{ width: `${(completedCount / MISSIONS.length) * 100}%` }} />
          </div>
          <span className="font-mono text-xs text-toxic-300">{completedCount}/{MISSIONS.length} missions completed</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleAllBase}
            disabled={!allMissionsClaimed || state.allMissionsBonusClaimed}
            className={`flex-1 py-2.5 text-xs flex items-center justify-center gap-1 transition-all ${
              state.allMissionsBonusClaimed ? 'toxic-btn opacity-60' : !allMissionsClaimed ? 'ghost-btn opacity-40 cursor-not-allowed' : 'toxic-btn'
            }`}
          >
            {state.allMissionsBonusClaimed ? <><CheckCircle2 size={14} /> Claimed</> : !allMissionsClaimed ? <><Lock size={14} /> Locked</> : <><Gift size={14} /> +{ALL_MISSIONS_BONUS.baseXp} XP</>}
          </button>
          <button
            onClick={handleAllAdBonus}
            disabled={!state.allMissionsBonusClaimed || state.allMissionsAdBonusClaimed}
            className={`flex-1 py-2.5 text-xs flex items-center justify-center gap-1 transition-all ${
              state.allMissionsAdBonusClaimed ? 'yellow-btn opacity-60' : !state.allMissionsBonusClaimed ? 'ghost-btn opacity-40 cursor-not-allowed' : 'yellow-btn'
            }`}
          >
            {state.allMissionsAdBonusClaimed ? <><CheckCircle2 size={14} /> Done</> : <><Tv size={14} /> +{ALL_MISSIONS_BONUS.adXp} XP + {ALL_MISSIONS_BONUS.adSpins} spins</>}
          </button>
        </div>
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

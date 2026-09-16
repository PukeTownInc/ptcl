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

// ✅ MATCHES YOUR UPDATED TARGETS from constants
function isMissionComplete(state: GameState, id: string): boolean {
  switch (id) {
    case 'spins': return state.missions.spins >= 50;
    case 'ads': return state.missions.adsWatched >= 10;
    case 'wheel': return state.missions.wheelSpins >= 5;
    case 'claistreak': return state.streakClaimedToday;
    case 'earnpp': return state.ppEarnedToday >= 250;
    default: return false;
  }
}

function missionProgress(state: GameState, id: string): number {
  switch (id) {
    case 'spins': return Math.min(state.missions.spins, 50);
    case 'ads': return Math.min(state.missions.adsWatched, 10);
    case 'wheel': return Math.min(state.missions.wheelSpins, 5);
    case 'claistreak': return state.streakClaimedToday ? 1 : 0;
    case 'earnpp': return Math.min(state.ppEarnedToday, 250);
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
  const [adModal, setAdModal] = useState<null | { 
    title: string; 
    subtitle?: string; 
    reward: string; 
    onComplete: () => void 
  }>(null);
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
      toast('info', 'Already Contaminated', 'Return tomorrow for your next dose');
      return;
    }
    setAdModal({
      title: `☢️ Daily Contamination — Dose ${nextDay}/7`,
      subtitle: 'Absorb radiation to receive your supply',
      reward: `+${streakReward.spins} Twists + ${streakReward.xp} Exposure${streakReward.ppBoost ? ' + ×1.2 Goops for 24h' : ''}`,
      onComplete: () => {
        actions.claimStreakRewardViaAd(streakReward);
        toast('success', `Dose ${nextDay} Absorbed!`, `+${streakReward.spins} Twists + ${streakReward.xp} Exposure${streakReward.ppBoost ? ' + ×1.2 Goops' : ''}`);
      },
    });
  };

  // ✅ FIXED: Uses claimMissionReward — XP calculated inside useGameState
  const handleClaimBase = (id: string) => {
    if (state.dailyMissionClaims.includes(id)) {
      toast('info', 'Already Collected', 'Base supply gathered today');
      return;
    }
    const mission = MISSIONS.find(m => m.id === id);
    if (!mission) return;

    const accepted = actions.claimMissionReward(id, false);
    if (!accepted) return;

    if (mission.baseSpins) actions.addSpins(mission.baseSpins);
    toast('success', 'Contamination Secured!', `+${mission.baseXp} Exposure${mission.baseSpins ? ` + ${mission.baseSpins} Twists` : ''}`);
  };

  // ✅ FIXED: Uses claimMissionReward with viaAd=true — XP calculated inside
  const handleClaimAdBonus = (id: string) => {
    const adClaimId = `${id}:ad`;
    if (state.dailyMissionClaims.includes(adClaimId)) {
      toast('info', 'Bonus Contaminated', 'Already absorbed today');
      return;
    }
    if (!state.dailyMissionClaims.includes(id)) {
      toast('error', 'Base First', 'Claim primary supply before bonus');
      return;
    }
    const mission = MISSIONS.find(m => m.id === id);
    if (!mission) return;

    setAdModal({
      title: '☢️ Radiation Bonus',
      subtitle: 'Absorb broadcast for extra contamination',
      reward: `+${mission.adXp} Exposure + ${mission.adSpins} Twists`,
      onComplete: () => {
        const accepted = actions.claimMissionReward(adClaimId, true);
        if (!accepted) return;
        if (mission.adSpins) actions.addSpins(mission.adSpins);
        actions.watchAd();
        toast('success', 'Radiation Absorbed!', `+${mission.adXp} Exposure${mission.adSpins ? ` + ${mission.adSpins} Twists` : ''}`);
      },
    });
  };

  const handleAllBase = () => {
    if (state.allMissionsBonusClaimed) return;
    if (!allMissionsClaimed) {
      toast('error', 'Incomplete Exposure', 'Contaminate every target first');
      return;
    }
    const accepted = actions.claimAllMissionsBonus();
    if (!accepted) return;
    // Give all-missions bonus XP directly
    actions.addXP(ALL_MISSIONS_BONUS.baseXp, false);
    if (ALL_MISSIONS_BONUS.baseSpins) actions.addSpins(ALL_MISSIONS_BONUS.baseSpins);
    toast('success', '☢️ FULL CONTAMINATION!', `+${ALL_MISSIONS_BONUS.baseXp} Exposure Bonus`);
  };

  const handleAllAdBonus = () => {
    if (state.allMissionsAdBonusClaimed) return;
    if (!state.allMissionsBonusClaimed) {
      toast('error', 'Base First', 'Claim full contamination supply first');
      return;
    }
    setAdModal({
      title: '☢️ MAXIMUM DOSE BONUS',
      subtitle: 'Absorb final broadcast for ultimate contamination',
      reward: `+${ALL_MISSIONS_BONUS.adXp} Exposure + ${ALL_MISSIONS_BONUS.adSpins} Twists`,
      onComplete: () => {
        const accepted = actions.claimAllMissionsAdBonus();
        if (!accepted) return;
        actions.addXP(ALL_MISSIONS_BONUS.adXp, true);
        if (ALL_MISSIONS_BONUS.adSpins) actions.addSpins(ALL_MISSIONS_BONUS.adSpins);
        actions.watchAd();
        toast('success', '☢️ CRITICAL EXPOSURE!', `+${ALL_MISSIONS_BONUS.adXp} Exposure + ${ALL_MISSIONS_BONUS.adSpins} Twists`);
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Contamination Targets Header */}
      <div className="grunge-panel p-4 text-center">
        <Target size={28} className="text-toxic-400 mx-auto mb-2" />
        <h2 className="font-display font-black text-lg text-toxic-400 neon-text">☢️ DAILY CONTAMINATION ☢️</h2>
        <p className="text-[11px] text-toxic-100/50 mt-1">Infect every target → Unlock maximum radiation exposure!</p>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-mono text-toxic-100/50">
          <Calendar size={10} className="text-toxic-400" />
          <span>Radiation levels reset in: <span className="text-toxic-400 font-bold tabular-nums">{countdown}</span></span>
        </div>
      </div>

      {/* 7-Day Contamination Streak */}
      <div className={`grunge-panel p-4 ${isDay7 ? 'neon-border-yellow' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame size={20} className={isDay7 ? 'text-radioactive-400 animate-pulse' : 'text-toxic-400'} />
            <div>
              <div className="font-display font-bold text-sm text-toxic-300">7-Day Contamination Streak</div>
              <div className="text-[10px] text-toxic-100/40 font-mono">Dose {claimedDays}/7 absorbed • Next: Dose {nextDay} • Re-dose in {countdown}</div>
            </div>
          </div>
          {streakBoostActive && (
            <span className="px-2 py-1 rounded-full bg-radioactive-500/15 border border-radioactive-600/40 text-radioactive-400 text-[10px] font-display font-bold flex items-center gap-1">
              <Zap size={10} /> ×1.2 GOOP
            </span>
          )}
        </div>

        {/* 7-day dose indicators */}
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
                  {r.day === 7 ? '☢️' : `D${r.day}`}
                </div>
                <div className={`text-[8px] font-mono mt-0.5 ${
                  filled || isCurrent ? 'text-toxic-300/60' : 'text-toxic-100/20'
                }`}>
                  +{r.spins}☢
                </div>
              </div>
            );
          })}
        </div>

        {/* Reward + claim button */}
        {state.streakClaimedToday ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <CheckCircle2 size={16} className="text-toxic-400" />
            <span className="text-[12px] font-mono text-toxic-400">Dose {claimedDays} Absorbed — return tomorrow for Dose {nextDay}!</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-center text-[11px] font-mono text-toxic-100/60">
              Supply: +{streakReward.spins} Twists + {streakReward.xp} Exposure{streakReward.ppBoost ? ' + ×1.2 Goops for 24h' : ''}
            </div>
            <button
              onClick={handleStreakClaim}
              className="yellow-btn w-full py-3 text-xs flex items-center justify-center gap-2"
            >
              <Tv size={14} /> Absorb Radiation to Claim Dose {nextDay}
            </button>
          </div>
        )}

        {/* Warnings */}
        {claimedDays > 0 && claimedDays < MAX_STREAK_DAY && !state.streakClaimedToday && (
          <div className="mt-2 text-[10px] text-hazard-amber/70 font-mono text-center">
            Skip a dose = infection reset! Keep your {claimedDays}-day streak alive!
          </div>
        )}
        {claimedDays === 0 && !state.streakClaimedToday && (
          <div className="mt-2 text-[10px] text-toxic-100/40 font-mono text-center">
            Begin your contamination — absorb Dose 1 today!
          </div>
        )}
        {isDay7 && !state.streakClaimedToday && (
          <div className="mt-2 text-[10px] text-radioactive-400 font-mono animate-pulse text-center">
            ☢️ FINAL DOSE — WEEKLY MAX! Absorb for +{streakReward.spins} Twists + {streakReward.xp} Exposure + ×1.2 Goops!
          </div>
        )}
      </div>

      {/* Contamination Target Cards */}
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
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-sm text-toxic-200">{m.label}</h3>
                  {complete && <CheckCircle2 size={14} className="text-toxic-400 shrink-0" />}
                </div>
                <div className="text-[10px] text-toxic-100/40 font-mono mt-0.5">
                  Base: +{m.baseXp} Exposure • Radiation: +{m.adXp} Exposure + {m.adSpins} Twists
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-ink-700 overflow-hidden">
                    <div className={`h-full transition-all ${complete ? 'bg-toxic-400' : 'bg-radioactive-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="font-mono text-[10px] text-toxic-100/50">{progress}/{m.target}</span>
                </div>
                <div className="flex gap-2 mt-2.5">
                  <button
                    onClick={() => handleClaimBase(m.id)}
                    disabled={!complete || hasClaimed}
                    className={`flex-1 py-2 text-[11px] flex items-center justify-center gap-1 transition-all ${
                      hasClaimed ? 'toxic-btn opacity-60' : !complete ? 'ghost-btn opacity-40 cursor-not-allowed' : 'toxic-btn'
                    }`}
                  >
                    {hasClaimed ? <><CheckCircle2 size={12} /> Contaminated</> : <><Gift size={12} /> +{m.baseXp} Exposure</>}
                  </button>
                  <button
                    onClick={() => handleClaimAdBonus(m.id)}
                    disabled={!hasClaimed || hasAdClaimed}
                    className={`flex-1 py-2 text-[11px] flex items-center justify-center gap-1 transition-all ${
                      hasAdClaimed ? 'yellow-btn opacity-60' : !hasClaimed ? 'ghost-btn opacity-40 cursor-not-allowed' : 'yellow-btn'
                    }`}
                  >
                    {hasAdClaimed ? <><CheckCircle2 size={12} /> Absorbed</> : <><Tv size={12} /> +{m.adXp} Exposure + {m.adSpins} Twists</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Full Contamination Bonus */}
      <div className={`grunge-panel p-4 ${allMissionsClaimed ? 'neon-border-yellow' : 'opacity-60'}`}>
        <div className="flex items-center gap-3 mb-3">
          <Trophy size={24} className="text-radioactive-400" />
          <div className="flex-1">
            <h3 className="font-display font-bold text-sm text-radioactive-400">☢️ FULL CONTAMINATION BONUS</h3>
            <p className="text-[10px] text-toxic-100/50">Infect every target → Unlock maximum radiation supply!</p>
          </div>
        </div>
        <div className="mb-3 flex items-center justify-center gap-2">
          <div className="h-2 w-32 rounded-full bg-ink-700 overflow-hidden">
            <div className="h-full bg-toxic-400 transition-all" style={{ width: `${(completedCount / MISSIONS.length) * 100}%` }} />
          </div>
          <span className="font-mono text-xs text-toxic-300">{completedCount}/{MISSIONS.length} targets infected</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAllBase}
            disabled={!allMissionsClaimed || state.allMissionsBonusClaimed}
            className={`flex-1 py-2.5 text-xs flex items-center justify-center gap-1 transition-all ${
              state.allMissionsBonusClaimed ? 'toxic-btn opacity-60' : !allMissionsClaimed ? 'ghost-btn opacity-40 cursor-not-allowed' : 'toxic-btn'
            }`}
          >
            {state.allMissionsBonusClaimed ? <><CheckCircle2 size={14} /> Secured</> : !allMissionsClaimed ? <><Lock size={14} /> Quarantined</> : <><Gift size={14} /> +{ALL_MISSIONS_BONUS.baseXp} Exposure</>}
          </button>
          <button
            onClick={handleAllAdBonus}
            disabled={!state.allMissionsBonusClaimed || state.allMissionsAdBonusClaimed}
            className={`flex-1 py-2.5 text-xs flex items-center justify-center gap-1 transition-all ${
              state.allMissionsAdBonusClaimed ? 'yellow-btn opacity-60' : !state.allMissionsBonusClaimed ? 'ghost-btn opacity-40 cursor-not-allowed' : 'yellow-btn'
            }`}
          >
            {state.allMissionsAdBonusClaimed ? <><CheckCircle2 size={14} /> Absorbed</> : <><Tv size={14} /> +{ALL_MISSIONS_BONUS.adXp} Exposure + {ALL_MISSIONS_BONUS.adSpins} Twists</>}
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

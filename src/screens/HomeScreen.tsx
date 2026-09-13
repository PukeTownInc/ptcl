import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState, MissionState, WithdrawalRecord } from './types';
import {
  DAILY_XP_BONUS_CAP,
  DAILY_XP_FREE_CAP,
  FREE_SPINS_BASE,
  FREE_SPINS_DAILY_BONUS,
  MIN_UNLOCK_PP,
} from './constants';
import { supabase } from './lib/supabase';

const STORAGE_KEY = 'puketown_cashlab_v1';
const FIXED_MULTIPLIER = 1.0;
const FIXED_POT_CAP = 500000;
const FIXED_DAILY_UNLOCKS = 5;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00Z').getTime();
  const db = new Date(b + 'T00:00:00Z').getTime();
  return Math.round((db - da) / 86400000);
}

function computeStreakReset(state: GameState, today: string): string | null {
  const lastClaim = state.lastStreakClaimDate;
  if (!lastClaim) return state.lastStreakClaimDate;
  const gap = daysBetween(lastClaim, today);
  if (gap >= 2) return null;
  return lastClaim;
}

function defaultState(): GameState {
  return {
    xp: 0,
    lockedPotPP: 0,
    withdrawablePP: 0,
    totalEarnedPP: 0,
    spinsRemaining: FREE_SPINS_BASE,
    freeSpinsClaimed: false,
    dailyBoostClaimed: false,
    dailyAdVideosWatched: 0,
    dailyUnlocksUsed: 0,
    dailyXpFree: 0,
    dailyXpBonus: 0,
    dailyDoubleUps: 0,
    dailyExtraLucky: 0,
    dailyHotStreak: 0,
    dailyMysteryPacks: 0,
    dailyPotAccel: 0,
    dailyXpBoosts: 0,
    xpBoostUntil: null,
    hotStreakUntil: null,
    potAccelUntil: null,
    doubleUpPending: null,
    extraLuckyPending: false,
    missions: { spins: 0, adsWatched: 0, wheelSpins: 0, allClaimed: false },
    dailyMissionClaims: [],
    allMissionsBonusClaimed: false,
    allMissionsAdBonusClaimed: false,
    ppEarnedToday: 0,
    streakDay: 0,
    streakClaimedToday: false,
    streakAdWatchedToday: false,
    lastStreakClaimDate: null,
    bestStreak: 0,
    streakPPBoostUntil: null,
    referrals: 0,
    loginStreak: 0,
    lastLogin: null,
    lastWithdraw: null,
    faucetpayEmail: '',
    withdrawalHistory: [],
    lastReset: todayUTC(),
    spinsToday: 0,
    totalSpins: 0,
    jackpotWins: 0,
    leaderboardClaims: {},
    leaderboardPeriodStarts: {},
    flagsClaimedOn: todayUTC(),
    monthlyResetDate: todayUTC(),
  };
}

function emptyMissions(): MissionState {
  return { spins: 0, adsWatched: 0, wheelSpins: 0, allClaimed: false };
}

function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

function dailyResetIfNeeded(state: GameState): GameState {
  const today = todayUTC();
  if (state.lastReset === today) return state;
  const todayDate = today;
  let loginStreak = state.loginStreak;
  let lastLogin = state.lastLogin;
  if (state.lastLogin) {
    const gap = daysBetween(state.lastLogin, todayDate);
    if (gap > 1) loginStreak = 0;
  }
  return {
    ...state,
    spinsRemaining: FREE_SPINS_BASE,
    freeSpinsClaimed: false,
    dailyBoostClaimed: false,
    dailyAdVideosWatched: 0,
    dailyUnlocksUsed: 0,
    dailyXpFree: 0,
    dailyXpBonus: 0,
    dailyDoubleUps: 0,
    dailyExtraLucky: 0,
    dailyHotStreak: 0,
    dailyMysteryPacks: 0,
    dailyPotAccel: 0,
    dailyXpBoosts: 0,
    xpBoostUntil: null,
    hotStreakUntil: null,
    potAccelUntil: null,
    doubleUpPending: null,
    extraLuckyPending: false,
    missions: emptyMissions(),
    dailyMissionClaims: [],
    allMissionsBonusClaimed: false,
    allMissionsAdBonusClaimed: false,
    ppEarnedToday: 0,
    streakClaimedToday: false,
    streakAdWatchedToday: false,
    streakDay: computeStreakReset(state, today) === null ? 0 : state.streakDay,
    lastReset: today,
    spinsToday: 0,
    loginStreak,
    lastLogin,
    lastStreakClaimDate: computeStreakReset(state, today),
  };
}

export function useGameState(userId: string | null) {
  const [state, setState] = useState<GameState>(() => {
    const loaded = loadState();
    return dailyResetIfNeeded(loaded);
  });
  const [cloudLoading, setCloudLoading] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const skipCloudSaveRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setCloudLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('data')
          .eq('id', userId)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          console.error('Cloud load error:', error);
          setCloudLoading(false);
          return;
        }
        if (data?.data) {
          const cloudState = { ...defaultState(), ...(data.data as Partial<GameState>) };
          const reset = dailyResetIfNeeded(cloudState);
          skipCloudSaveRef.current = true;
          setState(reset);
        } else {
          await supabase.from('user_profiles').upsert({
            id: userId,
            data: stateRef.current,
          });
        }
      } catch (err) {
        console.error('Cloud load failed:', err);
      } finally {
        if (!cancelled) setCloudLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  useEffect(() => {
    if (!userId) return;
    if (skipCloudSaveRef.current) {
      skipCloudSaveRef.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      try {
        await supabase.from('user_profiles').update({
          data: stateRef.current,
          last_synced: new Date().toISOString(),
        }).eq('id', userId);
      } catch (err) {
        console.error('Cloud save failed:', err);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [state, userId]);

  const update = useCallback((fn: (s: GameState) => GameState) => {
    setState((prev) => fn(prev));
  }, []);

  const addXP = useCallback((baseXp: number, viaAd: boolean) => {
    setState((prev) => {
      const multiplier = FIXED_MULTIPLIER * (isXPBoostActive(prev) ? 1.5 : 1);
      let xpToAdd = Math.round(baseXp * multiplier);
      let freeRemaining = Math.max(0, DAILY_XP_FREE_CAP - prev.dailyXpFree);
      let bonusRemaining = Math.max(0, DAILY_XP_BONUS_CAP - prev.dailyXpBonus);
      if (viaAd) {
        const freePart = Math.min(xpToAdd, freeRemaining);
        const bonusPart = Math.min(Math.max(xpToAdd - freePart, 0), bonusRemaining);
        return {
          ...prev,
          xp: prev.xp + freePart + bonusPart,
          dailyXpFree: prev.dailyXpFree + freePart,
          dailyXpBonus: prev.dailyXpBonus + bonusPart,
        };
      } else {
        const actual = Math.min(xpToAdd, freeRemaining);
        return {
          ...prev,
          xp: prev.xp + actual,
          dailyXpFree: prev.dailyXpFree + actual,
        };
      }
    });
  }, []);

  const addPP = useCallback((pp: number) => {
    setState((prev) => {
      const hotStreak = prev.hotStreakUntil && prev.hotStreakUntil > Date.now() ? 1.5 : 1;
      const streakBoost = prev.streakPPBoostUntil && prev.streakPPBoostUntil > Date.now() ? 1.2 : 1;
      const accelerated = prev.potAccelUntil && prev.potAccelUntil > Date.now() ? pp * 2 : pp;
      const final = Math.round(accelerated * FIXED_MULTIPLIER * hotStreak * streakBoost);
      const potFull = prev.lockedPotPP >= FIXED_POT_CAP;
      if (potFull) return prev;
      const newPot = Math.min(prev.lockedPotPP + final, FIXED_POT_CAP);
      return {
        ...prev,
        lockedPotPP: newPot,
        totalEarnedPP: prev.totalEarnedPP + (newPot - prev.lockedPotPP),
        ppEarnedToday: prev.ppEarnedToday + (newPot - prev.lockedPotPP),
      };
    });
  }, []);

  const isPotFull = useCallback((s?: GameState) => {
    const cur = s ?? stateRef.current;
    return cur.lockedPotPP >= FIXED_POT_CAP;
  }, []);

  const unlockPot = useCallback(() => {
    setState((prev) => {
      if (prev.dailyUnlocksUsed >= FIXED_DAILY_UNLOCKS) return prev;
      if (prev.lockedPotPP < MIN_UNLOCK_PP) return prev;
      const moved = prev.lockedPotPP;
      return {
        ...prev,
        lockedPotPP: 0,
        withdrawablePP: prev.withdrawablePP + moved,
        dailyUnlocksUsed: prev.dailyUnlocksUsed + 1,
      };
    });
  }, []);

  const recordSpin = useCallback(() => {
    setState((prev) => ({
      ...prev,
      spinsRemaining: Math.max(0, prev.spinsRemaining - 1),
      spinsToday: prev.spinsToday + 1,
      totalSpins: prev.totalSpins + 1,
      missions: { ...prev.missions, spins: prev.missions.spins + 1 },
    }));
  }, []);

  const addSpins = useCallback((n: number) => {
    setState((prev) => ({ ...prev, spinsRemaining: prev.spinsRemaining + n }));
  }, []);

  const watchAd = useCallback(() => {
    setState((prev) => ({
      ...prev,
      dailyAdVideosWatched: prev.dailyAdVideosWatched + 1,
      missions: { ...prev.missions, adsWatched: prev.missions.adsWatched + 1 },
    }));
  }, []);

  const claimDailyBonusSpins = useCallback(() => {
    setState((prev) => {
      if (prev.freeSpinsClaimed) return prev;
      return {
        ...prev,
        freeSpinsClaimed: true,
        spinsRemaining: prev.spinsRemaining + FREE_SPINS_DAILY_BONUS,
      };
    });
  }, []);

  const claimDailyBoost = useCallback(() => {
    setState((prev) => {
      if (prev.dailyBoostClaimed) return prev;
      return {
        ...prev,
        dailyBoostClaimed: true,
        spinsRemaining: prev.spinsRemaining + 5,
      };
    });
  }, []);

  const loginCheck = useCallback(() => {
    setState((prev) => {
      const today = todayUTC();
      if (prev.lastLogin === today) return prev;
      let streakDay = prev.streakDay;
      if (prev.lastStreakClaimDate) {
        const gap = daysBetween(prev.lastStreakClaimDate, today);
        if (gap >= 2) streakDay = 0;
      }
      const loginStreak = prev.loginStreak;
      const bestStreak = Math.max(prev.bestStreak, streakDay);
      return {
        ...prev,
        loginStreak,
        lastLogin: today,
        streakDay,
        streakClaimedToday: false,
        streakAdWatchedToday: false,
        bestStreak,
      };
    });
  }, []);

  const setFaucetpayEmail = useCallback((email: string) => {
    setState((prev) => ({ ...prev, faucetpayEmail: email }));
  }, []);

  const recordWithdrawal = useCallback((rec: WithdrawalRecord) => {
    setState((prev) => ({
      ...prev,
      withdrawablePP: prev.withdrawablePP - rec.amountPP,
      lastWithdraw: Date.now(),
      withdrawalHistory: [rec, ...prev.withdrawalHistory].slice(0, 50),
    }));
  }, []);

  const activateXPBoost = useCallback(() => {
    setState((prev) => ({
      ...prev,
      dailyXpBoosts: prev.dailyXpBoosts + 1,
      xpBoostUntil: Date.now() + 3600000,
    }));
  }, []);

  const activateHotStreak = useCallback(() => {
    setState((prev) => ({ ...prev, dailyHotStreak: prev.dailyHotStreak + 1, hotStreakUntil: Date.now() + 10 * 60000 }));
  }, []);

  const activatePotAccel = useCallback(() => {
    setState((prev) => ({ ...prev, dailyPotAccel: prev.dailyPotAccel + 1, potAccelUntil: Date.now() + 5 * 60000 }));
  }, []);

  const useDoubleUp = useCallback(() => {
    setState((prev) => ({
      ...prev,
      dailyDoubleUps: prev.dailyDoubleUps + 1,
      doubleUpPending: null,
      missions: { ...prev.missions, wheelSpins: prev.missions.wheelSpins + 1 },
    }));
  }, []);

  const useExtraLucky = useCallback(() => {
    setState((prev) => ({
      ...prev,
      dailyExtraLucky: prev.dailyExtraLucky + 1,
      extraLuckyPending: false,
      spinsRemaining: prev.spinsRemaining + 3,
    }));
  }, []);

  const openMysteryPack = useCallback(() => {
    const spins = 15 + Math.floor(Math.random() * 11);
    setState((prev) => ({ ...prev, spinsRemaining: prev.spinsRemaining + spins }));
    return spins;
  }, []);

  const setDoubleUpPending = useCallback((pp: number) => {
    setState((prev) => ({ ...prev, doubleUpPending: pp }));
  }, []);

  const setExtraLuckyPending = useCallback(() => {
    setState((prev) => ({ ...prev, extraLuckyPending: true }));
  }, []);

  const claimMission = useCallback((missionId: string, viaAd: boolean) => {
    setState((prev) => ({ ...prev, missions: { ...prev.missions, allClaimed: prev.missions.allClaimed } }));
    return { missionId, viaAd };
  }, []);

  const claimMissionReward = useCallback((missionId: string): boolean => {
    let accepted = false;
    setState((prev) => {
      if (prev.dailyMissionClaims.includes(missionId)) return prev;
      accepted = true;
      return { ...prev, dailyMissionClaims: [...prev.dailyMissionClaims, missionId] };
    });
    return accepted;
  }, []);

  const claimAllMissionsBonus = useCallback((): boolean => {
    let accepted = false;
    setState((prev) => {
      if (prev.allMissionsBonusClaimed) return prev;
      accepted = true;
      return { ...prev, allMissionsBonusClaimed: true };
    });
    return accepted;
  }, []);

  const claimAllMissionsAdBonus = useCallback((): boolean => {
    let accepted = false;
    setState((prev) => {
      if (prev.allMissionsAdBonusClaimed) return prev;
      accepted = true;
      return { ...prev, allMissionsAdBonusClaimed: true };
    });
    return accepted;
  }, []);

  const claimStreakRewardViaAd = useCallback((reward: { spins: number; xp: number; ppBoost?: boolean }) => {
    setState((prev) => {
      if (prev.streakClaimedToday) return prev;
      let newStreakDay: number;
      if (prev.streakDay >= 7) {
        newStreakDay = 1;
      } else {
        newStreakDay = prev.streakDay + 1;
      }
      const xpMultiplier = FIXED_MULTIPLIER * (isXPBoostActive(prev) ? 1.5 : 1);
      const xpToAdd = Math.round(reward.xp * xpMultiplier);
      const freeRemaining = Math.max(0, DAILY_XP_FREE_CAP - prev.dailyXpFree);
      const bonusRemaining = Math.max(0, DAILY_XP_BONUS_CAP - prev.dailyXpBonus);
      const freePart = Math.min(xpToAdd, freeRemaining);
      const bonusPart = Math.min(Math.max(xpToAdd - freePart, 0), bonusRemaining);
      const bestStreak = Math.max(prev.bestStreak, newStreakDay);
      return {
        ...prev,
        streakDay: newStreakDay,
        streakClaimedToday: true,
        streakAdWatchedToday: true,
        lastStreakClaimDate: todayUTC(),
        bestStreak,
        spinsRemaining: prev.spinsRemaining + reward.spins,
        xp: prev.xp + freePart + bonusPart,
        dailyXpFree: prev.dailyXpFree + freePart,
        dailyXpBonus: prev.dailyXpBonus + bonusPart,
        dailyAdVideosWatched: prev.dailyAdVideosWatched + 1,
        missions: { ...prev.missions, adsWatched: prev.missions.adsWatched + 1 },
        streakPPBoostUntil: reward.ppBoost ? Date.now() + 24 * 60 * 60 * 1000 : prev.streakPPBoostUntil,
      };
    });
  }, []);

  const recordReferral = useCallback(() => {
    setState((prev) => ({ ...prev, referrals: prev.referrals + 1, spinsRemaining: prev.spinsRemaining + 30 }));
  }, []);

  const recordJackpot = useCallback(() => {
    setState((prev) => ({ ...prev, jackpotWins: prev.jackpotWins + 1 }));
  }, []);

  const claimLeaderboardPrize = useCallback((key: string, xp: number, pp: number, rewardType: 'xp' | 'pp') => {
    setState((prev) => {
      if (prev.leaderboardClaims[key]) return prev;
      if (rewardType === 'xp') {
        const freeRemaining = Math.max(0, DAILY_XP_FREE_CAP - prev.dailyXpFree);
        const bonusRemaining = Math.max(0, DAILY_XP_BONUS_CAP - prev.dailyXpBonus);
        const freePart = Math.min(xp, freeRemaining);
        const bonusPart = Math.min(Math.max(xp - freePart, 0), bonusRemaining);
        return {
          ...prev,
          xp: prev.xp + freePart + bonusPart,
          dailyXpFree: prev.dailyXpFree + freePart,
          dailyXpBonus: prev.dailyXpBonus + bonusPart,
          leaderboardClaims: { ...prev.leaderboardClaims, [key]: true },
        };
      }
      const newPot = Math.min(prev.lockedPotPP + pp, FIXED_POT_CAP);
      return {
        ...prev,
        lockedPotPP: newPot,
        totalEarnedPP: prev.totalEarnedPP + (newPot - prev.lockedPotPP),
        ppEarnedToday: prev.ppEarnedToday + (newPot - prev.lockedPotPP),
        leaderboardClaims: { ...prev.leaderboardClaims, [key]: true },
      };
    });
  }, []);

  const resetLeaderboardClaims = useCallback((keys: string[]) => {
    setState((prev) => {
      const claims = { ...prev.leaderboardClaims };
      for (const k of keys) delete claims[k];
      return { ...prev, leaderboardClaims: claims };
    });
  }, []);

  const resetAll = useCallback(() => {
    const fresh = defaultState();
    fresh.lastLogin = todayUTC();
    fresh.loginStreak = 1;
    fresh.streakDay = 0;
    fresh.lastStreakClaimDate = null;
    setState(fresh);
  }, []);

  const actions = useMemo(() => ({
    state,
    cloudLoading,
    update,
    addXP,
    addPP,
    isPotFull,
    unlockPot,
    recordSpin,
    addSpins,
    watchAd,
    claimDailyBonusSpins,
    claimDailyBoost,
    loginCheck,
    setFaucetpayEmail,
    recordWithdrawal,
    activateXPBoost,
    activateHotStreak,
    activatePotAccel,
    useDoubleUp,
    useExtraLucky,
    openMysteryPack,
    setDoubleUpPending,
    setExtraLuckyPending,
    claimMission,
    claimMissionReward,
    claimAllMissionsBonus,
    claimAllMissionsAdBonus,
    claimStreakRewardViaAd,
    recordReferral,
    recordJackpot,
    claimLeaderboardPrize,
    resetLeaderboardClaims,
    resetAll,
  }), [
    state,
    cloudLoading,
    update,
    addXP,
    addPP,
    isPotFull,
    unlockPot,
    recordSpin,
    addSpins,
    watchAd,
    claimDailyBonusSpins,
    claimDailyBoost,
    loginCheck,
    setFaucetpayEmail,
    recordWithdrawal,
    activateXPBoost,
    activateHotStreak,
    activatePotAccel,
    useDoubleUp,
    useExtraLucky,
    openMysteryPack,
    setDoubleUpPending,
    setExtraLuckyPending,
    claimMission,
    claimMissionReward,
    claimAllMissionsBonus,
    claimAllMissionsAdBonus,
    claimStreakRewardViaAd,
    recordReferral,
    recordJackpot,
    claimLeaderboardPrize,
    resetLeaderboardClaims,
    resetAll,
  ]);

  return actions;
}

// ✅ FIXED EXPORT — Rollup can resolve this now
export type GameActions = ReturnType<typeof useGameState> extends { value: infer T } ? T : ReturnType<typeof useGameState>;

export function isXPBoostActive(s: GameState): boolean {
  return !!s.xpBoostUntil && s.xpBoostUntil > Date.now();
}
export function isStreakPPBoostActive(s: GameState): boolean {
  return !!s.streakPPBoostUntil && s.streakPPBoostUntil > Date.now();
}
export function isHotStreakActive(s: GameState): boolean {
  return !!s.hotStreakUntil && s.hotStreakUntil > Date.now();
}
export function isPotAccelActive(s: GameState): boolean {
  return !!s.potAccelUntil && s.potAccelUntil > Date.now();
}

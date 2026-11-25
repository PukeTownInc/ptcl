import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState, MissionState, WithdrawalRecord, CacheBoxTier, SlotHistoryRecord } from './types';
import {
  ALL_MISSIONS_BONUS,
  CACHE_BOXES,
  DAILY_XP_BONUS_CAP,
  DAILY_XP_FREE_CAP,
  FREE_SPINS_BASE,
  FREE_SPINS_DAILY_BONUS,
  JACKPOT_FRAGMENTS_TO_UNLOCK,
  MIN_UNLOCK_PP,
  MISSIONS,
  PLINKO_MULTIPLIERS,
  rollCacheReward,
} from './constants';
import { supabase } from './lib/supabase';

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
    missions: { spins: 0, adsWatched: 0, wheelSpins: 0, roadmapDailyGiftClaimed: false, allClaimed: false },
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
    lastFreeCacheClaimDate: null,
    blueCacheAdClaims: 0,
    blueCacheClaimedToday: false,
    purpleCacheAdClaimedDate: null,
    jackpotFragments: 0,
    slotBet: 10,
    slotAutoCount: 10,
    slotHistory: [],
  };
}

function emptyMissions(): MissionState {
  return { spins: 0, adsWatched: 0, wheelSpins: 0, roadmapDailyGiftClaimed: false, allClaimed: false };
}

function dailyResetIfNeeded(state: GameState): GameState {
  const today = todayUTC();
  if (state.lastReset === today) return state;

  let loginStreak = state.loginStreak;
  let lastLogin = state.lastLogin;
  if (state.lastLogin) {
    const gap = daysBetween(state.lastLogin, today);
    if (gap > 1) loginStreak = 0;
  }

  return {
    ...state,
    dailyBoostClaimed: false,
    dailyAdVideosWatched: 0,
    dailyUnlocksUsed: 0,
    dailyXpFree: 0,
    dailyXpBonus: 0,
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
    streakClaimedToday: false,
    streakAdWatchedToday: false,
    streakDay: computeStreakReset(state, today) === null ? 0 : state.streakDay,
    loginStreak,
    lastLogin,
    lastStreakClaimDate: computeStreakReset(state, today),
    blueCacheAdClaims: 0,
    blueCacheClaimedToday: false,
    purpleCacheAdClaimedDate: null,
  };
}

const CLIENT_PROTECTED_ECONOMY_KEYS = [
  'lockedPotPP','withdrawablePP','totalEarnedPP','ppEarnedToday',
  'spinsRemaining','freeSpinsClaimed','withdrawalHistory','lastWithdraw',
  'slotHistory','totalSpins','spinsToday','jackpotWins',
] as const;

export function useGameState(userId: string | null) {
  const [state, setState] = useState<GameState | null>(null);
  const [cloudLoading, setCloudLoading] = useState(true);
  const stateRef = useRef<GameState | null>(null);
  const isSavingRef = useRef(false);
  const pendingUpdateRef = useRef<GameState | null>(null);
  const lastSyncedJsonRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setState(null);
      stateRef.current = null;
      lastSyncedJsonRef.current = null;
      setCloudLoading(false);
      return;
    }

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

        if (!error && data?.data) {
          const merged = { ...defaultState(), ...(data.data as Partial<GameState>) };
          const reset = dailyResetIfNeeded(merged);
          setState(reset);
          stateRef.current = reset;
          lastSyncedJsonRef.current = JSON.stringify(reset);
        } else {
          const fresh = dailyResetIfNeeded(defaultState());
          setState(fresh);
          stateRef.current = fresh;
          const { error: createError } = await supabase.from('user_profiles').upsert({ id: userId, data: fresh });
          if (createError) throw createError;
          lastSyncedJsonRef.current = JSON.stringify(fresh);
        }
      } catch (err) {
        console.error('Cloud load failed:', err);
        const fresh = dailyResetIfNeeded(defaultState());
        setState(fresh);
        stateRef.current = fresh;
      } finally {
        if (!cancelled) setCloudLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!userId || !state || cloudLoading) return;
    if (JSON.stringify(state) === lastSyncedJsonRef.current) return;

    const saveToCloud = async () => {
      if (isSavingRef.current) {
        pendingUpdateRef.current = state;
        return;
      }

      isSavingRef.current = true;
      try {
        const snapshot = JSON.stringify(state);
        const { error } = await supabase.from('user_profiles').upsert({
          id: userId,
          data: state,
          last_synced: new Date().toISOString(),
        });
        if (error) throw error;
        lastSyncedJsonRef.current = snapshot;
      } catch (err) {
        console.error('Cloud save failed:', err);
      } finally {
        isSavingRef.current = false;
        if (pendingUpdateRef.current) {
          const next = pendingUpdateRef.current;
          pendingUpdateRef.current = null;
          if (next) {
            setState(next);
            stateRef.current = next;
          }
        }
      }
    };

    const timer = setTimeout(saveToCloud, 300);
    return () => clearTimeout(timer);
  }, [state, userId, cloudLoading]);

  useEffect(() => {
    if (!userId || cloudLoading) return;
    const channel = supabase
      .channel(`user-profile-sync-${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_profiles',
        filter: `id=eq.${userId}`,
      }, (payload) => {
        const data = payload.new?.data as Partial<GameState> | undefined;
        if (!data) return;
        const remote = { ...defaultState(), ...data };
        const remoteJson = JSON.stringify(remote);
        if (remoteJson === lastSyncedJsonRef.current) return;
        const localJson = stateRef.current ? JSON.stringify(stateRef.current) : null;
        // Do not overwrite local unsaved actions; the next cloud save wins.
        if (localJson !== lastSyncedJsonRef.current) return;
        stateRef.current = remote;
        lastSyncedJsonRef.current = remoteJson;
        setState(remote);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, cloudLoading]);

  const updateState = useCallback((updater: (prev: GameState) => GameState) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = { ...updater(prev) } as GameState;
      // Only server-authoritative actions may change balances, redeemable history or spins.
      const writable = next as unknown as Record<string, unknown>;
      const previous = prev as unknown as Record<string, unknown>;
      for (const key of CLIENT_PROTECTED_ECONOMY_KEYS) writable[key] = previous[key];
      stateRef.current = next;
      return next;
    });
  }, []);

  const addXP = useCallback((baseXp: number, viaAd: boolean, skipDailyCap = false) => {
    updateState((prev) => {
      const xpToAdd = baseXp;
      if (skipDailyCap) {
        return { ...prev, xp: prev.xp + xpToAdd, dailyXpFree: prev.dailyXpFree + xpToAdd };
      }

      const freeRemaining = Math.max(0, DAILY_XP_FREE_CAP - prev.dailyXpFree);
      const bonusRemaining = Math.max(0, DAILY_XP_BONUS_CAP - prev.dailyXpBonus);

      if (viaAd) {
        const freePart = Math.min(xpToAdd, freeRemaining);
        const bonusPart = Math.min(Math.max(xpToAdd - freePart, 0), bonusRemaining);
        return { ...prev, xp: prev.xp + freePart + bonusPart, dailyXpFree: prev.dailyXpFree + freePart, dailyXpBonus: prev.dailyXpBonus + bonusPart };
      } else {
        const actual = Math.min(xpToAdd, freeRemaining);
        return { ...prev, xp: prev.xp + actual, dailyXpFree: prev.dailyXpFree + actual };
      }
    });
  }, [updateState]);

  const addPP = useCallback((pp: number) => {
    updateState((prev) => {
      const newPot = Math.min(prev.lockedPotPP + pp, 500000);
      return {
        ...prev,
        lockedPotPP: newPot,
        totalEarnedPP: prev.totalEarnedPP + pp,
        ppEarnedToday: prev.ppEarnedToday + pp,
      };
    });
  }, [updateState]);

  const isPotFull = useCallback((): boolean => {
    return !!stateRef.current && stateRef.current.lockedPotPP >= 500000;
  }, []);

  const unlockPot = useCallback(() => {
    updateState((prev) => {
      if (prev.lockedPotPP < MIN_UNLOCK_PP) return prev;
      const moved = prev.lockedPotPP;
      return { ...prev, lockedPotPP: 0, withdrawablePP: prev.withdrawablePP + moved, dailyUnlocksUsed: prev.dailyUnlocksUsed + 1 };
    });
  }, [updateState]);

  const setSlotPreferences = useCallback((betPP: number, autoCount: number) => {
    updateState((prev) => ({
      ...prev,
      slotBet: Math.max(1, Math.min(1000, Math.floor(betPP))),
      slotAutoCount: Math.max(0, Math.min(100, Math.floor(autoCount))),
    }));
  }, [updateState]);

  const recordSlotHistory = useCallback((entry: SlotHistoryRecord) => {
    updateState((prev) => ({
      ...prev,
      slotHistory: [entry, ...(prev.slotHistory ?? [])].slice(0, 20),
    }));
  }, [updateState]);

  const settleSlotSpin = useCallback((
    betPP: number,
    payoutPP: number,
    useFreeSpin: boolean,
    historyEntry: SlotHistoryRecord,
    jackpotWon = false,
  ): boolean => {
    let accepted = false;
    const safeBet = Math.max(1, Math.min(1000, Math.floor(betPP)));
    const safePayout = Math.max(0, Math.floor(payoutPP));
    updateState((prev) => {
      if (useFreeSpin ? prev.spinsRemaining <= 0 : prev.lockedPotPP < safeBet) return prev;
      accepted = true;
      const afterStake = prev.lockedPotPP - (useFreeSpin ? 0 : safeBet);
      return {
        ...prev,
        lockedPotPP: Math.min(afterStake + safePayout, 500000),
        totalEarnedPP: prev.totalEarnedPP + safePayout,
        ppEarnedToday: prev.ppEarnedToday + safePayout,
        spinsRemaining: useFreeSpin ? prev.spinsRemaining - 1 : prev.spinsRemaining,
        spinsToday: prev.spinsToday + 1,
        totalSpins: prev.totalSpins + 1,
        missions: { ...prev.missions, spins: prev.missions.spins + 1 },
        xp: prev.xp + 1,
        dailyXpFree: prev.dailyXpFree + 1,
        jackpotWins: prev.jackpotWins + (jackpotWon ? 1 : 0),
        slotHistory: [historyEntry, ...(prev.slotHistory ?? [])].slice(0, 20),
      };
    });
    return accepted;
  }, [updateState]);

  const recordSpin = useCallback(() => {
    updateState((prev) => {
      const xpToAdd = 1;
      return {
        ...prev,
        spinsRemaining: Math.max(0, prev.spinsRemaining - 1),
        spinsToday: prev.spinsToday + 1,
        totalSpins: prev.totalSpins + 1,
        missions: { ...prev.missions, spins: prev.missions.spins + 1 },
        xp: prev.xp + xpToAdd,
        dailyXpFree: prev.dailyXpFree + xpToAdd,
      };
    });
  }, [updateState]);

  const addSpins = useCallback((n: number) => {
    updateState((prev) => ({ ...prev, spinsRemaining: prev.spinsRemaining + n }));
  }, [updateState]);

  const watchAd = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      dailyAdVideosWatched: prev.dailyAdVideosWatched + 1,
      missions: { ...prev.missions, adsWatched: prev.missions.adsWatched + 1 },
    }));
  }, [updateState]);

  const claimDailyBonusSpins = useCallback(() => {
    updateState((prev) => prev.freeSpinsClaimed ? prev : { ...prev, freeSpinsClaimed: true, spinsRemaining: prev.spinsRemaining + FREE_SPINS_DAILY_BONUS });
  }, [updateState]);

  const claimDailyBoost = useCallback(() => {
    updateState((prev) => prev.dailyBoostClaimed ? prev : { ...prev, dailyBoostClaimed: true, spinsRemaining: prev.spinsRemaining + 5 });
  }, [updateState]);

  const claimRoadmapDailyGift = useCallback(() => {
    let accepted = false;
    updateState((prev) => {
      if (prev.missions.roadmapDailyGiftClaimed) return prev;
      accepted = true;
      return { ...prev, missions: { ...prev.missions, roadmapDailyGiftClaimed: true } };
    });
    return accepted;
  }, [updateState]);

  const canClaimFreeCache = useCallback((): boolean => {
    return !!stateRef.current && stateRef.current.lastFreeCacheClaimDate !== todayUTC();
  }, []);

  const canClaimBlueCacheViaAd = useCallback((): boolean => {
    return !!stateRef.current && stateRef.current.blueCacheAdClaims < 2;
  }, []);

  const canClaimPurpleCacheViaAd = useCallback((): boolean => {
    const today = todayUTC();
    return !!stateRef.current && stateRef.current.purpleCacheAdClaimedDate !== today;
  }, []);

  const openCacheBox = useCallback((tier: CacheBoxTier, viaAd = false): { ok: boolean; reward: ReturnType<typeof rollCacheReward> } => {
    const box = CACHE_BOXES[tier];
    if (!box || !stateRef.current) return { ok: false, reward: {} };
    const today = todayUTC();
    let result: { ok: boolean; reward: ReturnType<typeof rollCacheReward> } = { ok: false, reward: {} };

    updateState((prev) => {
      if (tier === 'blue') {
        if (viaAd ? prev.blueCacheAdClaims >= 2 : prev.lastFreeCacheClaimDate === today) return prev;
      } else if (tier === 'purple') {
        if (viaAd ? prev.purpleCacheAdClaimedDate === today : prev.lockedPotPP < box.costPP) return prev;
      } else {
        if (prev.lockedPotPP < box.costPP) return prev;
      }

      const reward = rollCacheReward(tier);
      result = { ok: true, reward };
      let next = { ...prev };

      if (tier === 'blue') {
        if (viaAd) next.blueCacheAdClaims = prev.blueCacheAdClaims + 1;
        else { next.lastFreeCacheClaimDate = today; next.blueCacheClaimedToday = true; }
      } else if (tier === 'purple') {
        if (viaAd) next.purpleCacheAdClaimedDate = today;
        else next.lockedPotPP = Math.max(0, next.lockedPotPP - box.costPP);
      } else next.lockedPotPP = Math.max(0, next.lockedPotPP - box.costPP);

      if (reward.xp) { next.xp += reward.xp; next.dailyXpFree += reward.xp; }
      if (reward.spins) next.spinsRemaining += reward.spins;
      if (reward.pp) {
        next.lockedPotPP = Math.min(next.lockedPotPP + reward.pp, 500000);
        next.totalEarnedPP += reward.pp;
        next.ppEarnedToday += reward.pp;
      }
      if (reward.jackpotFragment) {
        next.jackpotFragments += 1;
        if (next.jackpotFragments >= JACKPOT_FRAGMENTS_TO_UNLOCK) {
          next.jackpotFragments = 0;
          next.spinsRemaining += 50;
        }
      }

      return next;
    });

    return result;
  }, [updateState]);

  const playPlinko = useCallback((betPP: number, chosenPocketIndex?: number): { ok: boolean; pocketIndex: number; multiplier: number; payoutPP: number } => {
    if (!stateRef.current || stateRef.current.lockedPotPP < betPP) {
      return { ok: false, pocketIndex: 0, multiplier: 0, payoutPP: 0 };
    }

    let pocketIndex: number;
    if (chosenPocketIndex !== undefined) {
      pocketIndex = chosenPocketIndex;
    } else {
      let pos = 3.5;
      for (let row = 0; row < 8; row++) {
        pos += Math.random() < 0.5 ? -0.5 : 0.5;
      }
      pocketIndex = Math.max(0, Math.min(7, Math.round(pos)));
    }

    const multiplier = PLINKO_MULTIPLIERS[pocketIndex];
    const payoutPP = Math.round(betPP * multiplier);

    updateState((prev) => {
      if (prev.lockedPotPP < betPP) return prev;
      return {
        ...prev,
        lockedPotPP: Math.min(prev.lockedPotPP - betPP + payoutPP, 500000),
        totalEarnedPP: prev.totalEarnedPP + Math.max(0, payoutPP - betPP),
        ppEarnedToday: prev.ppEarnedToday + Math.max(0, payoutPP - betPP),
      };
    });

    return { ok: true, pocketIndex, multiplier, payoutPP };
  }, [updateState]);

  const loginCheck = useCallback(() => {
    updateState((prev) => {
      const today = todayUTC();
      if (prev.lastLogin === today) return prev;

      let streakDay = prev.streakDay;
      if (prev.lastStreakClaimDate) {
        const gap = daysBetween(prev.lastStreakClaimDate, today);
        if (gap >= 2) streakDay = 0;
      }

      const bestStreak = Math.max(prev.bestStreak, streakDay);
      return { ...prev, lastLogin: today, streakDay, streakClaimedToday: false, bestStreak };
    });
  }, [updateState]);

  const setFaucetpayEmail = useCallback((email: string) => {
    updateState((prev) => ({ ...prev, faucetpayEmail: email }));
  }, [updateState]);

  const adjustWithdrawablePP = useCallback((delta: number) => {
    updateState((prev) => ({ ...prev, withdrawablePP: Math.max(0, prev.withdrawablePP + delta) }));
  }, [updateState]);

  const recordWithdrawal = useCallback((rec: WithdrawalRecord) => {
    updateState((prev) => ({
      ...prev,
      withdrawablePP: Math.max(0, prev.withdrawablePP - (rec.amountPP + rec.feePP)),
      lastWithdraw: Date.now(),
      withdrawalHistory: [rec, ...prev.withdrawalHistory].slice(0, 50),
    }));
  }, [updateState]);

  const activateXPBoost = useCallback(() => {
    updateState((prev) => ({ ...prev, dailyXpBoosts: prev.dailyXpBoosts + 1, xpBoostUntil: Date.now() + 3600000 }));
  }, [updateState]);

  const activateHotStreak = useCallback(() => {
    updateState((prev) => ({ ...prev, dailyHotStreak: prev.dailyHotStreak + 1, hotStreakUntil: Date.now() + 10 * 60000 }));
  }, [updateState]);

  const activatePotAccel = useCallback(() => {
    updateState((prev) => ({ ...prev, dailyPotAccel: prev.dailyPotAccel + 1, potAccelUntil: Date.now() + 5 * 60000 }));
  }, [updateState]);

  const useDoubleUp = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      doubleUpPending: null,
      missions: { ...prev.missions, wheelSpins: prev.missions.wheelSpins + 1 },
    }));
  }, [updateState]);

  const useExtraLucky = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      dailyExtraLucky: prev.dailyExtraLucky + 1,
      extraLuckyPending: false,
      spinsRemaining: prev.spinsRemaining + 3,
    }));
  }, [updateState]);

  const openMysteryPack = useCallback(() => {
    const spins = 15 + Math.floor(Math.random() * 11);
    updateState((prev) => ({ ...prev, spinsRemaining: prev.spinsRemaining + spins }));
    return spins;
  }, [updateState]);

  const setDoubleUpPending = useCallback((pp: number) => {
    updateState((prev) => ({ ...prev, doubleUpPending: pp }));
  }, [updateState]);

  const setExtraLuckyPending = useCallback(() => {
    updateState((prev) => ({ ...prev, extraLuckyPending: true }));
  }, [updateState]);

  const claimMissionReward = useCallback((missionId: string, viaAd = false): boolean => {
    let accepted = false;
    updateState((prev) => {
      if (prev.dailyMissionClaims.includes(missionId)) return prev;
      accepted = true;
      const mission = MISSIONS.find(m => m.id === missionId);
      if (!mission) return { ...prev, dailyMissionClaims: [...prev.dailyMissionClaims, missionId] };

      const xpValue = viaAd ? mission.adXp : mission.baseXp;
      const spinsToAdd = viaAd ? mission.adSpins : 0;
      return {
        ...prev,
        dailyMissionClaims: [...prev.dailyMissionClaims, missionId],
        xp: prev.xp + xpValue,
        dailyXpFree: prev.dailyXpFree + xpValue,
        spinsRemaining: prev.spinsRemaining + spinsToAdd,
      };
    });
    return accepted;
  }, [updateState]);

  const claimAllMissionsBonus = useCallback((): boolean => {
    let accepted = false;
    updateState((prev) => {
      if (prev.allMissionsBonusClaimed) return prev;
      accepted = true;
      const { baseXp, baseSpins } = ALL_MISSIONS_BONUS;
      return {
        ...prev,
        allMissionsBonusClaimed: true,
        xp: prev.xp + baseXp,
        dailyXpFree: prev.dailyXpFree + baseXp,
        spinsRemaining: prev.spinsRemaining + baseSpins,
      };
    });
    return accepted;
  }, [updateState]);

  const claimAllMissionsAdBonus = useCallback((): boolean => {
    let accepted = false;
    updateState((prev) => {
      if (prev.allMissionsAdBonusClaimed) return prev;
      accepted = true;
      const { adXp, adSpins } = ALL_MISSIONS_BONUS;
      return {
        ...prev,
        allMissionsAdBonusClaimed: true,
        xp: prev.xp + adXp,
        dailyXpBonus: prev.dailyXpBonus + adXp,
        spinsRemaining: prev.spinsRemaining + adSpins,
      };
    });
    return accepted;
  }, [updateState]);

  const claimStreakRewardViaAd = useCallback((reward: { spins: number; xp: number; ppBoost?: boolean }) => {
    updateState((prev) => {
      if (prev.streakClaimedToday) return prev;
      const newStreakDay = prev.streakDay >= 7 ? 1 : prev.streakDay + 1;
      const bestStreak = Math.max(prev.bestStreak, newStreakDay);
      return {
        ...prev,
        streakDay: newStreakDay,
        streakClaimedToday: true,
        streakAdWatchedToday: true,
        lastStreakClaimDate: todayUTC(),
        bestStreak,
        spinsRemaining: prev.spinsRemaining + reward.spins,
        xp: prev.xp + reward.xp,
        dailyXpBonus: prev.dailyXpBonus + reward.xp,
        dailyAdVideosWatched: prev.dailyAdVideosWatched + 1,
        missions: { ...prev.missions, adsWatched: prev.missions.adsWatched + 1 },
        streakPPBoostUntil: reward.ppBoost ? Date.now() + 24 * 60 * 60 * 1000 : prev.streakPPBoostUntil,
      };
    });
  }, [updateState]);

  const recordReferral = useCallback(() => {
    updateState((prev) => ({ ...prev, referrals: prev.referrals + 1, spinsRemaining: prev.spinsRemaining + 30 }));
  }, [updateState]);

  const recordJackpot = useCallback(() => {
    updateState((prev) => ({ ...prev, jackpotWins: prev.jackpotWins + 1 }));
  }, [updateState]);

  const claimLeaderboardPrize = useCallback((key: string, xp: number, pp: number, rewardType: 'xp' | 'pp') => {
    updateState((prev) => {
      if (prev.leaderboardClaims[key]) return prev;
      if (rewardType === 'xp') {
        return { ...prev, xp: prev.xp + xp, dailyXpBonus: prev.dailyXpBonus + xp, leaderboardClaims: { ...prev.leaderboardClaims, [key]: true } };
      }
      const newPot = Math.min(prev.lockedPotPP + pp, 500000);
      return { ...prev, lockedPotPP: newPot, totalEarnedPP: prev.totalEarnedPP + pp, ppEarnedToday: prev.ppEarnedToday + pp, leaderboardClaims: { ...prev.leaderboardClaims, [key]: true } };
    });
  }, [updateState]);

  const setLeaderboardPeriodStart = useCallback((key: string, start: number) => {
    updateState((prev) => ({
      ...prev,
      leaderboardPeriodStarts: { ...prev.leaderboardPeriodStarts, [key]: start },
    }));
  }, [updateState]);

  const resetLeaderboardClaims = useCallback((keys: string[]) => {
    updateState((prev) => {
      const claims = { ...prev.leaderboardClaims };
      for (const k of keys) delete claims[k];
      return { ...prev, leaderboardClaims: claims };
    });
  }, [updateState]);

  const resetAll = useCallback(() => {
    const fresh = dailyResetIfNeeded(defaultState());
    const current = stateRef.current;
    if (current) {
      fresh.lockedPotPP = current.lockedPotPP;
      fresh.withdrawablePP = current.withdrawablePP;
      fresh.totalEarnedPP = current.totalEarnedPP;
      fresh.ppEarnedToday = current.ppEarnedToday;
      fresh.spinsRemaining = current.spinsRemaining;
      fresh.freeSpinsClaimed = current.freeSpinsClaimed;
      fresh.withdrawalHistory = current.withdrawalHistory;
      fresh.lastWithdraw = current.lastWithdraw;
      fresh.slotHistory = current.slotHistory;
      fresh.totalSpins = current.totalSpins;
      fresh.spinsToday = current.spinsToday;
      fresh.jackpotWins = current.jackpotWins;
      fresh.lastReset = current.lastReset;
    }
    fresh.lastLogin = todayUTC();
    fresh.loginStreak = 1;
    fresh.streakDay = 0;
    fresh.lastStreakClaimDate = null;
    setState(fresh);
    stateRef.current = fresh;
  }, []);

  return useMemo(() => ({
    state,
    cloudLoading,
    addXP, addPP, isPotFull, unlockPot,
    recordSpin, addSpins, watchAd, claimDailyBonusSpins, claimDailyBoost,
    setSlotPreferences, recordSlotHistory, settleSlotSpin,
    claimRoadmapDailyGift, loginCheck, setFaucetpayEmail, adjustWithdrawablePP, recordWithdrawal,
    activateXPBoost, activateHotStreak, activatePotAccel, useDoubleUp,
    useExtraLucky, openMysteryPack, setDoubleUpPending, setExtraLuckyPending,
    claimMissionReward, claimAllMissionsBonus, claimAllMissionsAdBonus,
    claimStreakRewardViaAd, recordReferral, recordJackpot, claimLeaderboardPrize,
    resetLeaderboardClaims, setLeaderboardPeriodStart, resetAll,
    canClaimFreeCache, canClaimBlueCacheViaAd, canClaimPurpleCacheViaAd, openCacheBox,
    playPlinko,
  }), [
    state, cloudLoading,
    addXP, addPP, isPotFull, unlockPot,
    recordSpin, addSpins, watchAd, claimDailyBonusSpins, claimDailyBoost,
    setSlotPreferences, recordSlotHistory, settleSlotSpin,
    claimRoadmapDailyGift, loginCheck, setFaucetpayEmail, adjustWithdrawablePP, recordWithdrawal,
    activateXPBoost, activateHotStreak, activatePotAccel, useDoubleUp,
    useExtraLucky, openMysteryPack, setDoubleUpPending, setExtraLuckyPending,
    claimMissionReward, claimAllMissionsBonus, claimAllMissionsAdBonus,
    claimStreakRewardViaAd, recordReferral, recordJackpot, claimLeaderboardPrize,
    resetLeaderboardClaims, setLeaderboardPeriodStart, resetAll,
    canClaimFreeCache, canClaimBlueCacheViaAd, canClaimPurpleCacheViaAd, openCacheBox,
    playPlinko,
  ]);
}

export function isXPBoostActive(s: GameState): boolean { return !!s.xpBoostUntil && s.xpBoostUntil > Date.now(); }
export function isStreakPPBoostActive(s: GameState): boolean { return !!s.streakPPBoostUntil && s.streakPPBoostUntil > Date.now(); }
export function isHotStreakActive(s: GameState): boolean { return !!s.hotStreakUntil && s.hotStreakUntil > Date.now(); }
export function isPotAccelActive(s: GameState): boolean { return !!s.potAccelUntil && s.potAccelUntil > Date.now(); }

export type GameActions = ReturnType<typeof useGameState>;

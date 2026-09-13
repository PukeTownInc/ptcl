import { useEffect, useMemo, useState } from 'react';
import { Trophy, Star, Coins, Tv, Lock, Clock, Crown, ChevronRight, CheckCircle2, Info, Calendar, RotateCcw, Users } from 'lucide-react';
import type { GameState, LeaderboardCategory, LeaderboardPeriod, LeaderboardEntry } from '../types';
import type { GameActions } from '../useGameState';
import { useToast } from '../components/Toast';
import { AdModal } from '../components/AdModal';
import {
  generateLeaderboard,
  getTimeUntilReset,
  formatCountdown,
  getPrizeTable,
  getPlayerRank,
  getPlayerPrize,
  PERIOD_LABELS,
  PERIOD_ICONS,
  getPeriodBoundaries,
  getClaimWindowState,
  formatUTCDate,
  CATEGORY_LABELS,
  CATEGORY_REWARD,
} from '../leaderboardEngine';
import { formatPP } from '../constants';

interface Props {
  state: GameState;
  actions: GameActions;
}

const CATEGORIES: { id: LeaderboardCategory; label: string; icon: typeof Star }[] = [
  { id: 'xp', label: 'XP', icon: Star },
  { id: 'pp', label: 'Puke Points', icon: Coins },
  { id: 'spins', label: 'Total Spins', icon: RotateCcw },
  { id: 'referrals', label: 'Referrals', icon: Users },
];

const PERIOD: LeaderboardPeriod = 'monthly';

function claimKey(cat: LeaderboardCategory): string {
  return `${cat}_${PERIOD}`;
}

function periodStartKey(cat: LeaderboardCategory): string {
  return `start_${cat}_${PERIOD}`;
}

export function LeaderboardsScreen({ state, actions }: Props) {
  const toast = useToast();
  const [category, setCategory] = useState<LeaderboardCategory>('xp');
  const [now, setNow] = useState(Date.now());
  const [adModal, setAdModal] = useState<null | { title: string; subtitle?: string; reward: string; onComplete: () => void }>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const nowDate = new Date(now);
  const rewardType = CATEGORY_REWARD[category];

  const playerScore = useMemo(() => {
    switch (category) {
      case 'xp': return state.xp;
      case 'pp': return state.totalEarnedPP;
      case 'spins': return state.totalSpins;
      case 'referrals': return state.referrals;
    }
  }, [category, state.xp, state.totalEarnedPP, state.totalSpins, state.referrals]);

  const playerName = 'You';

  const entries = useMemo<LeaderboardEntry[]>(() => {
    return generateLeaderboard(category, PERIOD, playerScore, playerName);
  }, [category, playerScore]);

  const timeLeft = getTimeUntilReset(PERIOD, nowDate);
  const playerRank = getPlayerRank(entries);
  const playerPrize = getPlayerPrize(entries, PERIOD, category);
  const cKey = claimKey(category);
  const claimed = !!state.leaderboardClaims[cKey];

  const { start: periodStart, end: periodEnd } = getPeriodBoundaries(PERIOD, nowDate);
  const storedStart = state.leaderboardPeriodStarts[periodStartKey(category)];

  const periodChanged = storedStart !== undefined && storedStart !== periodStart;

  useEffect(() => {
    if (periodChanged) {
      const keysToReset: string[] = [];
      for (const cat of CATEGORIES) {
        const k = claimKey(cat.id);
        if (state.leaderboardClaims[k]) keysToReset.push(k);
      }
      if (keysToReset.length > 0) {
        actions.resetLeaderboardClaims(keysToReset);
      }
    }
    if (storedStart !== periodStart) {
      const key = periodStartKey(category);
      actions.update((s) => ({
        ...s,
        leaderboardPeriodStarts: {
          ...s.leaderboardPeriodStarts,
          [key]: periodStart,
        },
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodChanged, periodStart, storedStart, category]);

  const claimWindow = getClaimWindowState(PERIOD, nowDate);
  const isRanked = playerRank > 0 && playerRank <= 100;

  const canClaim = claimWindow.claimWindowOpen && isRanked && !claimed && !!playerPrize;

  const handleClaim = () => {
    if (!playerPrize || claimed || !canClaim) return;

    const rewardLabel = rewardType === 'xp'
      ? `+${playerPrize.xp} XP`
      : `+${formatPP(playerPrize.pp)} Puke Points`;

    setAdModal({
      title: `Claim ${PERIOD_LABELS[PERIOD]} Prize`,
      subtitle: `Rank #${playerRank} • ${CATEGORY_LABELS[category]} Leaderboard`,
      reward: rewardLabel,
      onComplete: () => {
        actions.claimLeaderboardPrize(cKey, playerPrize.xp, playerPrize.pp, rewardType);
        actions.watchAd();
        toast('success', 'Prize Claimed!', `${rewardLabel} added!`);
      },
    });
  };

  const prizeTable = getPrizeTable(PERIOD, category);

  function getClaimButtonState(): { label: string; sublabel?: string; color: string; disabled: boolean } {
    if (!isRanked) {
      return { label: 'Not Ranked', sublabel: 'Keep earning to reach top 100!', color: 'grey', disabled: true };
    }
    if (claimed) {
      return {
        label: 'Claimed',
        sublabel: "Next month's claims open on the 1st",
        color: 'grey',
        disabled: true,
      };
    }
    if (!claimWindow.periodEnded) {
      return {
        label: 'Locked — Month in progress',
        sublabel: 'Claim on 1st of next month',
        color: 'grey',
        disabled: true,
      };
    }
    if (claimWindow.claimWindowClosed) {
      return { label: 'Expired — Claim period ended', sublabel: '24h window expired', color: 'grey', disabled: true };
    }
    return { label: 'Claim now — Watch Ad', sublabel: '24h window open now!', color: 'green', disabled: false };
  }

  const claimState = getClaimButtonState();

  const claimBtnClass = claimState.color === 'green'
    ? 'yellow-btn w-full py-3 flex items-center justify-center gap-2 text-sm'
    : 'w-full py-3 flex items-center justify-center gap-2 text-sm bg-ink-700/60 border border-toxic-900/40 text-toxic-100/40 cursor-not-allowed';

  const scoreLabel = category === 'xp' ? 'XP' : category === 'pp' ? 'Puke Points' : category === 'spins' ? 'Spins' : 'Referrals';

  return (
    <div className="space-y-4">
      {/* Rules info box — at the very top */}
      <div className="rounded-lg bg-hazard-amber/10 border border-hazard-amber/30 p-3">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-hazard-amber shrink-0 mt-0.5" />
          <div className="text-[10px] font-mono text-hazard-amber/90 space-y-1">
            <div className="font-display font-bold text-[11px] text-hazard-amber mb-1">CLAIM RULES — READ FIRST</div>
            <p>Monthly resets on the last day of every month at 00:00 UTC</p>
            <p>Rewards are locked until the month ends — no early claims.</p>
            <p>Claim window: first 24 hours after month ends. Watch an ad to claim.</p>
            <p>After 24 hours, rewards expire — lost forever.</p>
          </div>
        </div>
      </div>

      {/* Header banner */}
      <div className="grunge-panel p-4 relative overflow-hidden">
        <div className="absolute inset-0 hazard-stripes opacity-[0.03]" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-b from-radioactive-400 to-radioactive-700 flex items-center justify-center animate-glow-pulse">
            <Trophy size={24} className="text-ink-900" />
          </div>
          <div className="flex-1">
            <h2 className="font-display font-black text-lg text-radioactive-400 neon-text-yellow tracking-wide">LEADERBOARDS</h2>
            <p className="text-[10px] text-toxic-100/50 font-mono">Top 100 • Monthly • Ad-gated prizes</p>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setCategory(id)}
            className={`px-3 py-2.5 rounded-lg flex items-center justify-center gap-1.5 font-display font-bold text-xs transition-all ${
              category === id
                ? rewardType === 'xp'
                  ? 'bg-toxic-500/20 border border-toxic-400 text-toxic-300 neon-border'
                  : 'bg-radioactive-500/20 border border-radioactive-400 text-radioactive-400 neon-border-yellow'
                : 'bg-ink-700/50 border border-toxic-900/30 text-toxic-100/50'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Period info + countdown */}
      <div className="grunge-panel p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-radioactive-400" />
            <span className="text-[10px] font-mono text-toxic-100/60">Period</span>
          </div>
          <span className="text-[10px] font-mono text-toxic-200">
            {formatUTCDate(periodStart)} → {formatUTCDate(periodEnd)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-radioactive-400" />
            <span className="text-[10px] font-mono text-toxic-100/60">Resets in</span>
          </div>
          <span className="font-mono text-sm font-bold text-radioactive-400 neon-text-yellow tabular-nums">{formatCountdown(timeLeft)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-toxic-100/60">Claim window</span>
          <span className={`text-[10px] font-mono ${claimWindow.claimWindowOpen ? 'text-toxic-400' : claimWindow.claimWindowClosed ? 'text-hazard-amber/60' : 'text-toxic-100/40'}`}>
            {claimWindow.claimWindowOpen
              ? `OPEN — closes ${formatUTCDate(claimWindow.claimWindowEnd)}`
              : claimWindow.claimWindowClosed
                ? 'Closed (expired)'
                : `Opens ${formatUTCDate(periodEnd)}`}
          </span>
        </div>
      </div>

      {/* Your rank + claim */}
      <div className={`grunge-panel p-4 ${isRanked ? 'border-radioactive-600/40' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-black text-sm ${
              playerRank === 1
                ? 'bg-radioactive-400/20 border border-radioactive-400 text-radioactive-400'
                : playerRank <= 3
                  ? 'bg-toxic-500/15 border border-toxic-400/50 text-toxic-400'
                  : playerRank <= 10
                    ? 'bg-toxic-500/10 border border-toxic-600/30 text-toxic-300'
                    : 'bg-ink-700 border border-toxic-900/40 text-toxic-100/60'
            }`}>
              {playerRank === 1 ? <Crown size={18} /> : `#${playerRank}`}
            </div>
            <div>
              <div className="font-display font-bold text-sm text-toxic-200">Your Rank</div>
              <div className="text-[10px] font-mono text-toxic-100/50">
                {rewardType === 'pp' ? formatPP(playerScore) : playerScore.toLocaleString()} {scoreLabel}
              </div>
            </div>
          </div>
          {isRanked && playerPrize && !claimed && (
            <div className="text-right">
              <div className="text-[9px] text-toxic-100/40 uppercase font-display">Prize</div>
              {rewardType === 'xp' ? (
                <div className="text-toxic-400 font-mono text-xs font-bold">+{playerPrize.xp} XP</div>
              ) : (
                <div className="text-radioactive-400 font-mono text-xs font-bold">+{formatPP(playerPrize.pp)} PP</div>
              )}
            </div>
          )}
        </div>

        {/* Claim button with state */}
        <button
          onClick={handleClaim}
          disabled={claimState.disabled}
          className={claimBtnClass}
        >
          {claimState.color === 'green' ? (
            <><Tv size={16} /> {claimState.label} <ChevronRight size={16} /></>
          ) : claimState.label === 'Claimed' ? (
            <><CheckCircle2 size={16} /> {claimState.label}</>
          ) : (
            <><Lock size={14} /> {claimState.label}</>
          )}
        </button>
        {claimState.sublabel && (
          <div className="text-center text-[10px] font-mono text-toxic-100/40 mt-1.5">
            {claimState.sublabel}
          </div>
        )}
      </div>

      {/* Leaderboard list */}
      <div className="grunge-panel overflow-hidden">
        <div className="px-4 py-2.5 border-b border-toxic-900/40 flex items-center justify-between">
          <span className="font-display font-bold text-xs text-toxic-300 uppercase tracking-wider">
            {PERIOD_ICONS[PERIOD]} {PERIOD_LABELS[PERIOD]} {CATEGORY_LABELS[category]}
          </span>
          <span className="text-[9px] text-toxic-100/40 font-mono">Top 100</span>
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-hide">
          {entries.map((entry) => {
            const prize = entry.rank <= 100 ? getPrizeTable(PERIOD, category).find((t) => entry.rank >= t.minRank && entry.rank <= t.maxRank) : null;
            const isTop3 = entry.rank <= 3;
            return (
              <div
                key={entry.id}
                className={`flex items-center gap-2 px-4 py-2 border-b border-toxic-900/20 ${
                  entry.isPlayer ? 'bg-toxic-500/10' : 'hover:bg-toxic-500/5'
                } transition-colors`}
              >
                <div className={`w-7 text-center font-mono font-bold text-xs ${
                  entry.rank === 1 ? 'text-radioactive-400' :
                  entry.rank === 2 ? 'text-toxic-300' :
                  entry.rank === 3 ? 'text-hazard-amber' :
                  'text-toxic-100/40'
                }`}>
                  {entry.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-display font-bold truncate ${
                    entry.isPlayer ? 'text-toxic-400' : 'text-toxic-200'
                  }`}>
                    {entry.isPlayer && <span className="text-toxic-400">★ </span>}
                    {entry.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-xs font-bold ${
                    rewardType === 'xp' ? 'text-toxic-300' : 'text-radioactive-400'
                  }`}>
                    {rewardType === 'pp' ? formatPP(entry.score) : entry.score.toLocaleString()}
                  </div>
                  {prize && (
                    <div className="text-[8px] font-mono text-toxic-100/30">
                      +{rewardType === 'xp' ? prize.xp : formatPP(prize.pp)}
                    </div>
                  )}
                </div>
                {isTop3 && (
                  <span className="text-sm">
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Prize table */}
      <div className="grunge-panel overflow-hidden">
        <div className="px-4 py-2.5 border-b border-toxic-900/40">
          <span className="font-display font-bold text-xs text-toxic-300 uppercase tracking-wider">
            🎁 {PERIOD_LABELS[PERIOD]} Prize Table — {CATEGORY_LABELS[category]}
          </span>
        </div>
        <div className="divide-y divide-toxic-900/20">
          {prizeTable.map((tier, i) => {
            const rankLabel = tier.minRank === tier.maxRank
              ? tier.minRank === 1 ? '🥇 1st' : tier.minRank === 2 ? '🥈 2nd' : tier.minRank === 3 ? '🥉 3rd' : `${tier.minRank}th`
              : `${tier.minRank}–${tier.maxRank}`;
            return (
              <div key={i} className="flex items-center justify-between px-4 py-2">
                <span className={`text-xs font-display ${i < 3 ? 'text-toxic-300' : 'text-toxic-100/60'}`}>{rankLabel}</span>
                <div className="flex gap-3 text-right">
                  {rewardType === 'xp' ? (
                    <span className="font-mono text-xs text-toxic-400 font-bold">+{tier.xp} XP</span>
                  ) : (
                    <span className="font-mono text-xs text-radioactive-400 font-bold">+{formatPP(tier.pp)} PP</span>
                  )}
                </div>
              </div>
            );
          })}
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

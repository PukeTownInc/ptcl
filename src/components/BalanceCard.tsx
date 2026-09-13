import { ppToUsd, formatPP } from '../constants';

export function BalanceCard({
  lockedPP,
  withdrawablePP,
  tierBadge,
  tierLabel,
  potCap,
  xp,
  nextXp,
  compact,
}: {
  lockedPP: number;
  withdrawablePP: number;
  tierBadge: string;
  tierLabel: string;
  potCap: number;
  xp: number;
  nextXp: number | null;
  compact?: boolean;
}) {
  const potPct = Math.min(100, (lockedPP / potCap) * 100);
  const potFull = lockedPP >= potCap;

  return (
    <div className="grunge-panel p-4 space-y-3">
      {/* Locked pot */}
      <div className={`rounded-lg p-3 border ${potFull ? 'border-hazard-amber bg-hazard-amber/10 animate-shake' : 'border-toxic-900/50 bg-ink-700/50'}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-display uppercase tracking-wider text-toxic-300">Locked Pot</span>
          {potFull && <span className="text-[10px] font-display font-bold text-hazard-amber animate-pulse">POT FULL!</span>}
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="font-mono text-2xl font-bold text-toxic-400 neon-text">{formatPP(lockedPP)}</span>
          <span className="text-xs text-toxic-100/50">Puke Points</span>
        </div>
        <div className="text-[10px] font-mono text-toxic-100/40 mt-0.5">
          ${ppToUsd(lockedPP).toFixed(2)} USD
        </div>
        <div className="h-1.5 rounded-full bg-ink-900 mt-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${potFull ? 'bg-hazard-amber' : 'bg-toxic-400'}`}
            style={{ width: `${potPct}%` }}
          />
        </div>
        <p className="text-[9px] font-mono text-toxic-100/30 mt-1">{formatPP(lockedPP)} / {formatPP(potCap)} Puke Points</p>
      </div>

      {/* Withdrawable */}
      <div className="rounded-lg p-3 border border-radioactive-600/40 bg-radioactive-500/5">
        <span className="text-xs font-display uppercase tracking-wider text-radioactive-400">Withdrawable</span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="font-mono text-2xl font-bold text-radioactive-400 neon-text-yellow">{formatPP(withdrawablePP)}</span>
          <span className="text-xs text-radioactive-300/60">Puke Points</span>
        </div>
        <div className="text-[10px] font-mono text-radioactive-300/40 mt-0.5">
          ${ppToUsd(withdrawablePP).toFixed(2)} USD
        </div>
      </div>

      {!compact && (
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="stat-chip">
            <div className="text-[9px] text-toxic-100/40 uppercase">{tierBadge} Tier</div>
            <div className="text-toxic-300 font-display text-xs">{tierLabel}</div>
          </div>
          <div className="stat-chip">
            <div className="text-[9px] text-toxic-100/40 uppercase">XP</div>
            <div className="text-toxic-300 font-display text-xs">{xp.toLocaleString()}{nextXp !== null ? `/${nextXp.toLocaleString()}` : ''}</div>
          </div>
        </div>
      )}
    </div>
  );
}

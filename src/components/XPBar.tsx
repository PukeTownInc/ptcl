import { getTier, getNextTier } from '../constants';

export function XPBar({ xp }: { xp: number }) {
  const tier = getTier(xp);
  const next = getNextTier(xp);
  const progress = next
    ? Math.min(100, ((xp - tier.minXp) / (next.minXp - tier.minXp)) * 100)
    : 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs font-mono mb-1">
        <span className="text-toxic-300">{tier.badge} {tier.label}</span>
        <span className="text-toxic-100/60">{xp.toLocaleString()} XP</span>
      </div>
      <div className="h-3 rounded-full bg-ink-700 border border-toxic-900/50 overflow-hidden relative">
        <div
          className="h-full bg-gradient-to-r from-toxic-500 to-toxic-300 transition-all duration-700 ease-out relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </div>
      </div>
      {next && (
        <p className="text-[10px] text-toxic-100/40 mt-1 font-mono">
          Next: {next.badge} {next.label} at {next.minXp.toLocaleString()} XP → {(next.potCap / 1000).toFixed(0)}k Pot
        </p>
      )}
    </div>
  );
}

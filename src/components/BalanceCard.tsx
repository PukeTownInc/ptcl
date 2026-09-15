import { ppToUsd, formatPP } from '../constants';

export function BalanceCard({
  lockedPP,
  withdrawablePP,
  xp,
  nextXp,
  compact,
}: {
  lockedPP: number;
  withdrawablePP: number;
  xp?: number;
  nextXp: number | null;
  compact?: boolean;
}) {
  const UNLOCK_THRESHOLD = 50000;
  const progressPct = Math.min(100, (lockedPP / UNLOCK_THRESHOLD) * 100);
  const isUnlocked = lockedPP >= UNLOCK_THRESHOLD;

  return (
    <div className="grunge-panel p-4 space-y-3">
      {/* DECONTAMINATION CHAMBER Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-radioactive-400">☢️</span>
        <h2 className="font-display font-bold text-sm text-radioactive-400">DECONTAMINATION CHAMBER</h2>
      </div>

      {/* TWO VAULTS */}
      <div className="grid grid-cols-2 gap-2">
        {/* LEFT — LOCKED CONTAGION VAULT */}
        <div className={`rounded-lg p-3 border ${isUnlocked ? 'border-hazard-amber bg-hazard-amber/10 animate-shake' : 'border-toxic-900/40 bg-ink-700/50'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-display uppercase tracking-wider text-toxic-300">LOCKED CONTAGION VAULT</span>
            {isUnlocked && <span className="text-[10px] font-display font-bold text-hazard-amber animate-pulse">UNLOCKED!</span>}
          </div>
          <div className="font-mono text-xl font-bold text-toxic-300 mt-1">{formatPP(lockedPP)}</div>
          <div className="text-[10px] text-toxic-100/40 font-mono mt-0.5">
            ${ppToUsd(lockedPP).toFixed(2)} Contagion Value
          </div>
          <div className="h-1.5 rounded-full bg-ink-900 mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${isUnlocked ? 'bg-hazard-amber' : 'bg-toxic-400'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-[9px] font-mono text-toxic-100/30 mt-1">
            {formatPP(lockedPP)} / 50,000 Puke Points
            {!isUnlocked && <span className="ml-1">• Watch ads to unlock</span>}
          </div>
        </div>

        {/* RIGHT — UNLOCKED CONTAGION VAULT */}
        <div className="rounded-lg p-3 border border-radioactive-600/30 bg-radioactive-500/5">
          <span className="text-[10px] font-display uppercase tracking-wider text-radioactive-400">UNLOCKED CONTAGION VAULT</span>
          <div className="font-mono text-xl font-bold text-radioactive-400 neon-text-yellow mt-1">{formatPP(withdrawablePP)}</div>
          <div className="text-[10px] text-radioactive-300/40 font-mono mt-0.5">
            ${ppToUsd(withdrawablePP).toFixed(2)} Contagion Value
          </div>
        </div>
      </div>

      {/* Radiation Exposure — only show if NOT compact */}
      {!compact && xp !== undefined && (
        <div className="stat-chip text-center">
          <div className="text-[9px] text-toxic-100/40 uppercase">Radiation Exposure</div>
          <div className="text-toxic-300 font-display text-xs">
            {xp.toLocaleString()}{nextXp !== null ? ` / ${nextXp.toLocaleString()}` : ''}
          </div>
        </div>
      )}
    </div>
  );
}

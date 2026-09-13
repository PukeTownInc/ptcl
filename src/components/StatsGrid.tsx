import { getTier, ppToUsd, formatPP } from '../constants';
import type { GameState } from '../types';
export function StatsGrid({ state }: { state: GameState }) {
  const tier = getTier(state.xp);
  const stats = [
    { label: 'Total Spins', value: state.totalSpins.toLocaleString(), color: 'text-toxic-300' },
    { label: 'Total XP', value: state.xp.toLocaleString(), color: 'text-toxic-300' },
    { label: 'Referrals', value: state.referrals.toString(), color: 'text-toxic-300' },
    { label: 'Login Streak', value: `${state.loginStreak}🔥`, color: 'text-hazard-amber' },
    { label: 'Total Earned', value: `${formatPP(state.totalEarnedPP)} PP`, color: 'text-toxic-400' },
    { label: 'Lifetime USD', value: `$${ppToUsd(state.totalEarnedPP).toFixed(2)}`, color: 'text-radioactive-400' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="grunge-panel p-2.5 text-center">
          <div className={`font-mono font-bold text-sm ${s.color}`}>{s.value}</div>
          <div className="text-[9px] text-toxic-100/40 uppercase tracking-wide mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

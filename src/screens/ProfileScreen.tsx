import { useState, useEffect } from 'react';
import { Users, Share2, Copy, Check } from 'lucide-react';
import type { GameState } from '../types';
import { getTier, TIERS } from '../constants';
import type { GameActions } from '../useGameState';
import { useToast } from '../components/Toast';
import { Logo } from '../components/Logo';
import { StatsGrid } from '../components/StatsGrid';
interface Props {
  state: GameState;
  actions: GameActions;
}
export function ProfileScreen({ state, actions }: Props) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [referralCode] = useState(() => {
    try {
      const stored = localStorage.getItem('puketown_refcode');
      if (stored) return stored;
      const code = 'PUKE-' + Math.random().toString(36).slice(2, 8).toUpperCase();
      localStorage.setItem('puketown_refcode', code);
      return code;
    } catch {
      return 'PUKE-XXXXXX';
    }
  });
  const tier = getTier(state.xp);
  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : 'https://puketown.app'}/?ref=${referralCode}`;
  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast('success', 'Link Copied', 'Share with friends for rewards');
    } catch {
      toast('error', 'Copy Failed', 'Copy this link manually');
    }
  };
  const handleSimulateReferral = () => {
    actions.recordReferral();
    actions.addXP(100, true);
    toast('success', 'Referral Bonus!', '+30 spins + 100 XP (when friend watches 1st ad)');
  };
  return (
    <div className="space-y-4">
      {/* Account / tier card */}
      <div className="grunge-panel p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full overflow-hidden animate-glow-pulse">
            <Logo size={48} rounded={false} className="rounded-full" />
          </div>
          <div className="flex-1">
            <h2 className="font-display font-bold text-sm text-toxic-300">Player Account</h2>
            <p className="text-[11px] text-toxic-100/50 font-mono">{tier.badge} {tier.label} • {state.xp.toLocaleString()} XP</p>
          </div>
        </div>
        {/* Lifetime stats */}
        <div className="mt-3">
          <h4 className="font-display font-bold text-xs text-toxic-300 mb-2 px-1">Lifetime Stats</h4>
          <StatsGrid state={state} />
        </div>
      </div>
      {/* Referral section */}
      <div id="referral-box" className="grunge-panel p-4 scroll-mt-20">
        <div className="flex items-center gap-2 mb-3">
          <Users size={18} className="text-toxic-400" />
          <h3 className="font-display font-bold text-sm text-toxic-300">Refer Friends</h3>
        </div>
        <p className="text-[11px] text-toxic-100/50 mb-3">
          Both get +30 FREE SPINS + +100 XP when your friend watches their first ad
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={referralLink}
            className="flex-1 bg-ink-900 border border-toxic-900/50 rounded-lg px-3 py-2 font-mono text-[11px] text-toxic-200 truncate"
          />
          <button onClick={handleCopyLink} className="toxic-btn px-3 py-2 text-xs flex items-center gap-1">
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
          <span className="text-toxic-100/40">Referrals: <span className="text-toxic-300 font-bold">{state.referrals}</span></span>
          <button onClick={handleSimulateReferral} className="ghost-btn px-3 py-1.5 text-[10px]">
            <Share2 size={12} className="inline mr-1" /> Simulate Referral
          </button>
        </div>
      </div>
      {/* Tier table */}
      <div className="grunge-panel p-4">
        <h3 className="font-display font-bold text-sm text-toxic-300 mb-3">XP Tier System</h3>
        <div className="space-y-2">
          {TIERS.map((t) => {
            const isCurrent = tier.id === t.id;
            return (
              <div
                key={t.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                  isCurrent ? 'bg-toxic-500/10 border-toxic-400/40' : 'bg-ink-700/40 border-toxic-900/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{t.badge}</span>
                  <div>
                    <div className={`font-display font-bold text-xs ${isCurrent ? 'text-toxic-400' : 'text-toxic-200'}`}>{t.label}</div>
                    <div className="text-[9px] text-toxic-100/40 font-mono">{t.minXp.toLocaleString()}{t.maxXp !== Infinity ? `–${t.maxXp.toLocaleString()}` : '+'} XP</div>
                  </div>
                </div>
                <div className="text-right text-[10px] font-mono text-toxic-100/50">
                  <div>{(t.potCap / 1000).toFixed(0)}k pot</div>
                  <div className="text-radioactive-400">x{t.multiplier}</div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-toxic-100/40 mt-3 font-mono">
          XP = progress only • never converts to cash • all limits reset midnight UTC
        </p>
      </div>
    </div>
  );
}

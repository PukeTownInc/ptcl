import { useState } from 'react';
import { Wallet, AlertTriangle, CheckCircle2, Clock, ArrowRight, Lock, History, LogIn } from 'lucide-react';
import type { GameState, WithdrawalRecord } from '../types';
import {
  CRYPTO_OPTIONS,
  MIN_WITHDRAW_PP,
  MAX_WITHDRAW_PP,
  PLATFORM_FEE,
  WITHDRAW_COOLDOWN_MS,
  ppToUsd,
  formatPP,
} from '../constants';
import type { GameActions } from '../useGameState';
import { useToast } from '../components/Toast';

interface Props {
  state: GameState;
  actions: GameActions;
  isLoggedIn: boolean;
}

export function WithdrawScreen({ state, actions, isLoggedIn }: Props) {
  const toast = useToast();
  const [email, setEmail] = useState(state.faucetpayEmail);
  const [crypto, setCrypto] = useState(CRYPTO_OPTIONS[0].id);
  const [amountStr, setAmountStr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const cooldownActive = state.lastWithdraw && Date.now() - state.lastWithdraw < WITHDRAW_COOLDOWN_MS;
  const cooldownMs = cooldownActive ? (WITHDRAW_COOLDOWN_MS - (Date.now() - (state.lastWithdraw as number))) : 0;
  const cooldownHrs = Math.ceil(cooldownMs / 3600000);

  const amount = parseFloat(amountStr) || 0;
  const fee = amount * PLATFORM_FEE;
  const payoutPP = amount - fee;
  const payoutUsd = ppToUsd(payoutPP);

  const canWithdraw =
    isLoggedIn &&
    email.trim().length > 0 &&
    amount >= MIN_WITHDRAW_PP &&
    amount <= MAX_WITHDRAW_PP &&
    amount <= state.withdrawablePP &&
    !cooldownActive &&
    !submitting;

  const handleWithdraw = () => {
    if (!isLoggedIn) {
      toast('error', 'QUARANTINED', 'Absorb radiation to access your Goop supply');
      return;
    }
    if (!canWithdraw) {
      if (amount < MIN_WITHDRAW_PP) toast('error', 'DOSE TOO LOW', `Minimum release: ${formatPP(MIN_WITHDRAW_PP)} Goops`);
      else if (amount > MAX_WITHDRAW_PP) toast('error', 'DOSE TOO HIGH', `Maximum release: ${formatPP(MAX_WITHDRAW_PP)} Goops`);
      else if (amount > state.withdrawablePP) toast('error', 'INSUFFICIENT GOOP', 'Not enough decontaminated supply available');
      else if (cooldownActive) toast('error', 'RADIATION COOLDOWN', `Wait ${cooldownHrs}h before next release`);
      else if (!email.trim()) toast('error', 'EMAIL REQUIRED', 'Enter your FaucetPay email');
      return;
    }
    setSubmitting(true);
    actions.setFaucetpayEmail(email.trim());
    setTimeout(() => {
      const rec: WithdrawalRecord = {
        id: Math.random().toString(36).slice(2),
        date: Date.now(),
        username: email.trim(),
        crypto,
        amountPP: amount,
        feePP: fee,
        usd: payoutUsd,
        status: Math.random() > 0.1 ? 'sent' : 'pending',
      };
      actions.recordWithdrawal(rec);
      setSubmitting(false);
      setAmountStr('');
      toast('success', '☢️ SUPPLY RELEASED!', `$${payoutUsd.toFixed(2)} USD sent to ${email}`);
    }, 1800);
  };

  return (
    <div className="space-y-4">
      {/* Login Required Banner */}
      {!isLoggedIn && (
        <div className="grunge-panel p-3 border-l-4 border-l-hazard-amber/50 flex items-start gap-2">
          <LogIn size={16} className="text-hazard-amber shrink-0 mt-0.5" />
          <div className="text-[11px] text-toxic-100/60">
            <p className="text-hazard-amber font-bold">☢️ EXPOSURE REQUIRED</p>
            <p className="mt-0.5 text-toxic-100/40">Absorb radiation with your email to unlock and release your Goop supply.</p>
          </div>
        </div>
      )}

      {/* Balance Summary */}
      <div className="grunge-panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={20} className="text-radioactive-400" />
          <h2 className="font-display font-bold text-sm text-radioactive-400">☢️ DECONTAMINATION CHAMBER</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-radioactive-500/10 border border-radioactive-600/30 p-3">
            <div className="text-[10px] text-radioactive-400/60 uppercase">RELEASE SUPPLY</div>
            <div className="font-mono text-xl font-bold text-radioactive-400 neon-text-yellow">{formatPP(state.withdrawablePP)}</div>
            <div className="text-[10px] text-radioactive-300/40 font-mono">${ppToUsd(state.withdrawablePP).toFixed(2)} USD</div>
          </div>
          <div className="rounded-lg bg-ink-700/50 border border-toxic-900/40 p-3">
            <div className="text-[10px] text-toxic-100/40 uppercase">QUARANTINED RESERVE</div>
            <div className="font-mono text-xl font-bold text-toxic-300">{formatPP(state.lockedPotPP)}</div>
            <div className="text-[10px] text-toxic-100/30 font-mono">Absorb radiation to decontaminate</div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="grunge-panel p-3 border-l-4 border-l-radioactive-500/50 flex items-start gap-2">
        <AlertTriangle size={16} className="text-radioactive-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-toxic-100/60">
          <p>Minimum release: <span className="text-radioactive-400 font-bold">{formatPP(MIN_WITHDRAW_PP)} Goops</span> • Maximum: <span className="text-radioactive-400 font-bold">{formatPP(MAX_WITHDRAW_PP)} Goops</span></p>
          <p className="mt-1">Radiation processing fee: <span className="text-hazard-amber">{(PLATFORM_FEE * 100).toFixed(0)}%</span> • Contamination cooldown: 24h between releases</p>
          <p className="mt-1 text-toxic-100/40">Contamination rate: 10,000 Goops = $0.25 USD</p>
        </div>
      </div>

      {/* Withdrawal Form — EMAIL BOX UNCHANGED */}
      <div className="grunge-panel p-4 space-y-3">
        <div>
          <label className="text-[11px] font-display uppercase tracking-wider text-toxic-300 mb-1.5 block">FaucetPay Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your_Faucetpay_Email"
            className="w-full bg-ink-900 border border-toxic-900/50 rounded-lg px-3 py-2.5 font-mono text-sm text-toxic-200 focus:border-toxic-400 focus:outline-none focus:neon-border transition-all"
          />
        </div>

        <div>
          <label className="text-[11px] font-display uppercase tracking-wider text-toxic-300 mb-1.5 block">Radiation Currency</label>
          <div className="grid grid-cols-3 gap-1.5">
            {CRYPTO_OPTIONS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCrypto(c.id)}
                className={`px-2 py-2 rounded-lg text-xs font-display font-bold transition-all ${
                  crypto === c.id
                    ? 'bg-toxic-500/20 border border-toxic-400 text-toxic-300 neon-border'
                    : 'bg-ink-700/50 border border-toxic-900/30 text-toxic-100/50'
                }`}
              >
                {c.id}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-display uppercase tracking-wider text-toxic-300 mb-1.5 block">Dosage (Goops)</label>
          <input
            type="number"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder={`Min ${formatPP(MIN_WITHDRAW_PP)}`}
            className="w-full bg-ink-900 border border-toxic-900/50 rounded-lg px-3 py-2.5 font-mono text-sm text-toxic-200 focus:border-toxic-400 focus:outline-none focus:neon-border transition-all"
          />
          <div className="flex gap-1.5 mt-1.5">
            <button onClick={() => setAmountStr(String(Math.min(MAX_WITHDRAW_PP, Math.max(MIN_WITHDRAW_PP, state.withdrawablePP))))} className="text-[10px] px-2 py-1 rounded bg-ink-700 text-toxic-100/60 hover:text-toxic-300">MAX DOSE</button>
            <button onClick={() => setAmountStr(String(MIN_WITHDRAW_PP))} className="text-[10px] px-2 py-1 rounded bg-ink-700 text-toxic-100/60 hover:text-toxic-300">MIN DOSE</button>
          </div>
        </div>

        {/* Fee Breakdown */}
        {amount > 0 && (
          <div className="rounded-lg bg-ink-700/50 p-3 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-toxic-100/60">
              <span>Contamination Dose</span><span className="text-toxic-300">{formatPP(amount)} Goops</span>
            </div>
            <div className="flex justify-between text-toxic-100/60">
              <span>Radiation Processing (10%)</span><span className="text-hazard-amber">-{formatPP(fee)} Goops</span>
            </div>
            <div className="flex justify-between text-toxic-100/60 border-t border-toxic-900/40 pt-1.5">
              <span className="text-radioactive-400">☢️ You Receive</span><span className="text-radioactive-400 font-bold">${payoutUsd.toFixed(2)} USD</span>
            </div>
          </div>
        )}

        {/* Cooldown Notice */}
        {cooldownActive && (
          <div className="rounded-lg bg-hazard-amber/10 border border-hazard-amber/30 p-2.5 flex items-center gap-2">
            <Clock size={14} className="text-hazard-amber shrink-0" />
            <span className="text-[11px] text-hazard-amber font-mono">☢️ Radiation dissipating — {cooldownHrs}h until next release</span>
          </div>
        )}

        <button
          onClick={handleWithdraw}
          disabled={!canWithdraw}
          className="yellow-btn w-full py-3.5 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <><span className="animate-spin inline-block w-4 h-4 border-2 border-ink-900 border-t-transparent rounded-full" /> Releasing...</>
          ) : (
            <><Wallet size={18} /> ☢️ RELEASE GOOP SUPPLY <ArrowRight size={16} /></>
          )}
        </button>
      </div>

      {/* Release History */}
      {state.withdrawalHistory.length > 0 && (
        <div className="grunge-panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <History size={16} className="text-toxic-300" />
            <h3 className="font-display font-bold text-sm text-toxic-300">☢️ CONTAMINATION LOG</h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
            {state.withdrawalHistory.map((w) => (
              <div key={w.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-ink-700/50">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-toxic-200">${w.usd.toFixed(2)} USD → {w.username}</div>
                  <div className="text-[10px] text-toxic-100/40 font-mono">
                    {new Date(w.date).toLocaleDateString()} {new Date(w.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {w.crypto}
                  </div>
                </div>
                <StatusBadge status={w.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Note */}
      <div className="grunge-panel p-3 flex items-start gap-2">
        <Lock size={14} className="text-toxic-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-toxic-100/40">
          All supplies released via FaucetPay secure channel. Exposure levels do not affect your Goop — contamination is pure progression.
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: WithdrawalRecord['status'] }) {
  const styles: Record<string, string> = {
    sent: 'text-toxic-400 bg-toxic-500/10 border-toxic-600/40',
    pending: 'text-radioactive-400 bg-radioactive-500/10 border-radioactive-600/40',
    failed: 'text-hazard-red bg-hazard-red/10 border-hazard-red/40',
    refunded: 'text-toxic-100/40 bg-ink-700 border-toxic-900/40',
  };
  const labels: Record<string, string> = {
    sent: '☢️ RELEASED',
    pending: '⏳ CONTAMINATING',
    failed: '☠️ DISSIPATED',
    refunded: '↩️ QUARANTINED',
  };
  return (
    <span className={`text-[10px] font-display font-bold uppercase px-2 py-0.5 rounded border ${styles[status]} flex items-center gap-1`}>
      {status === 'sent' && <CheckCircle2 size={10} />}
      {status === 'pending' && <Clock size={10} />}
      {labels[status] || status}
    </span>
  );
}

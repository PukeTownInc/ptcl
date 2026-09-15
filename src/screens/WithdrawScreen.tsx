import { useState } from 'react';
import { Wallet, AlertTriangle, CheckCircle2, Clock, ArrowRight, Lock, History, LogIn, Tv } from 'lucide-react';
import type { GameState, WithdrawalRecord } from '../types';
import {
  CRYPTO_OPTIONS,
  MIN_WITHDRAW_PP,
  MAX_WITHDRAW_PP,
  PLATFORM_FEE,
  WITHDRAW_COOLDOWN_MS,
  MIN_UNLOCK_PP,
  ppToUsd,
  formatPP,
} from '../constants';
import type { GameActions } from '../useGameState';
import { useToast } from '../components/Toast';
import { AdModal } from '../components/AdModal';
const VAULT_CAP = 50000;
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
  const [adModal, setAdModal] = useState<null | { title: string; subtitle?: string; reward: string; onComplete: () => void }>(null);
  const cooldownActive = state.lastWithdraw && Date.now() - state.lastWithdraw < WITHDRAW_COOLDOWN_MS;
  const cooldownMs = cooldownActive ? (WITHDRAW_COOLDOWN_MS - (Date.now() - (state.lastWithdraw as number))) : 0;
  const cooldownHrs = Math.ceil(cooldownMs / 3600000);
  const amount = parseInt(amountStr, 10) || 0;
  const fee = Math.floor(amount * PLATFORM_FEE);
  const totalDeducted = amount + fee;
  const payoutPP = amount - fee;
  const payoutUsd = ppToUsd(payoutPP);
  const canPrepareWithdraw =
    isLoggedIn &&
    email.trim().length > 0 &&
    amount >= MIN_WITHDRAW_PP &&
    amount <= MAX_WITHDRAW_PP &&
    totalDeducted <= state.withdrawablePP &&
    !cooldownActive &&
    !submitting;
  const vaultFull = state.lockedPotPP >= VAULT_CAP;
  const vaultPercent = Math.min(100, (state.lockedPotPP / VAULT_CAP) * 100);
  const remainingToFull = VAULT_CAP - state.lockedPotPP;
  const handleUnlockVault = () => {
    if (!vaultFull) {
      toast('info', 'Still Contaminating', `Need ${formatPP(remainingToFull)} more PP to fill the vault`);
      return;
    }
    setAdModal({
      title: '☢️ RELEASE THE CONTAGION',
      subtitle: 'Watch video — absorb radiation to unlock the vault',
      reward: `Unlock ${formatPP(state.lockedPotPP)} Puke Points`,
      onComplete: () => {
        const amountToUnlock = state.lockedPotPP;
        actions.unlockPot();
        actions.watchAd();
        toast('success', '☢️ VAULT UNLEASHED!', `+${formatPP(amountToUnlock)} PP released to Contagion Cache!`);
      },
    });
  };
  const handlePrepareWithdraw = () => {
    if (!isLoggedIn) {
      toast('error', 'QUARANTINED', 'Sign in to release your Puke Points');
      return;
    }
    if (amount < MIN_WITHDRAW_PP) {
      toast('error', 'DOSE TOO LOW', `Minimum release: ${formatPP(MIN_WITHDRAW_PP)} Puke Points`);
      return;
    }
    if (amount > MAX_WITHDRAW_PP) {
      toast('error', 'DOSE TOO HIGH', `Maximum release: ${formatPP(MAX_WITHDRAW_PP)} Puke Points`);
      return;
    }
    if (totalDeducted > state.withdrawablePP) {
      toast('error', 'INSUFFICIENT BALANCE', `Need ${formatPP(totalDeducted)} total (incl. fee). Only ${formatPP(state.withdrawablePP)} PP available`);
      return;
    }
    if (cooldownActive) {
      toast('error', 'RADIATION COOLDOWN', `Wait ${cooldownHrs}h before next release`);
      return;
    }
    if (!email.trim()) {
      toast('error', 'EMAIL REQUIRED', 'Enter your FaucetPay email');
      return;
    }
    setAdModal({
      title: '☢️ ACTIVATE RELEASE PERMIT',
      subtitle: 'Watch one quick video to authorise your withdrawal',
      reward: `Release ${formatPP(amount)} PP + ${formatPP(fee)} PP fee = ${formatPP(totalDeducted)} PP total`,
      onComplete: () => {
        executeWithdrawal(amount, fee, payoutUsd);
      },
    });
  };
  const executeWithdrawal = (amountVal: number, feeVal: number, usdVal: number) => {
    setSubmitting(true);
    actions.setFaucetpayEmail(email.trim());
    actions.watchAd();
    setTimeout(() => {
      const rec: WithdrawalRecord = {
        id: Math.random().toString(36).slice(2),
        date: Date.now(),
        username: email.trim(),
        crypto,
        amountPP: amountVal,
        feePP: feeVal,
        usd: usdVal,
        status: Math.random() > 0.1 ? 'sent' : 'pending',
      };
      actions.recordWithdrawal(rec);
      setSubmitting(false);
      setAmountStr('');
      toast('success', '☢️ SUPPLY RELEASED!', `-${formatPP(amountVal + feeVal)} PP total (incl. fee) • $${usdVal.toFixed(2)} USD sent to ${email}`);
    }, 1800);
  };
  const showInsufficientToast = () => {
    toast('info', 'NOT ENOUGH PP', `Need ${formatPP(MIN_WITHDRAW_PP)} PP to release + fee — keep earning!`);
  };
  const handleMax = () => {
    if (state.withdrawablePP >= MIN_WITHDRAW_PP) {
      const maxAfterFee = Math.floor(state.withdrawablePP / (1 + PLATFORM_FEE));
      setAmountStr(String(Math.min(MAX_WITHDRAW_PP, maxAfterFee)));
    } else {
      showInsufficientToast();
    }
  };
  const handleMin = () => {
    const minTotal = MIN_WITHDRAW_PP + Math.floor(MIN_WITHDRAW_PP * PLATFORM_FEE);
    if (state.withdrawablePP >= minTotal) {
      setAmountStr(String(MIN_WITHDRAW_PP));
    } else {
      showInsufficientToast();
    }
  };
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d+$/.test(val)) {
      setAmountStr(val);
    }
  };
  return (
    <div className="space-y-4">
      {!isLoggedIn && (
        <div className="grunge-panel p-3 border-l-4 border-l-hazard-amber/50 flex items-start gap-2">
          <LogIn size={16} className="text-hazard-amber shrink-0 mt-0.5" />
          <div className="text-[11px] text-toxic-100/60">
            <p className="text-hazard-amber font-bold">☢️ EXPOSURE REQUIRED</p>
            <p className="mt-0.5 text-toxic-100/40">Sign in with email to unlock and release your Puke Points.</p>
          </div>
        </div>
      )}
      <div className="grunge-panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={20} className="text-radioactive-400" />
          <h2 className="font-display font-bold text-sm text-radioactive-400">☢️ DECONTAMINATION CHAMBER</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div
            className={`rounded-lg border p-3 transition-all ${
              vaultFull
                ? 'bg-toxic-500/15 border-toxic-500/50 cursor-pointer hover:bg-toxic-500/25'
                : 'bg-ink-800/70 border-ink-600/40 opacity-60'
            }`}
            onClick={vaultFull ? handleUnlockVault : undefined}
          >
            <div className="text-[10px] uppercase mb-0.5" style={{ color: vaultFull ? '#9aff9a' : '#6b7280' }}>
              CONTAGION VAULT
            </div>
            {!vaultFull && (
              <div className="text-[9px] font-bold uppercase tracking-widest text-ink-400 mb-1.5">
                FILL TO UNLOCK
              </div>
            )}
            <div className={`font-mono text-xl font-bold ${vaultFull ? 'text-toxic-300' : 'text-ink-500'}`}>
              {formatPP(state.lockedPotPP)}
            </div>
            <div className="mt-2 h-2 rounded-full bg-ink-700 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${vaultFull ? 'bg-toxic-400' : 'bg-ink-500'}`}
                style={{ width: `${vaultPercent}%` }}
              />
            </div>
            {vaultFull ? (
              <button className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-toxic-500/20 border border-toxic-500/40 text-toxic-300 text-[10px] font-bold">
                <Tv size={12} /> WATCH VIDEO TO UNLOCK
              </button>
            ) : (
              <div className="mt-2 text-[9px] font-mono text-ink-500">
                {formatPP(remainingToFull)} PP to full
              </div>
            )}
          </div>
          <div className="rounded-lg bg-radioactive-500/10 border border-radioactive-600/30 p-3">
            <div className="text-[10px] text-radioactive-400/60 uppercase mb-1.5">CONTAGION CACHE</div>
            <div className="font-mono text-xl font-bold text-radioactive-400 neon-text-yellow">{formatPP(state.withdrawablePP)}</div>
            <div className="text-[10px] text-radioactive-300/40 font-mono mt-1">${ppToUsd(state.withdrawablePP).toFixed(2)} USD</div>
          </div>
        </div>
      </div>
      <div className="grunge-panel p-3 border-l-4 border-l-radioactive-500/50 flex items-start gap-2">
        <AlertTriangle size={16} className="text-radioactive-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-toxic-100/60">
          <p>Minimum release: <span className="text-radioactive-400 font-bold">{formatPP(MIN_WITHDRAW_PP)} Puke Points</span> • Maximum: <span className="text-radioactive-400 font-bold">{formatPP(MAX_WITHDRAW_PP)} Puke Points</span></p>
          <p className="mt-1">Platform fee: <span className="text-hazard-amber">{(PLATFORM_FEE * 100).toFixed(0)}%</span> • Cooldown: 24h between withdrawals</p>
          <p className="mt-1 text-toxic-100/40">⚠️ Total deducted = Your amount + {(PLATFORM_FEE * 100).toFixed(0)}% fee • Ad required to release</p>
        </div>
      </div>
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
          <label className="text-[11px] font-display uppercase tracking-wider text-toxic-300 mb-1.5 block">Crypto Currency</label>
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
          <label className="text-[11px] font-display uppercase tracking-wider text-toxic-300 mb-1.5 block">Amount (Puke Points)</label>
          <input
            type="text"
            value={amountStr}
            onChange={handleAmountChange}
            placeholder={`Min ${formatPP(MIN_WITHDRAW_PP)}`}
            inputMode="numeric"
            className="w-full bg-ink-900 border border-toxic-900/50 rounded-lg px-3 py-2.5 font-mono text-sm text-toxic-200 focus:border-toxic-400 focus:outline-none focus:neon-border transition-all"
          />
          <div className="flex gap-1.5 mt-1.5">
            <button
              onClick={handleMax}
              className="text-[10px] px-2 py-1 rounded bg-ink-700 text-toxic-100/60 hover:text-toxic-300"
            >
              Max
            </button>
            <button
              onClick={handleMin}
              className="text-[10px] px-2 py-1 rounded bg-ink-700 text-toxic-100/60 hover:text-toxic-300"
            >
              Min
            </button>
          </div>
        </div>
        {amount > 0 && (
          <div className="rounded-lg bg-ink-700/50 p-3 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-toxic-100/60">
              <span>Release Amount</span><span className="text-toxic-300">{formatPP(amount)} Puke Points</span>
            </div>
            <div className="flex justify-between text-toxic-100/60">
              <span>Platform Fee (10%)</span><span className="text-hazard-amber">-{formatPP(fee)} Puke Points</span>
            </div>
            <div className="flex justify-between text-toxic-100/60 border-t border-toxic-900/40 pt-1.5">
              <span className="text-radioactive-400">TOTAL DEDUCTED</span><span className="text-radioactive-400 font-bold">-{formatPP(totalDeducted)} PP</span>
            </div>
            <div className="flex justify-between text-toxic-100/60">
              <span>You Receive</span><span className="text-toxic-300 font-bold">${payoutUsd.toFixed(2)} USD</span>
            </div>
          </div>
        )}
        {cooldownActive && (
          <div className="rounded-lg bg-hazard-amber/10 border border-hazard-amber/30 p-2.5 flex items-center gap-2">
            <Clock size={14} className="text-hazard-amber shrink-0" />
            <span className="text-[11px] text-hazard-amber font-mono">Cooldown active — {cooldownHrs}h remaining</span>
          </div>
        )}
        <button
          onClick={handlePrepareWithdraw}
          disabled={!canPrepareWithdraw || submitting}
          className="yellow-btn w-full py-3.5 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <><span className="animate-spin inline-block w-4 h-4 border-2 border-ink-900 border-t-transparent rounded-full" /> Processing Release...</>
          ) : (
            <><Tv size={18} /> Watch Ad & Release <ArrowRight size={16} /></>
          )}
        </button>
      </div>

      {/* ✅ WITHDRAWAL HISTORY — ALWAYS VISIBLE */}
      <div className="grunge-panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <History size={16} className="text-toxic-300" />
          <h3 className="font-display font-bold text-sm text-toxic-300">☢️ RELEASE HISTORY</h3>
        </div>
        {state.withdrawalHistory.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
            {state.withdrawalHistory.map((w) => (
              <div key={w.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-ink-700/50">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-toxic-200">${w.usd.toFixed(2)} USD → {w.username}</div>
                  <div className="text-[10px] text-toxic-100/40 font-mono">
                    {new Date(w.date).toLocaleDateString()} {new Date(w.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {w.crypto} • Fee: {formatPP(w.feePP)} PP
                  </div>
                </div>
                <StatusBadge status={w.status} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-toxic-100/40 text-xs font-mono">
            📭 No releases yet. <br />
            Release Puke Points above and they'll appear here.
          </div>
        )}
      </div>

      <div className="grunge-panel p-3 flex items-start gap-2">
        <Lock size={14} className="text-toxic-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-toxic-100/40">
          Total deducted from your balance = release amount + platform fee. Payout sent via FaucetPay.
        </p>
      </div>
      {adModal && (
        <AdModal
          open={!!adModal}
          onClose={() => {
            setAdModal(null);
          }}
          onComplete={() => {
            adModal.onComplete();
            setAdModal(null);
          }}
          title={adModal.title}
          subtitle={adModal.subtitle}
          reward={adModal.reward}
        />
      )}
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
  return (
    <span className={`text-[10px] font-display font-bold uppercase px-2 py-0.5 rounded border ${styles[status]} flex items-center gap-1`}>
      {status === 'sent' && <CheckCircle2 size={10} />}
      {status === 'pending' && <Clock size={10} />}
      {status}
    </span>
  );
}

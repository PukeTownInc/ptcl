import { useState } from 'react';
import { Trash2, Info, FileText, Shield } from 'lucide-react';
import type { GameState } from '../types';
import type { GameActions } from '../useGameState';
import { useToast } from '../components/Toast';

interface Props {
  state: GameState;
  actions: GameActions;
}

export function SettingsScreen({ state, actions }: Props) {
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  if (showTerms) {
    return (
      <div className="space-y-4">
        <div className="grunge-panel p-4">
          <button onClick={() => setShowTerms(false)} className="text-[11px] text-toxic-300 hover:text-toxic-100 mb-3 font-mono">&larr; Back to Settings</button>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-toxic-400" />
            <h2 className="font-display font-bold text-sm text-toxic-300">Terms of Service</h2>
          </div>
          <div className="text-[11px] text-toxic-100/60 space-y-3 font-mono leading-relaxed">
            <p><span className="text-toxic-400 font-bold">1. Eligibility.</span> Puke Town Cash Lab is a free-to-play rewards game. You must be 18+ to withdraw earnings.</p>
            <p><span className="text-toxic-400 font-bold">2. Currency.</span> All in-game currency is Puke Points (PP). Conversion: 10,000 PP = $0.25 USD. Platform fee: 10% per withdrawal.</p>
            <p><span className="text-toxic-400 font-bold">3. Withdrawals.</span> Min 50,000 PP, max 500,000 PP per withdrawal. 24h cooldown between withdrawals. Payouts via FaucetPay only.</p>
            <p><span className="text-toxic-400 font-bold">4. Monthly Reset.</span> Leaderboards and monthly stats reset on the 1st of each month at 00:00 UTC.</p>
            <p><span className="text-toxic-400 font-bold">5. Fair Play.</span> Botting, multi-accounting, or exploiting bugs results in permanent ban and forfeiture of all earnings.</p>
            <p><span className="text-toxic-400 font-bold">6. Ads.</span> Rewarded video ads power the economy. Ad availability depends on your region and tier.</p>
            <p><span className="text-toxic-400 font-bold">7. Changes.</span> We may update rewards, fees, and rules at any time. Continued use means acceptance.</p>
          </div>
        </div>
      </div>
    );
  }

  if (showPrivacy) {
    return (
      <div className="space-y-4">
        <div className="grunge-panel p-4">
          <button onClick={() => setShowPrivacy(false)} className="text-[11px] text-toxic-300 hover:text-toxic-100 mb-3 font-mono">&larr; Back to Settings</button>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={18} className="text-toxic-400" />
            <h2 className="font-display font-bold text-sm text-toxic-300">Privacy Policy</h2>
          </div>
          <div className="text-[11px] text-toxic-100/60 space-y-3 font-mono leading-relaxed">
            <p><span className="text-toxic-400 font-bold">1. Data Stored.</span> We store your email, game progress (XP, Puke Points, spins), and withdrawal history. All data is linked to your account.</p>
            <p><span className="text-toxic-400 font-bold">2. Cloud Sync.</span> Your game state auto-syncs to our secure database on every change. Local backup is also kept on your device.</p>
            <p><span className="text-toxic-400 font-bold">3. FaucetPay.</span> Your FaucetPay email is used solely for processing withdrawals. We never share it with third parties.</p>
            <p><span className="text-toxic-400 font-bold">4. Ads.</span> Third-party ad networks may collect anonymous usage data per their own privacy policies.</p>
            <p><span className="text-toxic-400 font-bold">5. Cookies.</span> We use local storage to persist your session and game state. No tracking cookies.</p>
            <p><span className="text-toxic-400 font-bold">6. Deletion.</span> You can reset all progress in Settings. Account deletion removes all data permanently.</p>
            <p><span className="text-toxic-400 font-bold">7. Children.</span> This service is not directed at children under 13. No knowingly collected data from minors.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* About */}
      <div className="grunge-panel p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info size={16} className="text-toxic-400" />
          <h3 className="font-display font-bold text-sm text-toxic-300">About</h3>
        </div>
        <div className="text-[11px] text-toxic-100/50 space-y-1.5 font-mono">
          <p className="text-toxic-400 font-bold">☢️ Puke Town Cash Lab ☢️</p>
          <p>⏱️ Spend Minutes 💰 Earn Money</p>
          <p>💰 Currency: 10,000 Puke Points = $0.25 USD</p>
          <p className="text-toxic-100/40">🎰 Free Play • 💧 FaucetPay Native • 📱 PWA Ready</p>
        </div>
      </div>

      {/* Terms & Privacy */}
      <div className="grunge-panel divide-y divide-toxic-900/30">
        <button onClick={() => setShowTerms(true)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-toxic-500/5 transition-colors">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-toxic-400" />
            <span className="text-sm text-toxic-200">Terms of Service</span>
          </div>
          <span className="text-toxic-100/30 text-xs">&rsaquo;</span>
        </button>
        <button onClick={() => setShowPrivacy(true)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-toxic-500/5 transition-colors">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-toxic-400" />
            <span className="text-sm text-toxic-200">Privacy Policy</span>
          </div>
          <span className="text-toxic-100/30 text-xs">&rsaquo;</span>
        </button>
      </div>

      {/* Danger zone */}
      <div className="grunge-panel p-4 border-hazard-red/30">
        <h3 className="font-display font-bold text-sm text-hazard-red mb-2">Danger Zone</h3>
        {!confirmReset ? (
          <button onClick={() => setConfirmReset(true)} className="ghost-btn w-full py-2.5 text-xs text-hazard-red border-hazard-red/30 hover:border-hazard-red/60">
            <Trash2 size={14} className="inline mr-1.5" /> Reset All Progress
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-hazard-red font-mono">This will erase ALL your XP, Puke Points, spins, and history. This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmReset(false)} className="ghost-btn flex-1 py-2 text-xs">Cancel</button>
              <button
                onClick={() => {
                  actions.resetAll();
                  setConfirmReset(false);
                  toast('success', 'Progress Reset', 'Fresh start — welcome back to Bronze');
                }}
                className="ghost-btn flex-1 py-2 text-xs text-hazard-red border-hazard-red/50"
              >
                <Trash2 size={12} className="inline mr-1" /> Confirm Reset
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-[10px] text-toxic-100/20 font-mono pt-2">
        Built with ☢️ in Puke Town
      </p>
    </div>
  );
}

import { useState } from 'react';
import { Trash2, Info, FileText, Shield } from 'lucide-react';
import type { GameState } from '../types';
import type { GameActions } from '../useGameState';
import { useToast } from '../components/Toast';
interface Props {
  state: GameState;
  actions: GameActions;
}
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-all ${on ? 'bg-toxic-500/30 border border-toxic-400' : 'bg-ink-700 border border-toxic-900/40'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${on ? 'left-6 bg-toxic-400' : 'left-0.5 bg-toxic-100/40'}`}
        style={on ? { boxShadow: '0 0 8px #39ff14' } : undefined}
      />
    </button>
  );
}
export function SettingsScreen({ state, actions }: Props) {
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [sound, setSound] = useState(true);
  const [haptic, setHaptic] = useState(true);
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
            <p><span className="text-toxic-400 font-bold">1. Eligibility.</span> Puke Town Cash Lab is a free-to-play rewards game. You must be aged 13 or older to use this app. If you are under 13, you may use this service only with the explicit consent of a parent or legal guardian.</p>
            <p><span className="text-toxic-400 font-bold">2. Currency.</span> All in-game currency is Puke Points (PP). Conversion: 10,000 PP = $0.25 USD. Platform fee: 10% per withdrawal.</p>
            <p><span className="text-toxic-400 font-bold">3. Withdrawals.</span> Min 50,000 PP, max 500,000 PP per withdrawal. 24h cooldown between withdrawals, resetting at midnight UTC. Payouts via FaucetPay only.</p>
            <p><span className="text-toxic-400 font-bold">4. Resets.</span> Daily limits, free spins, and daily rewards reset automatically at midnight UTC every day. Monthly tiers, XP streaks, and monthly caps reset on the 1st of each month at 00:00 UTC. These are intentional design features — not bugs.</p>
            <p><span className="text-toxic-400 font-bold">5. Fair Play.</span> Botting, multi-accounting, or exploiting bugs results in permanent ban and forfeiture of all earnings.</p>
            <p><span className="text-toxic-400 font-bold">6. Ads.</span> Rewarded video ads power the economy. The Puke Points you earn and the withdrawal system itself are made possible entirely by advertiser support. Ad availability and rewards depend on region and supply.</p>
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
            <p><span className="text-toxic-400 font-bold">1. What Data We Collect.</span> We only collect what is truly needed to run the app and save your progress: your email address, game progress (XP, Puke Points, spins, rewards, missions, withdrawal history), and your FaucetPay email address — only when you provide it for withdrawals. We do not collect unnecessary personal information.</p>
            <p><span className="text-toxic-400 font-bold">2. How We Use Your Data.</span> To save your progress across devices and logins, process withdrawals, detect abuse, and send critical service announcements only. We never send marketing emails.</p>
            <p><span className="text-toxic-400 font-bold">3. Data Storage & Security.</span> Your data is stored securely in our encrypted cloud database. We do not sell, rent, or share your personal information with anyone — ever.</p>
            <p><span className="text-toxic-400 font-bold">4. Advertising Data.</span> Ad partners may collect limited anonymous usage data. This does not include your name, email, or personal identifiers.</p>
            <p><span className="text-toxic-400 font-bold">5. Cookies & Local Storage.</span> We use only essential local storage to remember your session and game state. No tracking cookies.</p>
            <p><span className="text-toxic-400 font-bold">6. Your Rights & Deletion.</span> Reset progress in Settings, or delete your account permanently. You may request full data deletion at any time.</p>
            <p><span className="text-toxic-400 font-bold">7. Children.</span> You must be aged 13 or older to use this app. If you are under 13, you may use this service only with the explicit consent of a parent or legal guardian. We do not knowingly collect data from children under 13. If discovered without verified consent, it will be deleted immediately.</p>
            <p><span className="text-toxic-400 font-bold">8. Updates.</span> We may update this policy. Continued use means acceptance.</p>
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
          <p>⏱️ Play & Watch Ads → Earn Puke Points → Withdraw as Cash Value</p>
          <p>💰 Currency: 10,000 Puke Points = $0.25 USD</p>
          <p className="text-toxic-100/40">🎰 Free Play • 💧 FaucetPay Native • 📱 PWA Ready</p>
        </div>
      </div>
      {/* Preferences */}
      <div className="grunge-panel divide-y divide-toxic-900/30">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-toxic-200">Sound Effects</span>
          <Toggle on={sound} onChange={setSound} />
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-toxic-200">Haptic Feedback</span>
          <Toggle on={haptic} onChange={setHaptic} />
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
      {/* Danger Zone */}
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

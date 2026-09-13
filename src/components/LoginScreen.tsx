import { useState } from 'react';
import { Tv, LogOut, Zap, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '../lib/auth';
interface Props {
  onSkip: () => void;
}
export function LoginScreen({ onSkip }: Props) {
  const { signInWithEmailPassword, signUpWithEmailPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [status, setStatus] = useState<null | { type: 'success' | 'error'; msg: string }>(null);
  const [busy, setBusy] = useState(false);
  const handlePassword = async () => {
    if (!email.trim() || !password.trim()) return;
    setBusy(true);
    setStatus(null);
    const result = isSignUp
      ? await signUpWithEmailPassword(email.trim(), password)
      : await signInWithEmailPassword(email.trim(), password);
    setBusy(false);
    if (!result.success) {
      setStatus({ type: 'error', msg: result.error ?? 'Authentication failed' });
    }
  };
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink-900 px-6 animate-fade-in overflow-y-auto py-8">
      <div className="absolute inset-0 hazard-stripes opacity-[0.03]" />
      <div className="relative text-center mb-6 w-full flex flex-col items-center">
        <div className="flex justify-center">
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ 
              height: '180px', 
              width: 'auto',
              objectFit: 'contain',
              display: 'block'
            }} 
          />
        </div>
        <p className="text-[11px] text-toxic-100/40 mt-3 font-mono">Sign in to sync your progress across devices</p>
      </div>
      <div className="relative w-full max-w-xs space-y-3">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email..."
            className="w-full px-4 py-3 rounded-lg bg-ink-800 border border-toxic-900/60 text-toxic-100 text-sm placeholder:text-toxic-100/30 focus:border-toxic-400/50 focus:outline-none transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePassword()}
            placeholder="Password..."
            className="w-full px-4 py-3 rounded-lg bg-ink-800 border border-toxic-900/60 text-toxic-100 text-sm placeholder:text-toxic-100/30 focus:border-toxic-400/50 focus:outline-none transition-colors mt-2"
          />
          <button
            onClick={handlePassword}
            disabled={busy || !email.trim() || !password.trim()}
            className="yellow-btn w-full py-3 flex items-center justify-center gap-2 text-sm mt-2"
          >
            {isSignUp ? <><UserPlus size={16} /> Create Account</> : <><LogIn size={16} /> Sign In</>}
          </button>
          <button
            onClick={() => { setIsSignUp(!isSignUp); setStatus(null); }}
            className="w-full text-center text-[11px] text-toxic-100/40 hover:text-toxic-100/70 font-mono transition-colors mt-2"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
        {status && (
          <div
            className={`text-center text-[11px] font-mono p-2.5 rounded-lg ${
              status.type === 'success'
                ? 'bg-toxic-500/10 border border-toxic-600/30 text-toxic-400'
                : 'bg-red-500/10 border border-red-600/30 text-red-400'
            }`}
          >
            {status.msg}
          </div>
        )}
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-toxic-900/40" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-2 bg-ink-900 text-[10px] text-toxic-100/30 font-mono">OR</span>
          </div>
        </div>
        <button
          onClick={onSkip}
          className="w-full py-2.5 text-[11px] text-toxic-100/40 hover:text-toxic-100/70 font-mono transition-colors flex items-center justify-center gap-1.5"
        >
          <Zap size={12} /> Continue as Guest
        </button>
        <p className="text-center text-[9px] text-toxic-100/20 font-mono pt-2">
          Guest progress stays on this device only. Sign in to withdraw & sync.
        </p>
      </div>
    </div>
  );
}
export function UserStatusBadge() {
  const { user, signOut } = useAuth();
  if (!user) return null;
  const displayName = user.email ?? (user.is_anonymous ? 'Guest Account' : 'Signed in');
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-toxic-500/10 border border-toxic-600/30">
      <div className="w-2 h-2 rounded-full bg-toxic-400 animate-pulse" />
      <span className="text-[10px] font-mono text-toxic-300 truncate max-w-[120px]">{displayName}</span>
      <button
        onClick={() => signOut()}
        className="text-toxic-100/40 hover:text-red-400 transition-colors"
        title="Logout"
      >
        <LogOut size={12} />
      </button>
    </div>
  );
}

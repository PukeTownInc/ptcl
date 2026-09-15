import { useEffect, useState } from 'react';
import type { Screen } from './types';
import { useGameState } from './useGameState';
import { AuthProvider, useAuth } from './lib/auth';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { HomeScreen } from './screens/HomeScreen';
import { SlotScreen } from './screens/SlotScreen';
import { MissionsScreen } from './screens/MissionsScreen';
import { WithdrawScreen } from './screens/WithdrawScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LeaderboardsScreen } from './screens/LeaderboardsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { RoadmapScreen } from './screens/RoadmapScreen';
import { VialMixerScreen } from './components/VialMixerScreen';
import { LoginScreen, UserStatusBadge } from './components/LoginScreen';
import { Logo } from './components/Logo';
import { PwaInstallButton } from './components/PwaInstallButton';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const actions = useGameState(user?.id ?? null);
  const [screen, setScreen] = useState<Screen>('home');
  const [skipLogin, setSkipLogin] = useState(false);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    actions.loginCheck();
  }, [authLoading, user]);

  useEffect(() => {
    if (user) setSkipLogin(false);
  }, [user]);

  const navigate = (s: Screen, target?: string) => {
    setScreen(s);
    setScrollTarget(target ?? null);
    if (!target) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!scrollTarget) return;
    const el = document.getElementById(scrollTarget);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setScrollTarget(null);
  }, [scrollTarget, screen]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-ink-900 gap-4 animate-fade-in">
        <div className="animate-float flex justify-center">
          <Logo large />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-toxic-400/30 border-t-toxic-400 rounded-full animate-spin" />
          <p className="text-[11px] font-mono text-toxic-400/60 animate-pulse">Signing you in...</p>
        </div>
      </div>
    );
  }

  if (!user && !skipLogin) {
    return <LoginScreen onSkip={() => setSkipLogin(true)} />;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        {/* ✅ HEADER — NOW WITH BALANCES + XP */}
        <Header
          active={screen}
          onChange={navigate}
          lockedPP={actions.state.lockedPotPP}
          withdrawablePP={actions.state.withdrawablePP}
          xp={actions.state.xp}
          nextXp={null}
        >
          <UserStatusBadge />
        </Header>

        <main className="flex-1 mx-auto w-full max-w-md px-3 pt-4 pb-6">
          {screen === 'home' && <HomeScreen state={actions.state} actions={actions} onNavigate={navigate} />}
          {screen === 'slots' && <SlotScreen state={actions.state} actions={actions} />}
          {screen === 'missions' && <MissionsScreen state={actions.state} actions={actions} />}
          {screen === 'leaderboards' && <LeaderboardsScreen state={actions.state} actions={actions} />}
          {screen === 'withdraw' && <WithdrawScreen state={actions.state} actions={actions} isLoggedIn={!!user} />}
          {screen === 'roadmap' && <RoadmapScreen onNavigate={navigate} />}
          {screen === 'profile' && <ProfileScreen state={actions.state} actions={actions} />}
          {screen === 'settings' && <SettingsScreen state={actions.state} actions={actions} />}
          {screen === 'vialmixer' && (
            <VialMixerScreen
              onNavigate={navigate}
              balancePP={actions.state.withdrawablePP + actions.state.lockedPotPP}
              onEarnPP={actions.earnPP}
              onWatchAd={actions.watchAd}
            />
          )}
        </main>

        <PwaInstallButton />
      </div>
    </ToastProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

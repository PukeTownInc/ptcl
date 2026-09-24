import { useEffect, useState, useCallback } from 'react';
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
import { ContagionCacheScreen } from './screens/ContagionCacheScreen';
import { PlinkoScreen } from './screens/PlinkoScreen';
import { LoginScreen } from './components/LoginScreen';
import { DAILY_XP_FREE_CAP } from './constants';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const { state, cloudLoading, ...actions } = useGameState(userId);
  const [activeScreen, setActiveScreen] = useState<Screen>('home');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (!userId) return;
  }, [userId]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleNavigate = (screen: Screen) => {
    setActiveScreen(screen);
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home': return <HomeScreen state={state} actions={actions} onNavigate={handleNavigate} />;
      case 'slots': return <SlotScreen state={state} actions={actions} onNavigate={handleNavigate} />;
      case 'missions': return <MissionsScreen state={state} actions={actions} />;
      case 'withdraw': return <WithdrawScreen state={state} actions={actions} />;
      case 'settings': return <SettingsScreen state={state} actions={actions} />;
      case 'leaderboards': return <LeaderboardsScreen state={state} actions={actions} />;
      case 'profile': return <ProfileScreen state={state} actions={actions} />;
      case 'roadmap': return <RoadmapScreen onNavigate={handleNavigate} actions={actions} />;
      case 'contagion-cache':
        return <ContagionCacheScreen state={state} actions={actions} onBack={() => handleNavigate('home')} />;
      case 'plinko':
        return <PlinkoScreen />;
      default: return <HomeScreen state={state} actions={actions} onNavigate={handleNavigate} />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-green-400 text-lg">☢️ Loading Puke Town...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // Wait for cloud data before rendering ANYTHING — prevents 0.00 flash
  if (cloudLoading || !state) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-green-400 text-lg">☢️ Syncing contamination...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Header
        active={activeScreen}
        onChange={handleNavigate}
        lockedPP={state.lockedPotPP}
        withdrawablePP={state.withdrawablePP}
        xp={state.xp}
      />
      <main className="p-4 flex-1">
        <ErrorBoundary>{renderScreen()}</ErrorBoundary>
      </main>
      <div className="py-4 flex justify-center">
        <img
          src="/install-badge.png"
          alt="Install Puke Town Cash Lab"
          onClick={handleInstallClick}
          className={`h-auto ${deferredPrompt ? 'cursor-pointer' : 'cursor-default opacity-90'}`}
          style={{ 
            width: '100%',
            maxWidth: '320px'
          }}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

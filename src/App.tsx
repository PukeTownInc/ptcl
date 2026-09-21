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
import { DAILY_XP_FREE_CAP } from './constants';
function AppContent() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { state, cloudLoading, ...actions } = useGameState(userId);
  const [activeScreen, setActiveScreen] = useState<Screen>('home');
  useEffect(() => {
    if (!userId) return;
  }, [userId]);
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
      case 'contagioncache':
        // TEMP: placeholder to confirm build — screen file next
        return (
          <div className="text-center py-10">
            <h2 className="text-xl font-bold text-green-400">☢️ Contagion Cache</h2>
            <p className="text-gray-400 mt-2">Screen loading...</p>
            <p className="text-xs text-gray-500 mt-4">Fragments: {state.jackpotFragments}/5</p>
          </div>
        );
      default: return <HomeScreen state={state} actions={actions} onNavigate={handleNavigate} />;
    }
  };
  return (
    <div className="min-h-screen bg-black text-white">
      <Header
        active={activeScreen}
        onChange={handleNavigate}
        lockedPP={state.lockedPotPP}
        withdrawablePP={state.withdrawablePP}
        xp={state.xp}
      >
        {/* Duplicate NavDropdown removed — only Header renders it now */}
      </Header>
      <main className="p-4">
        {cloudLoading ? (
          <div className="text-center py-10 text-gray-400">Syncing contamination...</div>
        ) : (
          <ErrorBoundary>{renderScreen()}</ErrorBoundary>
        )}
      </main>
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

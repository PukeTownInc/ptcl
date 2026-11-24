import { useState } from 'react';
import { Tv, Gift, Users, ChevronRight, Sparkles, Play, Target, Zap, Box, Trophy, User, Wallet } from 'lucide-react';
import type { GameState, Screen } from '../types';
import type { GameActions } from '../useGameState';
import { AdModal } from '../components/AdModal';
import { useToast } from '../components/Toast';

interface Props {
  state: GameState;
  actions: GameActions;
  onNavigate: (s: Screen, target?: string) => void;
}

export function HomeScreen({ state, actions, onNavigate }: Props) {
  const toast = useToast();
  const [adModal, setAdModal] = useState<null | { title: string; subtitle?: string; reward: string; onComplete: () => void }>(null);

  const handleDailyBonus = () => {
    if (state.freeSpinsClaimed) {
      toast('info', 'Already Contaminated', 'Return tomorrow for more');
      return;
    }
    actions.claimDailyBonusSpins();
    toast('success', 'Contagion Absorbed!', '+5 Twists added');
  };

  const handleDailyBoost = () => {
    if (state.dailyBoostClaimed) {
      toast('info', 'Already Exposed', 'Return tomorrow for more');
      return;
    }
    setAdModal({
      title: 'Radiation Surge',
      subtitle: 'Absorb broadcast for daily boost',
      reward: '+5 Twists + 50 Exposure',
      onComplete: () => {
        actions.claimDailyBoost();
        actions.addXP(50, true);
        actions.watchAd();
        toast('success', 'Surge Active!', '+5 Twists + 50 Exposure');
      },
    });
  };

  const destinations: { id: Screen; title: string; subtitle: string; icon: typeof Play; status: string }[] = [
    { id: 'slots', title: 'Reactor Reels', subtitle: 'Main gaming reactor', icon: Play, status: 'LIVE' },
    { id: 'contagion-cache', title: 'Contagion Cache', subtitle: 'Open sealed reward crates', icon: Box, status: 'LIVE' },
    { id: 'missions', title: 'Hazard Duties', subtitle: 'Daily missions and streaks', icon: Target, status: 'LIVE' },
    { id: 'leaderboards', title: 'Infection Ranks', subtitle: 'Monthly player rankings', icon: Trophy, status: 'LIVE' },
    { id: 'profile', title: 'Radiation Profile', subtitle: 'Your stats and referrals', icon: User, status: 'LIVE' },
    { id: 'roadmap', title: 'Roadmap Lab', subtitle: 'Development phases and ideas', icon: Zap, status: 'LAB' },
    { id: 'withdraw', title: 'Waste Withdrawal', subtitle: 'Reward balance information', icon: Wallet, status: 'LAB' },
  ];

  return (
    <div className="town-screen">
      <section className="town-scene" aria-label="Puke Town control zone">
        <div className="town-haze" />
        <div className="town-skyline" />
        <div className="town-ground" />
        <div className="town-brand">
          <img src="/logo.png" alt="Puke Town" />
          <div><span>TOXIC INDUSTRIES</span><strong>CONTAMINATION ZONE</strong><small>SECTOR 01 · MAIN CONTROL</small></div>
        </div>
        <div className="town-status"><i /> SYSTEMS ONLINE <span>PLAYER ACCESS GRANTED</span></div>
        <div className="town-pin-grid">
          {destinations.map(({ id, title, subtitle, icon: Icon, status }, index) => (
            <button key={id} className={`town-pin town-pin-${index + 1}`} onClick={() => onNavigate(id)}>
              <span className="town-pin-icon"><Icon size={19} /></span>
              <span className="town-pin-copy"><strong>{title}</strong><small>{subtitle}</small></span>
              <span className="town-pin-status">{status}</span>
            </button>
          ))}
        </div>
        <div className="town-scene-footer"><span>☢ Puke Town Network</span><span>ALL ACTIVITY SYNCED TO YOUR ACCOUNT</span></div>
      </section>

      <section className="town-daily">
        <div className="town-section-heading"><div><span>DAILY SUPPLY</span><h2>Radiation Replenishment</h2></div><span className="town-reset">RESETS 00:00 UTC</span></div>
        <div className="town-daily-grid">
          <button onClick={handleDailyBonus} disabled={state.freeSpinsClaimed} className="town-reward-card">
            <Gift size={22} /><span><strong>Daily Contagion</strong><small>+5 Toxic Twists</small></span><b>{state.freeSpinsClaimed ? 'CLAIMED' : 'COLLECT'}</b>
          </button>
          <button onClick={handleDailyBoost} disabled={state.dailyBoostClaimed} className="town-reward-card town-reward-purple">
            <Tv size={22} /><span><strong>Radiation Surge</strong><small>+5 Twists + 50 Exposure</small></span><b>{state.dailyBoostClaimed ? 'CLAIMED' : 'AD BONUS'}</b>
          </button>
        </div>
        <button onClick={() => onNavigate('slots')} className="town-play-banner">
          <Sparkles size={20} /><span><strong>{state.spinsRemaining} TOXIC TWISTS READY</strong><small>Enter Reactor Reels and collect Puke Points</small></span><ChevronRight size={22} />
        </button>
      </section>

      <AdModal open={!!adModal} onClose={() => setAdModal(null)} onComplete={() => adModal?.onComplete()} title={adModal?.title ?? ''} subtitle={adModal?.subtitle} reward={adModal?.reward ?? ''} />
    </div>
  );
}

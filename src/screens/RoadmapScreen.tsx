import { useState } from 'react';
import { ChevronDown, ChevronUp, Gift, Lock } from 'lucide-react';
import type { Screen } from '../types';
import type { GameActions } from '../useGameState';
import { useToast } from '../components/Toast';

interface Props {
  onNavigate: (s: Screen) => void;
  actions: GameActions;
}

const roadmapData = [
  {
    title: '✅ CONTAMINATED — PHASE 0',
    color: 'text-green-400',
    borderColor: 'border-green-500/40',
    bgColor: 'bg-green-500/5',
    items: [
      '✅ ☢️ Account & Cloud Sync — Save progress across all devices',
      '✅ 🎰 Reactor Reels — Spin the wheel, earn Puke Points',
      '✅ 🎯 Hazard Duties — Daily missions, earn rewards',
      '✅ 🔥 Contamination Streak — Daily login bonuses, 7-day cycle',
      '✅ 📊 Spin History — See your last 20 spins & results',
      '✅ ⚖️ Radioactive Risk Wheel — Random spins trigger, risk it for bigger wins',
      '✅ 🏆 Toxicity Ranks — Monthly leaderboards & prizes',
      '✅ 👤 Radiation Profile — Track your stats & progress',
      '✅ 📜 Terms & Privacy — Safe, fair, & fully compliant',
    ],
  },
  {
    title: '🔴 INFECTING — PHASE 1',
    color: 'text-red-400',
    borderColor: 'border-red-500/40',
    bgColor: 'bg-red-500/5',
    items: [
      '✅ 📈 Exposure Meter — Visual XP progress bar',
      '✅ 🔒 Secure Rewards — Claim once daily, fair for all',
      '✅ 📊 Extended Leaderboards — Total Spins & Referral Ranks',
      '✅ ⏳ Monthly Countdowns — Know exactly when ranks reset',
    ],
  },
  {
    title: '🟡 SPREADING — PHASE 2',
    color: 'text-yellow-400',
    borderColor: 'border-yellow-500/40',
    bgColor: 'bg-yellow-500/5',
    items: [
      '💰 Waste Withdrawal — Cash out via FaucetPay',
      '🎟️ Contamination Pass — Battle Pass, Free + Premium tiers',
      '📦 Contagion Cache — Mystery Boxes: Common → Legendary',
      '🎡 Wheel of Misfortune — Daily mini-game, spins & rewards',
      '🛒 Toxic Shop — Boosts, perks, & exclusive items',
      '🎨 Profile Customisation — Avatars, frames, colours',
      '🏅 Long-Term Achievements — Badges, titles & hidden rewards',
      '🤝 Referral Rewards — Earn from friends you invite',
      '🗳️ Vote — Help us pick what comes next!',
    ],
  },
  {
    title: '🟠 TOXIC SPREAD — PHASE 3',
    color: 'text-orange-400',
    borderColor: 'border-orange-500/40',
    bgColor: 'bg-orange-500/5',
    items: [
      '☀️ Radiation Modes — Light & Dark themes',
      '🔔 Update Alerts — Never miss when new features drop',
      '🦠 Puke Chaotic Tap — Tap fast, earn fast!',
      '💀 Toxic Pick\'em — Pick the safe barrel or lose your stash',
      '🧪 Vial Mixer — Combine toxic brews, discover rare rewards',
      '📡 Signal Detector — Hunt hidden radiation blips, claim hidden loot',
      '🔴 Radiation Roulette — Bet safe or glow, multiply your risk',
      '📊 Geiger Grid — Scan for radiation, collect or get contaminated',
      '🧤 Containment Catch — Catch the canisters, dodge the waste',
      '🎲 Radioactive Dice — Bet, roll, win multipliers',
      '🎟️ Contamination Raffle Tickets — Instant wins daily',
      '🟩 Bingo — Contamination cards, complete lines for big rewards',
      '🧪 Scratch Cards — Scratch → reveal → win instantly',
      '🎯 Mini-Jackpot Wheel — Mini • Minor • Major • Mega wins',
      '👟 Step-to-Earn — Walk, earn, get contaminated',
      '⛏️ Contamination Cloud Mining — Claim every few hours',
      '📻 Radioactive Audio — Earn PP while you listen!',
      '📈 Toxic Surge Mode — 2× PP & 2× XP, activate & ride!',
      '🤖 Hazard Crane — Grab contaminated loot daily',
    ],
  },
  {
    title: '🟢 FULL CONTAMINATION — PHASE 4',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bgColor: 'bg-emerald-500/5',
    items: [
      '☣️ FACTIONS — Pick your side, compete together',
      '🏆 Faction Wars — Weekly competitions, shared rewards',
      '🌍 Global Community Jackpot — Every win feeds the pot!',
      '📱 Contamination Notifications — Stay in the loop',
      '📲 Toxic Widgets — Check status from your home screen',
      '📤 Share the Contamination — Show off your wins',
      '📊 Advanced Stats Dashboard — Deep dive into your numbers',
    ],
  },
  {
    title: '⚠️ GLOBAL OUTBREAK — PHASE 5',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    bgColor: 'bg-amber-500/5',
    items: [
      '💎 VIP Contamination Club — Monthly perks & bonuses',
      '🚫 Ad-Free Experience — Play uninterrupted',
      '🛍️ Premium Contamination Shop — Exclusive skins & effects',
      '👕 Real-World Merch — Wear the contamination!',
      '🎁 Limited-Time Events — Seasonal exclusive rewards',
      '📅 Quarterly Contamination Pass — Fresh content every season',
    ],
  },
  {
    title: '☠️ TOTAL CONTAMINATION — BEYOND',
    color: 'text-rose-400',
    borderColor: 'border-rose-500/40',
    bgColor: 'bg-rose-500/5',
    items: [
      '🎭 Custom Contamination Themes — Build your own look',
      '📦 Player-to-Player Gifting — Send to friends',
      '📈 Personal Contamination Dashboard — Your full journey',
      '🌐 Global Contamination Map — See where it spreads',
      '🎮 More Mini-Games — Forever expanding!',
    ],
  },
];

export function RoadmapScreen({ onNavigate, actions }: Props) {
  const toast = useToast();
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
  });

  const toggle = (i: number) => {
    setOpenSections((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  const handleClaim = () => {
    // Safe access — prevent crash if properties missing
    if (!actions.state?.missions) return;
    if (actions.state.missions.roadmapDailyGiftClaimed) return;

    // Only call if function exists
    if (typeof actions.claimRoadmapDailyGift === 'function') {
      const success = actions.claimRoadmapDailyGift();
      if (!success) return;
    }

    // Only call if functions exist
    if (typeof actions.addXP === 'function') {
      actions.addXP(10, false, true);
    }
    if (typeof actions.addSpins === 'function') {
      actions.addSpins(3);
    }

    toast.show('🎉 Thanks! +10 Exposure • +3 Twists added!');
  };

  // Safe access — prevent crash
  const isClaimed = actions.state?.missions?.roadmapDailyGiftClaimed ?? false;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto pb-8">
      <div className="grunge-panel p-5 text-center space-y-2">
        <h1 className="font-display font-black text-2xl text-toxic-400 neon-text">☢️ FALLOUT FORECAST</h1>
        <p className="text-radioactive-300 text-sm">Contamination Roadmap • Updated 14 September 2026</p>
        <p className="text-toxic-200 text-sm font-semibold">☢️ OVER 80+ CONTAMINATED FEATURES INCOMING ☢️</p>
        <p className="text-toxic-300/90 text-sm">☣️ A one-of-a-kind toxic digital ecosystem ☣️</p>
        <p className="text-toxic-300/90 text-sm">☣️ Created for YOUR benefit ☣️</p>
        <p className="text-toxic-300/90 text-sm">⚠️ Many have NEVER been combined on a single platform — anywhere!</p>
      </div>
      {roadmapData.map((section, idx) => (
        <div
          key={idx}
          className={`grunge-panel border-l-4 ${section.borderColor} ${section.bgColor} overflow-hidden`}
        >
          <button
            onClick={() => toggle(idx)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <h2 className={`font-bold text-base ${section.color}`}>{section.title}</h2>
            {openSections[idx] ? (
              <ChevronUp size={18} className="text-toxic-300" />
            ) : (
              <ChevronDown size={18} className="text-toxic-300" />
            )}
          </button>
          {openSections[idx] && (
            <div className="px-4 pb-4 space-y-2 border-t border-toxic-900/30 pt-3">
              {section.items.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-200">
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <div className="grunge-panel p-4 text-center space-y-3 mt-4">
        <p className="text-toxic-300 text-sm">🗳️ Which feature are you most hyped for?</p>
        <p className="text-toxic-200/60 text-xs">Check back often — new contamination drops regularly!</p>
        <p className="text-toxic-300 text-sm font-semibold">Claim Daily • +10 Exposure • +3 Twists</p>
        
        {!isClaimed ? (
          <button
            onClick={handleClaim}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all bg-gradient-to-r from-toxic-500 to-toxic-600 text-black hover:brightness-110 active:scale-[0.98]"
          >
            <Gift size={16} />
            <span>Thanks for reading</span>
          </button>
        ) : (
          <button
            disabled
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm bg-toxic-900/40 text-toxic-500/60 cursor-not-allowed opacity-70 border border-toxic-800/50"
          >
            <Lock size={16} />
            <span>Claimable Once Daily</span>
          </button>
        )}
      </div>
    </div>
  );
}

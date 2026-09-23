import { useState } from 'react';
import { Gift, Lock, Zap, Coins, Flame, X } from 'lucide-react';
import type { CacheBoxTier, GameState, GameActions } from '../types';
import { CACHE_BOXES, JACKPOT_FRAGMENTS_TO_UNLOCK } from '../constants';

interface Props {
  state: GameState;
  actions: GameActions;
  onBack: () => void;
}

export function ContagionCacheScreen({ state, actions, onBack }: Props) {
  const [opening, setOpening] = useState<CacheBoxTier | null>(null);
  const [result, setResult] = useState<{
    tier: CacheBoxTier;
    label: string;
    reward: ReturnType<typeof actions.openCacheBox>['reward'];
  } | null>(null);

  const handleOpen = (tier: CacheBoxTier) => {
    if (opening) return;
    setOpening(tier);
    
    const { ok, reward } = actions.openCacheBox(tier);
    
    if (!ok) {
      setOpening(null);
      return;
    }
    
    const box = CACHE_BOXES[tier];
    setResult({ tier, label: box.label, reward });
    
    setTimeout(() => {
      setOpening(null);
    }, 500);
  };

  const closeResult = () => {
    setResult(null);
  };

  const canOpenBox = (tier: CacheBoxTier): boolean => {
    const box = CACHE_BOXES[tier];
    if (box.freeDaily) {
      return actions.canClaimFreeCache();
    }
    return state.lockedPotPP >= box.costPP;
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-lime-400">☢️ CONTAGION CACHE</h1>
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Jackpot Progress */}
      <div className="mb-6 p-4 rounded-xl bg-gray-900 border border-yellow-500/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">🧪 Jackpot Fragments</span>
          <span className="font-bold text-yellow-400">
            {state.jackpotFragments} / {JACKPOT_FRAGMENTS_TO_UNLOCK}
          </span>
        </div>
        <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-300"
            style={{ width: `${(state.jackpotFragments / JACKPOT_FRAGMENTS_TO_UNLOCK) * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Collect {JACKPOT_FRAGMENTS_TO_UNLOCK} fragments → 50 Free Spins!
        </p>
      </div>

      {/* Boxes Grid — No border */}
      <div className="grid grid-cols-2 gap-4">
        {(Object.entries(CACHE_BOXES) as [CacheBoxTier, typeof CACHE_BOXES[CacheBoxTier]][]).map(([tier, box]) => {
          const canOpen = canOpenBox(tier);
          const isOpening = opening === tier;
          
          return (
            <button
              key={tier}
              onClick={() => handleOpen(tier)}
              disabled={!canOpen || isOpening}
              className={`
                relative p-4 rounded-xl transition-all duration-300 overflow-hidden bg-gray-900 border border-gray-700
                ${canOpen ? 'cursor-pointer hover:scale-105 hover:border-lime-500/50' : 'opacity-60 cursor-not-allowed'}
              `}
            >
              {/* Box Image — Closed / Open animation */}
              <div className="w-full aspect-square flex items-center justify-center">
                <img
                  src={isOpening ? box.openImage : box.closeImage}
                  alt={box.label}
                  className={`w-3/4 h-auto object-contain transition-all duration-300 ${isOpening ? 'scale-110' : ''}`}
                />
              </div>
              {/* Cost Display — directly under image */}
              <div className="pb-3 text-center">
                {box.freeDaily ? (
                  <span className={`text-sm font-bold ${canOpen ? 'text-lime-400' : 'text-gray-500'}`}>
                    {canOpen ? 'FREE DAILY' : 'ALREADY CLAIMED'}
                  </span>
                ) : (
                  <span className={`text-sm font-bold ${canOpen ? 'text-yellow-400' : 'text-red-400'}`}>
                    {box.costPP.toLocaleString()} Puke Points
                  </span>
                )}
              </div>
              {/* Lock Overlay */}
              {!canOpen && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                  <Lock size={32} className="text-gray-400" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Reward Result Modal */}
      {result && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border-2 border-lime-500/50 rounded-2xl p-6 max-w-sm w-full mx-4 text-center">
            <h2 className="text-xl font-bold text-lime-400 mb-4">🎉 {result.label}</h2>
            
            <div className="space-y-3 mb-6">
              {result.reward.spins && (
                <div className="flex items-center justify-center gap-2 text-lg">
                  <Zap size={20} className="text-yellow-400" />
                  <span>+{result.reward.spins} Free Spins</span>
                </div>
              )}
              {result.reward.xp && (
                <div className="flex items-center justify-center gap-2 text-lg">
                  <Flame size={20} className="text-orange-400" />
                  <span>+{result.reward.xp} XP</span>
                </div>
              )}
              {result.reward.pp && (
                <div className="flex items-center justify-center gap-2 text-lg">
                  <Coins size={20} className="text-lime-400" />
                  <span>+{result.reward.pp} Puke Points</span>
                </div>
              )}
              {result.reward.boost && (
                <div className="flex items-center justify-center gap-2 text-lg text-purple-400">
                  <Zap size={20} />
                  <span>
                    {result.reward.boost === 'hotStreak' && '🔥 Hot Streak Activated!'}
                    {result.reward.boost === 'potAccel' && '⚡ Pot Acceleration Activated!'}
                    {result.reward.boost === 'xpBoost' && '✨ XP Boost Activated!'}
                  </span>
                </div>
              )}
              {result.reward.jackpotFragment && (
                <div className="flex items-center justify-center gap-2 text-lg text-yellow-400 font-bold">
                  <span>🧪 Jackpot Fragment Found!</span>
                </div>
              )}
            </div>

            <button
              onClick={closeResult}
              className="w-full py-3 bg-lime-500 text-black font-bold rounded-lg hover:bg-lime-400 transition-colors"
            >
              COLLECT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

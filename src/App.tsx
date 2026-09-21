import { useState } from 'react';
import { Chest, Zap, Coins, Star, Lock, Unlock, AlertTriangle } from 'lucide-react';
import type { GameState, GameActions, CacheBoxTier } from '../types';
import { CACHE_BOXES, JACKPOT_FRAGMENTS_TO_UNLOCK, formatPP } from '../constants';
import { useToast } from '../components/Toast';

interface Props {
  state: GameState;
  actions: GameActions;
}

export function ContagionCacheScreen({ state, actions }: Props) {
  const toast = useToast();
  const [opening, setOpening] = useState<string | null>(null);
  const [lastReward, setLastReward] = useState<ReturnType<typeof actions.openCacheBox>['reward'] | null>(null);

  const handleOpen = (tier: CacheBoxTier) => {
    const box = CACHE_BOXES.find(b => b.id === tier);
    if (!box) return;

    // Check free daily
    if (box.freeDaily && !actions.canClaimFreeCache()) {
      toast.show('Already claimed today — come back tomorrow!', 'info');
      return;
    }

    // Check cost
    if (!box.freeDaily && state.lockedPotPP < box.costPP) {
      toast.show('Not enough Puke Points!', 'error');
      return;
    }

    setOpening(tier);
    setTimeout(() => {
      const { ok, reward } = actions.openCacheBox(tier);
      setOpening(null);
      if (!ok) {
        toast.show('Failed to open — try again', 'error');
        return;
      }
      setLastReward(reward);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-toxic-400 flex items-center justify-center gap-2">
          <Chest size={24} /> Contagion Cache
        </h1>
        <p className="text-sm text-gray-400">Open boxes for rewards — one free every day!</p>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-yellow-500/30">
          <Star size={14} className="text-yellow-400" />
          <span className="text-xs font-mono text-yellow-300">
            Fragments: {state.jackpotFragments}/{JACKPOT_FRAGMENTS_TO_UNLOCK}
          </span>
        </div>
      </div>

      {/* Reward display */}
      {lastReward && (
        <div className="bg-black/50 border border-toxic-400/40 rounded-xl p-4 space-y-2 animate-pulse">
          <p className="text-center font-bold text-toxic-300">✨ You Got It! ✨</p>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            {lastReward.spins && <span className="flex items-center gap-1 text-green-400"><Zap size={14} /> +{lastReward.spins} Twists</span>}
            {lastReward.xp && <span className="flex items-center gap-1 text-blue-400"><Star size={14} /> +{lastReward.xp} XP</span>}
            {lastReward.pp && <span className="flex items-center gap-1 text-yellow-400"><Coins size={14} /> +{formatPP(lastReward.pp)} PP</span>}
            {lastReward.boost && <span className="flex items-center gap-1 text-orange-400"><Zap size={14} /> Boost Active!</span>}
            {lastReward.jackpotFragment && <span className="flex items-center gap-1 text-yellow-300"><Star size={14} /> Jackpot Fragment!</span>}
          </div>
        </div>
      )}

      {/* Boxes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CACHE_BOXES.map((box) => {
          const isFree = box.freeDaily;
          const canOpen = isFree ? actions.canClaimFreeCache() : state.lockedPotPP >= box.costPP;
          const isOpening = opening === box.id;

          return (
            <button
              key={box.id}
              onClick={() => handleOpen(box.id)}
              disabled={!canOpen || isOpening}
              className={`
                relative p-4 rounded-xl border-2 transition-all duration-300 overflow-hidden
                ${canOpen ? 'border-toxic-400/50 hover:border-toxic-300 hover:scale-105 active:scale-95' : 'border-gray-700/50 opacity-60'}
                ${isOpening ? 'animate-bounce' : ''}
                bg-gradient-to-br ${box.gradient}
              `}
            >
              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <Chest size={28} className={canOpen ? 'text-toxic-300' : 'text-gray-500'} />
                  {canOpen ? <Unlock size={16} className="text-green-400" /> : <Lock size={16} className="text-gray-500" />}
                </div>
                <h3 className="font-bold text-lg text-white">{box.label}</h3>
                <p className="text-xs text-gray-300">
                  {isFree ? (
                    actions.canClaimFreeCache() ? (
                      <span className="text-green-400 font-bold">FREE — Claim Now!</span>
                    ) : (
                      <span className="text-gray-400">Claimed — back tomorrow</span>
                    )
                  ) : (
                    <span className="flex items-center gap-1">
                      <Coins size={12} /> {formatPP(box.costPP)} PP
                    </span>
                  )}
                </p>
                {!isFree && state.lockedPotPP < box.costPP && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertTriangle size={12} /> Need {formatPP(box.costPP - state.lockedPotPP)} more
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Info */}
      <p className="text-xs text-center text-gray-500 mt-4">
        Collect {JACKPOT_FRAGMENTS_TO_UNLOCK} Jackpot Fragments → unlock Grand Jackpot reward!
      </p>
    </div>
  );
}

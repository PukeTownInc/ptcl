import { useState } from 'react';
import { Lock, Zap, Coins, Flame, X, Tv } from 'lucide-react';
import type { CacheBoxTier, GameState, GameActions } from '../types';
import { CACHE_BOXES, JACKPOT_FRAGMENTS_TO_UNLOCK, CACHE_ASSET_PATH } from '../constants';
import { AdModal } from '../components/AdModal';
import { useToast } from '../components/Toast';
interface Props {
  state: GameState;
  actions: GameActions;
  onBack: () => void;
}
export function ContagionCacheScreen({ state, actions, onBack }: Props) {
  const toast = useToast();
  const [opening, setOpening] = useState<CacheBoxTier | null>(null);
  const [adModalData, setAdModalData] = useState<{
    title: string;
    subtitle?: string;
    onComplete: () => void;
  } | null>(null);
  const [result, setResult] = useState<{
    tier: CacheBoxTier;
    label: string;
    reward: ReturnType<typeof actions.openCacheBox>['reward'];
  } | null>(null);
  const doOpenBox = (tier: CacheBoxTier, viaAd: boolean) => {
    if (opening) return;
    setOpening(tier);
    
    const { ok, reward } = actions.openCacheBox(tier, viaAd);
    
    if (!ok) {
      setOpening(null);
      if (toast) toast.show('Claim failed — try again later', 'error');
      return;
    }
    
    const box = CACHE_BOXES[tier];
    setResult({ tier, label: box.label, reward });
    
    setTimeout(() => {
      setOpening(null);
    }, 500);
  };
  const handleFreeClaim = (tier: CacheBoxTier) => {
    doOpenBox(tier, false);
  };
  const handleAdClaim = (tier: CacheBoxTier) => {
    if (opening || adModalData) return;
    
    setAdModalData({
      title: 'Watch Ad to Open Box',
      subtitle: 'Watch a short video to unlock your Contagion Cache',
      onComplete: () => {
        setAdModalData(null);
        doOpenBox(tier, true);
      },
    });
  };
  const closeResult = () => {
    setResult(null);
  };
  const canOpenBox = (tier: CacheBoxTier): boolean => {
    const box = CACHE_BOXES[tier];
    if (box.freeDaily) {
      return actions.canClaimFreeCache() || actions.canClaimBlueCacheViaAd();
    }
    return state.lockedPotPP >= box.costPP;
  };
  const isFreeClaimAvailable = actions.canClaimFreeCache();
  const isAdClaimAvailable = actions.canClaimBlueCacheViaAd();
  const isPurpleAdAvailable = actions.canClaimPurpleCacheViaAd?.() ?? false;
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-lime-400">☢️ CONTAGION CACHE</h1>
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
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
      <div className="grid grid-cols-2 gap-4">
        {(Object.entries(CACHE_BOXES) as [CacheBoxTier, typeof CACHE_BOXES[CacheBoxTier]][]).map(([tier, box]) => {
          const canOpen = canOpenBox(tier);
          const isOpening = opening === tier;
          const isPurpleBox = tier === 'purple';
          const isOrangeBox = tier === 'orange';
          const isYellowBox = tier === 'yellow';
          
          return (
            <div
              key={tier}
              className={`
                relative p-3 rounded-xl transition-all duration-300 overflow-hidden w-full bg-gray-900 border border-gray-700
                ${canOpen || (isPurpleBox && isPurpleAdAvailable) ? '' : 'opacity-60'}
              `}
            >
              <div className="w-full aspect-square flex items-center justify-center">
                <img
                  src={isOpening ? box.openImage : box.closeImage}
                  alt={box.label}
                  className={`w-3/4 h-auto object-contain transition-all duration-300 ${isOpening ? 'scale-110' : ''}`}
                />
              </div>
              
              <p className="py-1 text-xs text-gray-400 text-center">
                Potential Intoxications: Puke Points • Twists • XP • Jackpot Fragments
              </p>
              
              <div className="pb-2 text-center">
                {box.freeDaily ? (
                  <div className="space-y-2">
                    {isFreeClaimAvailable ? (
                      <button
                        onClick={() => handleFreeClaim(tier)}
                        disabled={!!opening || !!adModalData}
                        className="w-full py-2 bg-lime-500 text-black font-bold rounded-lg hover:bg-lime-400 transition-colors disabled:opacity-50"
                      >
                        FREE DAILY
                      </button>
                    ) : (
                      <span className="block text-sm font-bold text-gray-500">
                        Free Claimed
                      </span>
                    )}
                    
                    {isAdClaimAvailable ? (
                      <button
                        onClick={() => handleAdClaim(tier)}
                        disabled={!!opening || !!adModalData}
                        className="w-full py-2 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Tv size={16} />
                        Watch Ad ({2 - state.blueCacheAdClaims} left)
                      </button>
                    ) : (
                      <span className="block text-xs text-gray-500">
                        Ad claims used up
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => doOpenBox(tier, false)}
                      disabled={!canOpen || !!opening || !!adModalData}
                      className={`w-full py-2 font-bold rounded-lg transition-colors ${
                        canOpen
                          ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isOrangeBox ? '10,000 Puke Points' : isYellowBox ? '20,000 Puke Points' : '5,000 Puke Points'}
                    </button>
                    
                    {isPurpleBox && isPurpleAdAvailable ? (
                      <button
                        onClick={() => handleAdClaim(tier)}
                        disabled={!!opening || !!adModalData}
                        className="w-full py-2 bg-fuchsia-600 text-white font-bold rounded-lg hover:bg-fuchsia-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Tv size={16} />
                        Watch Ad — 1 Daily
                      </button>
                    ) : isPurpleBox ? (
                      <span className="block text-xs text-gray-500">
                        Daily ad claimed
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
              
              {!canOpen && !(isPurpleBox && isPurpleAdAvailable) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                  <Lock size={32} className="text-gray-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {adModalData && (
        <AdModal
          open={!!adModalData}
          title={adModalData.title}
          subtitle={adModalData.subtitle}
          reward="Mystery Cache Box"
          onClose={() => setAdModalData(null)}
          onComplete={adModalData.onComplete}
        />
      )}
      {result && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border-2 border-lime-500/50 rounded-2xl p-6 max-w-sm w-full mx-4 text-center">
            <h2 className="text-xl font-bold text-lime-400 mb-4">🎉 {result.label}</h2>
            
            {result.tier === 'blue' && (
              <img
                src={`${CACHE_ASSET_PATH}blue-open.png`}
                alt="Blue Box Opened"
                className="w-1/2 h-auto mx-auto mb-4"
              />
            )}
            
            {result.tier === 'purple' && (
              <img
                src={`${CACHE_ASSET_PATH}purple-open.png`}
                alt="Purple Box Opened"
                className="w-1/2 h-auto mx-auto mb-4"
              />
            )}
            
            {result.tier === 'orange' && (
              <img
                src={`${CACHE_ASSET_PATH}orange-open.png`}
                alt="Orange Box Opened"
                className="w-1/2 h-auto mx-auto mb-4"
              />
            )}
            
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

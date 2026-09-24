import { useState } from 'react';
import { Info, Trophy, X } from 'lucide-react';
import { useGameState } from '../useGameState';
import { PLINKO_MULTIPLIERS } from '../constants';
const FIXED_BET_PP = 100;
export function PlinkoScreen() {
  const { state, playPlinko } = useGameState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<{
    visible: boolean;
    pocketIndex: number;
    multiplier: number;
    payoutPP: number;
    win: boolean;
  } | null>(null);
  const handlePlay = () => {
    if (isPlaying || state.lockedPotPP < FIXED_BET_PP) return;
    
    setIsPlaying(true);
    setLastResult(null);
    
    setTimeout(() => {
      const result = playPlinko(FIXED_BET_PP);
      
      if (result.ok) {
        setLastResult({
          visible: true,
          pocketIndex: result.pocketIndex,
          multiplier: result.multiplier,
          payoutPP: result.payoutPP,
          win: result.payoutPP > FIXED_BET_PP,
        });
      }
      
      setIsPlaying(false);
    }, 1200);
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-950 via-green-900 to-emerald-950 text-white p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-lime-400">☢️ Radioactive Plinko</h1>
          <p className="text-sm text-green-300 mt-1">Drop the ball — multiply your Puke Points!</p>
          <p className="text-lg font-semibold text-yellow-300 mt-2">
            Contagion Vault: {state.lockedPotPP.toLocaleString()} Puke Points
          </p>
        </div>
        <div className="bg-black/40 rounded-xl p-4 mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-4 h-4 bg-lime-400 rounded-full shadow-lg shadow-lime-400/50" />
          </div>
          
          <div className="space-y-2 mb-4">
            {[0, 1, 2, 3, 4, 5, 6].map((row) => (
              <div
                key={row}
                className="flex justify-center gap-4"
                style={{ paddingLeft: `${row * 8}px`, paddingRight: `${row * 8}px` }}
              >
                {Array.from({ length: row + 2 }).map((_, i) => (
                  <div key={i} className="w-2 h-2 bg-lime-600/60 rounded-full" />
                ))}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-8 gap-1">
            {PLINKO_MULTIPLIERS.map((mult, idx) => {
              const isHighlighted = lastResult?.visible && lastResult.pocketIndex === idx;
              const isWin = mult >= 1;
              return (
                <div
                  key={idx}
                  className={`
                    text-center py-2 rounded-lg text-sm font-bold transition-all
                    ${isHighlighted
                      ? 'bg-yellow-500 text-black scale-110 shadow-lg shadow-yellow-500/50'
                      : isWin
                        ? 'bg-lime-700/60 text-lime-200'
                        : 'bg-red-900/60 text-red-200'
                    }
                  `}
                >
                  {mult}x
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-black/40 rounded-xl p-4 mb-6">
          <div className="text-center mb-4 py-2">
            <span className="text-sm text-green-300">Fixed Bet: </span>
            <span className="font-bold text-lime-400">100 Puke Points</span>
          </div>
          
          <button
            onClick={handlePlay}
            disabled={isPlaying || state.lockedPotPP < FIXED_BET_PP}
            className={`
              w-full py-3 rounded-xl font-bold text-lg transition-all
              ${isPlaying || state.lockedPotPP < FIXED_BET_PP
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-lime-500 hover:bg-lime-400 text-black shadow-lg shadow-lime-500/30 active:scale-98'
              }
            `}
          >
            {isPlaying ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Dropping...
              </span>
            ) : (
              `DROP BALL — 100 Puke Points`
            )}
          </button>
          
          {state.lockedPotPP < FIXED_BET_PP && (
            <p className="text-center text-red-400 text-sm mt-3">
              Need 100 Puke Points to play
            </p>
          )}
        </div>
        {lastResult?.visible && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-green-900 to-green-950 rounded-2xl p-6 max-w-sm w-full text-center border border-lime-500/30 relative">
              <button
                onClick={() => setLastResult(null)}
                className="absolute top-3 right-3 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
              <Trophy className="mx-auto mb-3 text-yellow-400" size={40} />
              <h3 className="text-xl font-bold mb-2">
                {lastResult.win ? '🎉 WINNER!' : 'Better Luck Next Time'}
              </h3>
              <p className="text-3xl font-bold text-yellow-400 mb-2">
                {lastResult.multiplier}x
              </p>
              <p className="text-lg mb-4">
                Payout: <span className="font-bold text-lime-400">{lastResult.payoutPP.toLocaleString()}</span> Puke Points
              </p>
              <button
                onClick={() => setLastResult(null)}
                className="w-full py-2 bg-lime-600 hover:bg-lime-500 rounded-lg font-bold transition"
              >
                Continue
              </button>
            </div>
          </div>
        )}
        <div className="bg-black/40 rounded-xl p-4 text-sm text-green-300">
          <div className="flex items-center gap-2 mb-2">
            <Info size={16} className="text-lime-400" />
            <span className="font-bold text-white">How to Play</span>
          </div>
          <ul className="space-y-1">
            <li>• Fixed bet: 100 Puke Points per drop</li>
            <li>• Click DROP BALL to start</li>
            <li>• Ball bounces down — lands in a pocket</li>
            <li>• Multiplier × 100 = your payout</li>
            <li>• 1.0x = break even | &gt;1.0x = profit!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

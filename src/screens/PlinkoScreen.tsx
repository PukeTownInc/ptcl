import { useState } from 'react';
import { Coins, Info, Trophy, X } from 'lucide-react';
import { useGameState } from '../useGameState';
import { PLINKO_MULTIPLIERS } from '../constants';

export function PlinkoScreen() {
  const { state, playPlinko } = useGameState(null);
  const [betAmount, setBetAmount] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<{
    visible: boolean;
    pocketIndex: number;
    multiplier: number;
    payoutPP: number;
    win: boolean;
  } | null>(null);

  const handlePlay = () => {
    if (isPlaying || state.lockedPotPP < betAmount) return;

    setIsPlaying(true);
    setLastResult(null);

    setTimeout(() => {
      const result = playPlinko(betAmount);
      setIsPlaying(false);
      if (result.ok) {
        setLastResult({
          visible: true,
          pocketIndex: result.pocketIndex,
          multiplier: result.multiplier,
          payoutPP: result.payoutPP,
          win: result.payoutPP > betAmount,
        });
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-950 via-green-900 to-emerald-950 text-white p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-lime-400">☢️ Radioactive Plinko</h1>
          <p className="text-sm text-green-300 mt-1">Drop the ball — multiply your Puke Points!</p>
        </div>

        {/* Balance */}
        <div className="bg-black/40 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="text-yellow-400" size={20} />
            <span className="font-bold">{state.lockedPotPP.toLocaleString()}</span>
          </div>
          <span className="text-sm text-green-300">Puke Points</span>
        </div>

        {/* Plinko Board */}
        <div className="bg-black/40 rounded-xl p-4 mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-4 h-4 bg-lime-400 rounded-full shadow-lg shadow-lime-400/50" />
          </div>

          {/* Peg Grid */}
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

          {/* Pockets / Multipliers */}
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

        {/* Bet Controls */}
        <div className="bg-black/40 rounded-xl p-4 mb-6">
          <label className="text-sm text-green-300 mb-2 block">Bet Amount</label>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setBetAmount(Math.max(10, betAmount / 2))}
              className="px-3 py-2 bg-green-800 rounded-lg hover:bg-green-700 transition"
              disabled={isPlaying}
            >
              ½
            </button>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Math.max(10, Number(e.target.value)))}
              className="flex-1 bg-green-900/50 border border-green-700 rounded-lg px-3 py-2 text-center font-bold"
              min={10}
              disabled={isPlaying}
            />
            <button
              onClick={() => setBetAmount(Math.min(state.lockedPotPP, betAmount * 2))}
              className="px-3 py-2 bg-green-800 rounded-lg hover:bg-green-700 transition"
              disabled={isPlaying}
            >
              ×2
            </button>
          </div>

          <button
            onClick={handlePlay}
            disabled={isPlaying || state.lockedPotPP < betAmount}
            className={`
              w-full py-3 rounded-xl font-bold text-lg transition-all
              ${isPlaying || state.lockedPotPP < betAmount
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
              `DROP BALL — ${betAmount} Puke Points`
            )}
          </button>
        </div>

        {/* Result Popup */}
        {lastResult?.visible && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-green-900 to-green-950 rounded-2xl p-6 max-w-sm w-full text-center border border-lime-500/30">
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

        {/* Info Panel */}
        <div className="bg-black/40 rounded-xl p-4 text-sm text-green-300">
          <div className="flex items-center gap-2 mb-2">
            <Info size={16} className="text-lime-400" />
            <span className="font-bold text-white">How to Play</span>
          </div>
          <ul className="space-y-1">
            <li>• Set your bet in Puke Points</li>
            <li>• Click DROP BALL to start</li>
            <li>• Ball bounces down — lands in a pocket</li>
            <li>• Multiplier × your bet = your payout</li>
            <li>• 1.0x = break even | &gt;1.0x = profit!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

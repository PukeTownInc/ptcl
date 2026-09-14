import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Info, RefreshCw, Zap } from 'lucide-react';
import type { Screen } from '../types';
import { formatPP } from '../constants';
import { useToast } from './Toast';

// ─── VIAL RARITY DEFINITIONS ───
const VIAL_TIERS = [
  { id: 'common', label: 'Sewer Sludge', gradient: 'linear-gradient(180deg, #39FF14 0%, #1a8f00 100%)', glow: '0 0 20px #39FF14, inset 0 0 15px rgba(57,255,20,0.4)', minVal: 10, maxVal: 25, weight: 45, successBonus: 1.00 },
  { id: 'uncommon', label: 'Radioactive Serum', gradient: 'linear-gradient(180deg, #FFFF00 0%, #cc9900 100%)', glow: '0 0 20px #FFFF00, inset 0 0 15px rgba(255,255,0,0.4)', minVal: 25, maxVal: 60, weight: 28, successBonus: 0.95 },
  { id: 'rare', label: 'Toxic Elixir', gradient: 'linear-gradient(180deg, #FF6600 0%, #cc3300 100%)', glow: '0 0 20px #FF6600, inset 0 0 15px rgba(255,102,0,0.4)', minVal: 60, maxVal: 150, weight: 15, successBonus: 0.85 },
  { id: 'epic', label: 'Contaminated Goo', gradient: 'linear-gradient(180deg, #FF0033 0%, #990000 100%)', glow: '0 0 20px #FF0033, inset 0 0 15px rgba(255,0,51,0.4)', minVal: 150, maxVal: 350, weight: 8, successBonus: 0.75 },
  { id: 'legendary', label: 'Pure Radiation', gradient: 'linear-gradient(180deg, #00FFFF 0%, #0099CC 100%)', glow: '0 0 25px #00FFFF, inset 0 0 20px rgba(0,255,255,0.5)', minVal: 350, maxVal: 1000, weight: 4, successBonus: 0.60 },
] as const;

type Vial = {
  id: string;
  tier: typeof VIAL_TIERS[number];
  value: number;
};

type MixResult = 'idle' | 'mixing' | 'success' | 'fail' | 'critical';

interface Props {
  onNavigate: (s: Screen) => void;
  balancePP: number;
  onEarnPP: (amount: number, source: string) => void;
  onWatchAd: () => Promise<boolean>;
}

const STORAGE_KEY = 'puketown_vialmixer';

function weightedRandomVial(): Vial['tier'] {
  const total = VIAL_TIERS.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const tier of VIAL_TIERS) {
    r -= tier.weight;
    if (r <= 0) return tier;
  }
  return VIAL_TIERS[0];
}

function generateVials(count: number): Vial[] {
  return Array.from({ length: count }, (_, i) => {
    const tier = weightedRandomVial();
    const value = Math.floor(tier.minVal + Math.random() * (tier.maxVal - tier.minVal));
    return { id: `v-${Date.now()}-${i}`, tier, value };
  });
}

export function VialMixerScreen({ onNavigate, balancePP, onEarnPP, onWatchAd }: Props) {
  const toast = useToast();
  const [vials, setVials] = useState<Vial[]>([]);
  const [selected, setSelected] = useState<Vial[]>([]);
  const [result, setResult] = useState<MixResult>('idle');
  const [freeClaimedToday, setFreeClaimedToday] = useState(false);
  const [dailyUsed, setDailyUsed] = useState(0);
  const TODAY = new Date().toISOString().slice(0, 10);

  // ─── LOAD SAVE STATE ───
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.date === TODAY) {
          setFreeClaimedToday(data.freeClaimed ?? false);
          setDailyUsed(data.dailyUsed ?? 0);
        }
      }
    } catch {}
    setVials(generateVials(6));
  }, [TODAY]);

  const saveState = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      date: TODAY,
      freeClaimed: freeClaimedToday,
      dailyUsed,
    }));
  }, [TODAY, freeClaimedToday, dailyUsed]);

  useEffect(saveState, [saveState]);

  // ─── CALCULATE ODDS & PREVIEW ───
  const preview = useCallback(() => {
    if (selected.length !== 3) return null;
    const avgSuccess = selected.reduce((s, v) => s * v.tier.successBonus, 1);
    const successChance = Math.round(avgSuccess * 100);
    const totalBase = selected.reduce((s, v) => s + v.value, 0);
    const multiplier = 0.85 + Math.random() * 0.5;
    const estimated = Math.round(totalBase * multiplier);
    return { successChance, failChance: 100 - successChance, estimated, totalBase };
  }, [selected]);

  const previewData = preview();

  // ─── TOGGLE VIAL SELECTION ───
  const toggleVial = (vial: Vial) => {
    if (result !== 'idle') return;
    if (selected.find(v => v.id === vial.id)) {
      setSelected(selected.filter(v => v.id !== vial.id));
    } else if (selected.length < 3) {
      setSelected([...selected, vial]);
    }
  };

  // ─── REFRESH VIALS ───
  const refreshVials = async (useAd: boolean) => {
    if (!useAd && balancePP < 10) {
      toast.show('⚠️ Need 10 Puke Points or watch an ad', 'warning');
      return;
    }
    if (useAd) {
      const ok = await onWatchAd();
      if (!ok) return;
    }
    setVials(generateVials(6));
    setSelected([]);
    setResult('idle');
    setDailyUsed(p => p + 1);
    toast.show('🧪 New vials loaded!', 'success');
  };

  // ─── PERFORM THE MIX ───
  const performMix = async () => {
    if (selected.length !== 3) return;
    if (freeClaimedToday && dailyUsed === 0) {
      toast.show('⚠️ Daily free mix used — refresh for more!', 'warning');
      return;
    }

    setResult('mixing');
    await new Promise(r => setTimeout(r, 2000));

    const roll = Math.random() * 100;
    const chance = previewData!.successChance;
    const isCritical = Math.random() < 0.05;

    if (roll < chance) {
      let payout = previewData!.estimated;
      if (isCritical) payout *= 2;
      setResult(isCritical ? 'critical' : 'success');
      onEarnPP(payout, 'Vial Mixer');
      toast.show(`✅ ${isCritical ? '⚡ CRITICAL ×2! ' : ''}+${formatPP(payout)} PP!`, 'success');
    } else {
      setResult('fail');
      toast.show('💀 CONTAMINATED — Vials destroyed!', 'error');
    }

    if (!freeClaimedToday) setFreeClaimedToday(true);
    setDailyUsed(p => p + 1);

    setTimeout(() => {
      setVials(generateVials(6));
      setSelected([]);
      setResult('idle');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden">
      {/* ─── HEADER — TOXIC SIGNBOARD STYLE ─── */}
      <div className="relative px-4 pt-4 pb-2">
        <div className="relative">
          {/* Hazard stripes top */}
          <div className="absolute top-0 left-0 right-0 h-3 bg-yellow-500" style={{ background: 'repeating-linear-gradient(90deg, #000 0px, #000 12px, #eab308 12px, #eab308 24px)' }} />
          <div className="bg-gray-900 border-4 border-yellow-600 px-6 py-4 mt-2 rounded-sm" style={{ boxShadow: 'inset 0 0 30px rgba(34,197,94,0.2), 0 0 20px rgba(34,197,94,0.3)' }}>
            <div className="flex items-center justify-between">
              <button onClick={() => onNavigate('home')} className="text-green-400 hover:text-green-300">
                <ChevronLeft size={24} />
              </button>
              <h1 className="text-3xl font-black tracking-widest text-green-400" style={{ textShadow: '0 0 15px #39FF14, 0 0 30px #39FF14' }}>☢️ VIAL MIXER</h1>
              <div className="text-xs text-green-300 font-mono">
                {freeClaimedToday ? 'USED' : '🆓 FREE'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTAINER — METAL SHELF BACKGROUND ─── */}
      <div className="px-4 pb-8 space-y-4">
        {/* Metal panel background */}
        <div className="relative rounded-lg overflow-hidden border-4 border-gray-700" style={{ background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 50%, #222 100%)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8), 0 0 15px rgba(0,0,0,0.5)' }}>
          
          {/* ─── TOP SHELF — 3 VIAL SLOTS ─── */}
          <div className="relative p-4 pb-6">
            <p className="text-center text-gray-400 text-sm mb-4 font-mono">⚗️ SELECT 3 VIALS TO MIX</p>
            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2].map(slot => {
                const vial = selected[slot];
                return (
                  <div key={slot} className="flex flex-col items-center">
                    {/* Vial glass container */}
                    <div 
                      className="relative w-20 h-28 rounded-b-full rounded-t-lg border-2 border-gray-500 flex items-end justify-center overflow-hidden transition-all duration-300"
                      style={{
                        background: vial ? vial.tier.gradient : 'linear-gradient(180deg, #333 0%, #222 100%)',
                        boxShadow: vial ? vial.tier.glow : 'inset 0 0 10px rgba(0,0,0,0.5)',
                        borderColor: vial ? 'rgba(255,255,255,0.3)' : '#444',
                      }}
                    >
                      {/* Liquid fill */}
                      <div className="absolute bottom-0 left-0 right-0 h-3/4 opacity-80" style={{ background: vial ? vial.tier.gradient : 'transparent' }} />
                      {/* Bubbles animation */}
                      {vial && (
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                          {[...Array(5)].map((_, i) => (
                            <div 
                              key={i}
                              className="absolute w-1 h-1 bg-white/60 rounded-full animate-bounce"
                              style={{ 
                                left: `${20 + i * 15}%`, 
                                bottom: `${20 + i * 10}%`,
                                animationDelay: `${i * 0.3}s`,
                                animationDuration: `${1.5 + i * 0.2}s`
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {/* Cork top */}
                      <div className="absolute -top-1 w-8 h-3 bg-amber-800 rounded-t-md border border-amber-900" />
                      {vial && <span className="relative z-10 text-white font-bold text-xs mb-2 drop-shadow-lg">{formatPP(vial.value)}</span>}
                    </div>
                    <span className="text-xs text-gray-400 mt-2 h-5">{vial ? vial.tier.label : 'Empty'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Metal shelf divider */}
          <div className="h-2 bg-gray-700 border-y-2 border-gray-600" style={{ boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.5)' }} />

          {/* ─── BOTTOM SECTION — MIX CHAMBER + VIAL GRID ─── */}
          <div className="p-4 space-y-4">
            {/* ─── MIX CHAMBER ─── */}
            <div className="relative mx-auto w-64 h-36 rounded-full border-4 border-gray-600 overflow-hidden" style={{ background: 'radial-gradient(circle, #1a3a1a 0%, #0a1a0a 70%, #051005 100%)', boxShadow: 'inset 0 0 30px rgba(34,197,94,0.3), 0 0 20px rgba(34,197,94,0.2)' }}>
              {/* Swirling liquid */}
              <div 
                className="absolute inset-2 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, #39FF14 0%, #22cc00 40%, #116600 80%, #0a3300 100%)',
                  boxShadow: '0 0 30px #39FF14, inset 0 0 20px rgba(255,255,255,0.2)',
                  animation: result === 'mixing' ? 'spin 2s linear infinite' : 'pulse 2s ease-in-out infinite',
                  opacity: result === 'fail' ? 0.3 : 1,
                  filter: result === 'fail' ? 'hue-rotate(180deg)' : 'none',
                }}
              />
              {/* Chamber label */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-green-400 font-black text-xl tracking-widest" style={{ textShadow: '0 0 10px #39FF14' }}>
                {result === 'idle' && 'MIX CHAMBER'}
                {result === 'mixing' && '⚗️ MIXING...'}
                {result === 'success' && '✅ STABLE!'}
                {result === 'critical' && '⚡ CRITICAL!'}
                {result === 'fail' && '💀 CONTAMINATED!'}
              </div>
            </div>

            {/* ─── ODDS PREVIEW ─── */}
            {previewData && result === 'idle' && (
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-green-900/40 border border-green-500/50 rounded-lg p-2">
                  <div className="text-green-400 font-bold text-lg">{previewData.successChance}%</div>
                  <div className="text-xs text-green-300/70">SUCCESS</div>
                </div>
                <div className="bg-red-900/40 border border-red-500/50 rounded-lg p-2">
                  <div className="text-red-400 font-bold text-lg">{previewData.failChance}%</div>
                  <div className="text-xs text-red-300/70">CONTAMINATE</div>
                </div>
                <div className="col-span-2 bg-gray-800/50 rounded-lg p-2 border border-gray-600">
                  <div className="text-yellow-400 font-bold">~{formatPP(previewData.estimated)} PP</div>
                  <div className="text-xs text-gray-400">ESTIMATED REWARD</div>
                </div>
              </div>
            )}

            {/* ─── YOUR VIALS — 6 GRID ─── */}
            <p className="text-center text-gray-400 text-sm font-mono mt-4">🧪 YOUR VIALS — Tap to select</p>
            <div className="grid grid-cols-3 gap-3">
              {vials.map(vial => {
                const isSel = !!selected.find(v => v.id === vial.id);
                return (
                  <button
                    key={vial.id}
                    onClick={() => toggleVial(vial)}
                    disabled={result !== 'idle'}
                    className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-300 ${
                      isSel ? 'border-white scale-105 bg-gray-800/80' : 'border-gray-600 bg-gray-900/50 hover:border-gray-400'
                    } ${result !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {/* Vial */}
                    <div 
                      className="w-12 h-16 rounded-b-full rounded-t-lg border border-gray-500 relative overflow-hidden mb-1"
                      style={{
                        width: '44px',
                        background: vial.tier.gradient,
                        boxShadow: isSel ? vial.tier.glow : `inset 0 0 8px rgba(255,255,255,0.1), ${vial.tier.glow}`,
                      }}
                    >
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-amber-800 rounded-t-sm" />
                      <div className="absolute bottom-0 left-0 right-0 h-3/4 opacity-90" style={{ background: vial.tier.gradient }} />
                    </div>
                    <span className="text-xs text-gray-200 truncate w-full text-center">{vial.tier.label}</span>
                    <span className="text-xs text-yellow-400 font-mono">{formatPP(vial.value)}</span>
                  </button>
                );
              })}
            </div>

            {/* ─── ACTION BUTTONS ─── */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => refreshVials(false)}
                disabled={result !== 'idle'}
                className="flex items-center justify-center gap-2 py-3 rounded-lg bg-gray-800 border-2 border-gray-600 text-gray-200 hover:border-gray-400 transition-all disabled:opacity-40"
              >
                <RefreshCw size={18} />
                <span className="text-sm font-bold">10 PP</span>
              </button>
              <button
                onClick={() => refreshVials(true)}
                disabled={result !== 'idle'}
                className="flex items-center justify-center gap-2 py-3 rounded-lg bg-gray-800 border-2 border-yellow-600/50 text-yellow-300 hover:border-yellow-500 transition-all disabled:opacity-40"
              >
                <Zap size={18} />
                <span className="text-sm font-bold">WATCH AD</span>
              </button>
            </div>

            <button
              onClick={performMix}
              disabled={selected.length !== 3 || result !== 'idle'}
              className="w-full py-4 rounded-lg font-black text-xl tracking-widest border-4 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 30%, #16a34a 70%, #15803d 100%)',
                borderColor: '#86efac',
                boxShadow: '0 0 20px rgba(74,222,128,0.4), inset 0 2px 10px rgba(255,255,255,0.3)',
                color: '#052e16',
              }}
            >
              ⚗️ MIX VIALS
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 text-center pt-1">
              <Info size={12} />
              <span>1 Free Mix Daily • Higher tiers = bigger reward, bigger risk</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── GLOBAL ANIMATIONS ─── */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}

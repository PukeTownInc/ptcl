import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, FlaskConical, RefreshCw, Zap, Shield, AlertTriangle, Check, X, Info } from 'lucide-react';
import type { Screen } from '../types';
import { formatPP } from '../constants';
import { useToast } from './Toast';

// ─── VIAL RARITY DEFINITIONS ───
const VIAL_TIERS = [
  { id: 'common', label: 'Sewer Sludge', emoji: '🟢', bgClass: 'from-green-900/60 to-green-800/40', glowClass: 'shadow-green-500/30', minVal: 10, maxVal: 25, weight: 45, successBonus: 1.00 },
  { id: 'uncommon', label: 'Radioactive Serum', emoji: '🟡', bgClass: 'from-yellow-900/60 to-yellow-800/40', glowClass: 'shadow-yellow-400/40', minVal: 25, maxVal: 60, weight: 28, successBonus: 0.95 },
  { id: 'rare', label: 'Toxic Elixir', emoji: '🟠', bgClass: 'from-orange-900/60 to-orange-800/40', glowClass: 'shadow-orange-500/50', minVal: 60, maxVal: 150, weight: 15, successBonus: 0.85 },
  { id: 'epic', label: 'Contaminated Goo', emoji: '🔴', bgClass: 'from-red-900/60 to-red-800/40', glowClass: 'shadow-red-500/60', minVal: 150, maxVal: 350, weight: 8, successBonus: 0.75 },
  { id: 'legendary', label: 'Pure Radiation', emoji: '💎', bgClass: 'from-cyan-900/70 to-teal-800/50', glowClass: 'shadow-cyan-400/70', minVal: 350, maxVal: 1000, weight: 4, successBonus: 0.60 },
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
  const [canRefresh, setCanRefresh] = useState(true);
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
    const multiplier = 0.85 + Math.random() * 0.5; // 0.85–1.35
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
    if (!canRefresh) return;
    if (!useAd && balancePP < 10) {
      toast.show('⚠️ Need 10 Puke Points or watch an ad to refresh', 'warning');
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
    toast.show('🧪 New vials generated!', 'success');
  };

  // ─── PERFORM THE MIX ───
  const performMix = async () => {
    if (selected.length !== 3) return;
    if (freeClaimedToday && dailyUsed === 0) {
      toast.show('⚠️ Daily free mix already used — refresh for more!', 'warning');
      return;
    }

    setResult('mixing');
    await new Promise(r => setTimeout(r, 1800)); // mixing animation

    const roll = Math.random() * 100;
    const chance = previewData!.successChance;
    const isCritical = Math.random() < 0.05; // 5% chance ×2

    if (roll < chance) {
      let payout = previewData!.estimated;
      if (isCritical) payout *= 2;
      setResult(isCritical ? 'critical' : 'success');
      onEarnPP(payout, 'Vial Mixer');
      toast.show(`✅ ${isCritical ? '⚡ CRITICAL! ' : ''}+${formatPP(payout)} Puke Points!`, 'success');
    } else {
      setResult('fail');
      toast.show('💀 CONTAMINATED — Vials destroyed!', 'error');
    }

    if (!freeClaimedToday) setFreeClaimedToday(true);
    setDailyUsed(p => p + 1);

    // fresh vials after result
    setTimeout(() => {
      setVials(generateVials(6));
      setSelected([]);
      setResult('idle');
    }, 2800);
  };

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="grunge-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <button onClick={() => onNavigate('home')} className="text-toxic-300 hover:text-toxic-100">
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-display font-black text-xl text-toxic-400 neon-text">☢️ VIAL MIXER</h1>
          <div className="text-right text-sm">
            <div className="text-toxic-200">🆓 Daily: {freeClaimedToday ? 'USED' : '✅ FREE'}</div>
          </div>
        </div>
      </div>

      {/* Mixing Chamber */}
      <div className="grunge-panel p-4 space-y-4">
        <h2 className="text-center text-toxic-300 font-bold text-sm">⚗️ MIXING CHAMBER — Select 3 vials</h2>

        {/* Selected Slots */}
        <div className="flex justify-center gap-3 min-h-24 items-center">
          {[0, 1, 2].map(slot => {
            const vial = selected[slot];
            return (
              <div key={slot} className={`w-16 h-20 rounded-lg border-2 border-dashed flex items-center justify-center transition-all ${vial ? `bg-gradient-to-b ${vial.tier.bgClass} border-toxic-400 shadow-lg ${vial.tier.glowClass}` : 'border-toxic-700/50'}`}>
                {vial ? (
                  <div className="text-center">
                    <div className="text-xl">{vial.tier.emoji}</div>
                    <div className="text-xs text-toxic-200 mt-0.5">{formatPP(vial.value)}</div>
                  </div>
                ) : (
                  <span className="text-toxic-700 text-xs">Empty</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Odds Preview */}
        {previewData && result === 'idle' && (
          <div className="text-center space-y-1 py-2 border-y border-toxic-900/40">
            <div className="flex justify-center gap-4 text-sm">
              <span className="text-green-400 flex items-center gap-1"><Check size={14} /> Success: {previewData.successChance}%</span>
              <span className="text-red-400 flex items-center gap-1"><X size={14} /> Contaminate: {previewData.failChance}%</span>
            </div>
            <div className="text-toxic-300 text-sm">💰 Estimated Reward: ~{formatPP(previewData.estimated)} PP</div>
          </div>
        )}

        {/* Result Animation Area */}
        {result !== 'idle' && (
          <div className={`text-center py-3 rounded-lg ${
            result === 'mixing' ? 'bg-yellow-900/30 border border-yellow-500/40' :
            result === 'success' ? 'bg-green-900/30 border border-green-500/40' :
            result === 'critical' ? 'bg-cyan-900/30 border border-cyan-400/50' :
            'bg-red-900/30 border border-red-500/40'
          }`}>
            {result === 'mixing' && <div className="animate-pulse text-yellow-300">⚗️ HEATING & MIXING...</div>}
            {result === 'success' && <div className="text-green-300 font-bold">✅ POTION BREWED SUCCESSFULLY!</div>}
            {result === 'critical' && <div className="text-cyan-300 font-bold">⚡ CRITICAL REACTION — ×2 PAYOUT!</div>}
            {result === 'fail' && <div className="text-red-300 font-bold">💀 CONTAMINATED — Vials destroyed!</div>}
          </div>
        )}

        {/* Vials Grid — Your 6 Vials */}
        <div className="grid grid-cols-3 gap-3">
          {vials.map(vial => {
            const isSel = !!selected.find(v => v.id === vial.id);
            return (
              <button
                key={vial.id}
                onClick={() => toggleVial(vial)}
                disabled={result !== 'idle'}
                className={`p-2 rounded-lg border-2 transition-all bg-gradient-to-b ${vial.tier.bgClass} ${isSel ? 'border-toxic-400 scale-105 shadow-lg ' + vial.tier.glowClass : 'border-transparent hover:border-toxic-600/50'} ${result !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-2xl text-center">{vial.tier.emoji}</div>
                <div className="text-xs text-center text-toxic-100 mt-1">{vial.tier.label}</div>
                <div className="text-xs text-center text-toxic-300 font-mono">{formatPP(vial.value)}</div>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => refreshVials(false)}
            disabled={result !== 'idle'}
            className="grunge-panel p-2 flex items-center justify-center gap-2 text-sm text-toxic-200 hover:text-toxic-100 disabled:opacity-40"
          >
            <RefreshCw size={16} /> New Vials (10 PP)
          </button>
          <button
            onClick={() => refreshVials(true)}
            disabled={result !== 'idle'}
            className="grunge-panel p-2 flex items-center justify-center gap-2 text-sm text-toxic-200 hover:text-toxic-100 disabled:opacity-40"
          >
            <Zap size={16} /> Watch Ad → New Vials
          </button>
        </div>

        <button
          onClick={performMix}
          disabled={selected.length !== 3 || result !== 'idle'}
          className="w-full py-3 rounded-lg font-bold text-lg bg-gradient-to-r from-toxic-700 to-toxic-600 text-white border-2 border-toxic-400/50 hover:border-toxic-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed neon-text"
        >
          ⚗️ BREW THE BATCH
        </button>

        <div className="text-xs text-center text-toxic-400/70 flex items-center justify-center gap-1 mt-1">
          <Info size={12} /> 1 Free Mix Daily • Higher tiers = bigger reward but riskier
        </div>
      </div>
    </div>
  );
}

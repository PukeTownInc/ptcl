export function XPBar({ xp }: { xp: number }) {
  const XP_PER_LEVEL = 1000;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const currentLevelXp = xp % XP_PER_LEVEL;
  const progress = (currentLevelXp / XP_PER_LEVEL) * 100;
  const xpNeeded = XP_PER_LEVEL - currentLevelXp;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs font-mono mb-1">
        <span className="text-toxic-300 font-bold">☢️ Radiation Exposure • Lv.{level}</span>
        <span className="text-toxic-100/60">{currentLevelXp.toLocaleString()} / {XP_PER_LEVEL} XP</span>
      </div>
      <div className="h-3 rounded-full bg-ink-700 border border-toxic-900/50 overflow-hidden relative">
        <div 
          className="h-full bg-gradient-to-r from-toxic-500 to-toxic-300 relative transition-all duration-500"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-white/15 animate-pulse" />
        </div>
      </div>
      <p className="text-[10px] text-toxic-100/40 mt-1 font-mono">
        {xpNeeded.toLocaleString()} XP to next contamination level ☢️
      </p>
    </div>
  );
}

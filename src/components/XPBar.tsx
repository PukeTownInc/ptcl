export function XPBar({ xp }: { xp: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs font-mono mb-1">
        <span className="text-toxic-300 font-bold">☢️ Radiation Exposure</span>
        <span className="text-toxic-100/60">{xp.toLocaleString()}</span>
      </div>
      <div className="h-3 rounded-full bg-ink-700 border border-toxic-900/50 overflow-hidden relative">
        <div className="h-full bg-gradient-to-r from-toxic-500 to-toxic-300 relative">
          <div className="absolute inset-0 bg-white/15 animate-pulse" />
        </div>
      </div>
      <p className="text-[10px] text-toxic-100/40 mt-1 font-mono">
        Exposure accumulates — Battle Pass coming soon ☢️
      </p>
    </div>
  );
}

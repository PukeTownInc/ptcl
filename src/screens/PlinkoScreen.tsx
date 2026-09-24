const playPlinko = useCallback((betPP: number) => {
  let result: { ok: boolean; pocketIndex: number; multiplier: number; payoutPP: number } = {
    ok: false, pocketIndex: 0, multiplier: 0, payoutPP: 0,
  };

  setState((prev) => {
    if (prev.lockedPotPP < betPP) {
      return prev;
    }
    let pos = 3.5;
    for (let row = 0; row < 8; row++) {
      pos += Math.random() < 0.5 ? -0.5 : 0.5;
    }
    const pocketIndex = Math.max(0, Math.min(7, Math.round(pos)));
    const multiplier = PLINKO_MULTIPLIERS[pocketIndex];
    const payoutPP = Math.round(betPP * multiplier);
    const profit = Math.max(0, payoutPP - betPP);

    result = { ok: true, pocketIndex, multiplier, payoutPP };

    return {
      ...prev,
      lockedPotPP: Math.min(prev.lockedPotPP - betPP + payoutPP, 500000),
      totalEarnedPP: prev.totalEarnedPP + profit,
      ppEarnedToday: prev.ppEarnedToday + profit,
    };
  });

  return result;
}, []);

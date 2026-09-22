  const claimRoadmapDailyGift = useCallback(() => {
    const today = todayUTC();
    let accepted = false;
    setState((prev) => {
      // Treat a claim from a previous UTC day as available again. This check
      // must happen inside the state updater so the guard and claim are atomic.
      const alreadyClaimedToday = prev.lastReset === today && prev.missions.roadmapDailyGiftClaimed;
      if (alreadyClaimedToday) return prev;
      accepted = true;
      return {
        ...prev,
        lastReset: today,
        missions: { ...prev.missions, roadmapDailyGiftClaimed: true },
      };
    });
    return accepted;
  }, []);

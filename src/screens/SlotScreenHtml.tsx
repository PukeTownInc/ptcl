import { useCallback, useEffect, useRef } from 'react';
import type { GameState } from '../types';
import type { GameActions } from '../useGameState';
import { getLevel, getLevelProgress } from '../constants';

type SlotMessage =
  | { type: 'PT_FRAME_READY' }
  | { type: 'PT_SPIN_REQUEST'; spinId: string; paid?: boolean }
  | { type: 'PT_REWARD'; eventId: string; pp?: number; spins?: number; xp?: number }
  | { type: 'PT_DAILY_CLAIM'; requestId: string };

type Props = { state: GameState; actions: GameActions };

const MAX_SEEN_EVENTS = 200;

export function SlotScreenHtml({ state, actions }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const seenEvents = useRef(new Set<string>());
  const activeSpin = useRef<string | null>(null);

  const post = useCallback((message: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage(message, window.location.origin);
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent<SlotMessage>) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== 'object' || !('type' in data)) return;

      if (data.type === 'PT_FRAME_READY') {
        post({
          type: 'PT_INIT',
          balance: state.spinsRemaining,
          dailyClaimed: state.freeSpinsClaimed,
          xp: state.xp,
          level: getLevel(state.xp),
          levelProgress: getLevelProgress(state.xp),
        });
        return;
      }

      if (data.type === 'PT_SPIN_REQUEST') {
        if (!data.spinId || activeSpin.current === data.spinId) return;
        if (activeSpin.current) return;
        if (data.paid !== false && state.spinsRemaining <= 0) {
          post({ type: 'PT_SPIN_DENIED', spinId: data.spinId, reason: 'NO_SPINS' });
          return;
        }
        activeSpin.current = data.spinId;
        if (data.paid !== false) actions.recordSpin();
        return;
      }

      if (data.type === 'PT_REWARD') {
        if (!data.eventId || seenEvents.current.has(data.eventId)) return;
        seenEvents.current.add(data.eventId);
        if (seenEvents.current.size > MAX_SEEN_EVENTS) {
          const oldest = seenEvents.current.values().next().value;
          if (oldest) seenEvents.current.delete(oldest);
        }
        const pp = Number.isFinite(data.pp) ? Math.max(0, Math.floor(data.pp ?? 0)) : 0;
        const spins = Number.isFinite(data.spins) ? Math.max(0, Math.floor(data.spins ?? 0)) : 0;
        const xp = Number.isFinite(data.xp) ? Math.max(0, Math.floor(data.xp ?? 0)) : 0;
        if (pp) actions.addPP(pp);
        if (spins) actions.addSpins(spins);
        if (xp) actions.addXP(xp, false);
        return;
      }

      if (data.type === 'PT_DAILY_CLAIM') {
        actions.claimDailyBonusSpins();
        post({ type: 'PT_DAILY_STATE', claimed: true });
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [actions, post, state.spinsRemaining, state.freeSpinsClaimed, state.xp]);

  useEffect(() => {
    post({
      type: 'PT_BALANCE',
      balance: state.spinsRemaining,
      dailyClaimed: state.freeSpinsClaimed,
      xp: state.xp,
      level: getLevel(state.xp),
      levelProgress: getLevelProgress(state.xp),
    });
  }, [post, state.spinsRemaining, state.freeSpinsClaimed, state.xp]);

  return (
    <div className="w-full">
      <iframe
        ref={frameRef}
        title="Puke Town Cash Lab Slots"
        src="/SlotsScreen.html"
        className="w-full border-0"
        style={{ minHeight: '900px', height: 'calc(100dvh - 120px)' }}
        allow="autoplay"
      />
    </div>
  );
}

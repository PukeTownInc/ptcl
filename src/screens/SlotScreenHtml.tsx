import { useCallback, useEffect, useRef } from 'react';
import type { GameState } from '../types';
import type { GameActions } from '../useGameState';
import { getLevel, getLevelProgress } from '../constants';

type SlotMessage =
  | { type: 'PT_FRAME_READY' }
  | { type: 'PT_SPIN_REQUEST'; spinId: string; paid?: boolean }
  | { type: 'PT_SPIN_COMPLETE'; spinId: string }
  | { type: 'PT_SPIN_ERROR'; spinId: string; reason?: string }
  | { type: 'PT_REWARD'; eventId: string; pp?: number; spins?: number; xp?: number }
  | { type: 'PT_DAILY_CLAIM'; requestId: string };

type Props = { state: GameState; actions: GameActions };

const MAX_SEEN_EVENTS = 200;

export function SlotScreenHtml({ state, actions }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const stateRef = useRef(state);
  const actionsRef = useRef(actions);
  const seenEvents = useRef(new Set<string>());
  const activeSpin = useRef<string | null>(null);

  stateRef.current = state;
  actionsRef.current = actions;

  const post = useCallback((message: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage(message, window.location.origin);
  }, []);

  const sendBalance = useCallback(() => {
    const latest = stateRef.current;
    post({
      type: 'PT_BALANCE',
      balance: latest.spinsRemaining,
      dailyClaimed: latest.freeSpinsClaimed,
      xp: latest.xp,
      level: getLevel(latest.xp),
      levelProgress: getLevelProgress(latest.xp),
    });
  }, [post]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<SlotMessage>) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== 'object' || !('type' in data)) return;

      if (data.type === 'PT_FRAME_READY') {
        sendBalance();
        post({ type: 'PT_INIT', ...(() => {
          const latest = stateRef.current;
          return {
            balance: latest.spinsRemaining,
            dailyClaimed: latest.freeSpinsClaimed,
            xp: latest.xp,
            level: getLevel(latest.xp),
            levelProgress: getLevelProgress(latest.xp),
          };
        })() });
        return;
      }

      if (data.type === 'PT_SPIN_REQUEST') {
        if (!data.spinId || activeSpin.current === data.spinId) return;
        if (activeSpin.current) {
          post({ type: 'PT_SPIN_DENIED', spinId: data.spinId, reason: 'SPIN_IN_PROGRESS' });
          return;
        }
        const paid = data.paid !== false;
        if (paid && stateRef.current.spinsRemaining <= 0) {
          post({ type: 'PT_SPIN_DENIED', spinId: data.spinId, reason: 'NO_SPINS' });
          sendBalance();
          return;
        }
        activeSpin.current = data.spinId;
        if (paid) actionsRef.current.recordSpin();
        post({ type: 'PT_SPIN_ACCEPTED', spinId: data.spinId });
        return;
      }

      if (data.type === 'PT_SPIN_COMPLETE' || data.type === 'PT_SPIN_ERROR') {
        if (activeSpin.current === data.spinId) activeSpin.current = null;
        sendBalance();
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
        if (pp) actionsRef.current.addPP(pp);
        if (spins) actionsRef.current.addSpins(spins);
        if (xp) actionsRef.current.addXP(xp, false);
        post({ type: 'PT_REWARD_ACK', eventId: data.eventId });
        return;
      }

      if (data.type === 'PT_DAILY_CLAIM') {
        const latest = stateRef.current;
        if (latest.freeSpinsClaimed) {
          post({ type: 'PT_DAILY_STATE', requestId: data.requestId, claimed: true, accepted: false });
        } else {
          actionsRef.current.claimDailyBonusSpins();
          post({ type: 'PT_DAILY_STATE', requestId: data.requestId, claimed: true, accepted: true });
        }
        return;
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [post, sendBalance]);

  useEffect(() => {
    sendBalance();
  }, [sendBalance, state.spinsRemaining, state.freeSpinsClaimed, state.xp]);

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

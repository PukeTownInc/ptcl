import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState, SpinResult, SymbolId } from '../types';
import { SYMBOLS, formatPP } from '../constants';
import * as engine from '../slotEngine';
import type { GameActions } from '../useGameState';
import { isHotStreakActive, isPotAccelActive } from '../useGameState';
import { useToast } from '../components/Toast';
import { AdModal } from '../components/AdModal';
import { SpinWheelModal, type WheelResult } from '../components/SpinWheelModal';

type FrameMessage =
  | { type: 'PT_SPIN' }
  | { type: 'PT_WATCH_AD' }
  | { type: 'PT_AUTO'; enabled: boolean }
  | { type: 'PT_DAILY_CLAIM' }
  | { type: 'PT_HISTORY' }
  | { type: 'PT_PAYTABLE' };

const BRIDGE = `
(() => {
  const send = (message) => parent.postMessage(message, '*');
  const overlay = document.getElementById('reelOverlay');
  const spinButton = document.getElementById('spin');
  const art = document.getElementById('spinArtwork');
  const $ = (id) => document.getElementById(id);
  let symbols = {};
  let spinningTimer = null;
  let auto = false;
  let turbo = false;
  let balance = 0;
  let history = [];
  const makeCell = (id, win) => {
    const meta = symbols[id] || {};
    const cell = document.createElement('div');
    cell.className = 'symbol' + (win ? ' win' : '');
    if (meta.image) {
      const img = document.createElement('img');
      img.className = 'symbolAsset';
      img.alt = meta.label || id;
      img.src = meta.image;
      cell.appendChild(img);
    } else {
      cell.textContent = meta.emoji || '☣';
    }
    return cell;
  };
  function draw(grid, wins) {
    if (!overlay) return;
    overlay.innerHTML = '';
    const won = new Set((wins || []).flatMap(w => w.positions || []).map(p => p[0] + '-' + p[1]));
    for (let c = 0; c < 5; c++) {
      const col = document.createElement('div');
      col.className = 'reelCol';
      for (let r = 0; r < 3; r++) col.appendChild(makeCell(grid[c][r], won.has(c + '-' + r)));
      overlay.appendChild(col);
    }
    overlay.classList.add('active');
  }
  function cosmeticSpin() {
    const ids = Object.keys(symbols);
    const grid = Array.from({length:5}, () => Array.from({length:3}, () => ids[Math.floor(Math.random()*ids.length)]));
    draw(grid, []);
    overlay.classList.add('spinning');
  }
  function finish(result) {
    if (spinningTimer) clearInterval(spinningTimer);
    spinningTimer = null;
    overlay.classList.remove('spinning');
    draw(result.grid, result.wins);
    const readout = $('status');
    if (readout) {
      readout.textContent = result.totalPP > 0 ? '+' + result.totalPP.toLocaleString() + ' Puke Points' : 'NO WIN — TRY AGAIN';
      readout.classList.add('show');
      clearTimeout(readout._timer);
      readout._timer = setTimeout(() => readout.classList.remove('show'), 3000);
    }
    history.unshift({ pp: result.totalPP, grid: result.grid });
    history = history.slice(0, 20);
    $('spin').disabled = false;
  }
  function openModal(title, body) {
    $('modalTitle').textContent = title;
    $('modalBody').innerHTML = body;
    $('modalShade').classList.add('open');
    $('modalReset').style.display = 'none';
  }
  function closeModal() { $('modalShade').classList.remove('open'); }
  spinButton?.addEventListener('click', () => send({type:'PT_SPIN'}));
  $('watchAdSpins')?.addEventListener('click', () => send({type:'PT_WATCH_AD'}));
  $('autoSpinToggle')?.addEventListener('click', () => {
    auto = !auto;
    $('autoSpinToggle').textContent = 'AUTO SPIN: ' + (auto ? 'ON' : 'OFF');
    $('autoSpinToggle').setAttribute('aria-pressed', String(auto));
    send({type:'PT_AUTO', enabled:auto});
  });
  $('toggleTurbo')?.addEventListener('click', () => {
    turbo = !turbo;
    $('toggleTurbo').setAttribute('aria-pressed', String(turbo));
  });
  $('claimReward')?.addEventListener('click', () => send({type:'PT_DAILY_CLAIM'}));
  $('historyBtn')?.addEventListener('click', () => {
    const rows = history.length ? history.map((h,i) => '<p>Spin ' + (i+1) + ': +' + h.pp.toLocaleString() + ' PP</p>').join('') : '<p>No spins recorded yet.</p>';
    openModal('SPIN HISTORY', rows);
  });
  $('paytable')?.addEventListener('click', () => send({type:'PT_PAYTABLE'}));
  $('modalClose')?.addEventListener('click', closeModal);
  $('modalShade')?.addEventListener('click', e => { if (e.target === $('modalShade')) closeModal(); });
  $('closeAdModal')?.addEventListener('click', () => $('adRewardModal').style.display='none');
  $('completeDemoAd')?.addEventListener('click', () => $('adRewardModal').style.display='none');
  ['betDown','betUp','freeSpin','autoDown','autoUp'].forEach(id => $(id)?.remove());
  $('betReadout')?.remove();
  $('freeSpinsReadout')?.remove();
  $('poolReadout')?.remove();
  $('modalReset')?.remove();
  document.querySelector('.bottomNote')?.remove();
  document.querySelector('.status')?.setAttribute('aria-live','polite');
  window.addEventListener('message', event => {
    const m = event.data || {};
    if (m.type === 'PT_INIT') {
      symbols = m.symbols || {};
      balance = m.balance || 0;
      if (m.initialGrid) draw(m.initialGrid, []);
      $('autoReadout').textContent = '—';
      $('claimReward').style.opacity = m.dailyClaimed ? '.35' : '1';
      $('claimReward').disabled = !!m.dailyClaimed;
    }
    if (m.type === 'PT_BALANCE') balance = m.balance;
    if (m.type === 'PT_SPIN_START') {
      spinButton.disabled = true;
      art?.classList.remove('is-pressed');
      if (spinningTimer) clearInterval(spinningTimer);
      cosmeticSpin();
      spinningTimer = setInterval(cosmeticSpin, m.turbo ? 55 : 90);
    }
    if (m.type === 'PT_SPIN_RESULT') finish(m.result);
    if (m.type === 'PT_SPIN_ERROR') spinButton.disabled = false;
    if (m.type === 'PT_AUTO_STATE') {
      auto = !!m.enabled;
      $('autoSpinToggle').textContent = 'AUTO SPIN: ' + (auto ? 'ON' : 'OFF');
      $('autoSpinToggle').setAttribute('aria-pressed', String(auto));
    }
    if (m.type === 'PT_DAILY_STATE') {
      $('claimReward').style.opacity = m.claimed ? '.35' : '1';
      $('claimReward').disabled = !!m.claimed;
    }
    if (m.type === 'PT_PAYTABLE') {
      const rows = m.rows.map(s => '<div class="payRow"><b>' + s.label + '</b><span>' + s.pays[0] + '</span><span>' + s.pays[1] + '</span><span>' + s.pays[2] + '</span></div>').join('');
      openModal('TOXIC PAY TABLE', '<div class="paytableList">' + rows + '</div><p>Match 3, 4 or 5 symbols across consecutive reels.</p>');
    }
    if (m.type === 'PT_AD_MODAL') $('adRewardModal').style.display = 'flex';
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && spinningTimer) { clearInterval(spinningTimer); spinningTimer=null; } });
  window.addEventListener('beforeunload', () => { if (spinningTimer) clearInterval(spinningTimer); });
  if (spinButton && art) {
    const down = () => art.classList.add('is-pressed');
    const up = () => art.classList.remove('is-pressed');
    spinButton.addEventListener('pointerdown', down);
    ['pointerup','pointercancel','pointerleave','blur'].forEach(e => spinButton.addEventListener(e, up));
  }
  send({type:'PT_FRAME_READY'});
})();
`;

export function SlotScreen({ state, actions }: { state: GameState; actions: GameActions }) {
  const toast = useToast();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [adModal, setAdModal] = useState(false);
  const [showDoubleUp, setShowDoubleUp] = useState(false);
  const doubleUpResolvedRef = useRef(false);
  const [pendingDoubleUp, setPendingDoubleUp] = useState(0);
  const autoRef = useRef(false);
  const latestState = useRef(state);
  latestState.current = state;
  const latestActions = useRef(actions);
  latestActions.current = actions;

  const symbolMeta = useMemo(() => Object.fromEntries(
    Object.values(SYMBOLS).map(s => [s.id, { label: s.label, emoji: s.emoji, image: s.image }])
  ), []);

  const post = useCallback((message: object) => {
    frameRef.current?.contentWindow?.postMessage(message, '*');
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/SlotsScreen.html')
      .then(response => {
        if (!response.ok) throw new Error('Could not load Cash Lab HTML');
        return response.text();
      })
      .then(source => {
        if (cancelled) return;
        const doc = new DOMParser().parseFromString(source, 'text/html');
        doc.querySelectorAll('script').forEach(script => script.remove());
        doc.querySelector('base')?.remove();
        const base = doc.createElement('base');
        base.href = window.location.origin + '/';
        doc.head.prepend(base);
        const bridge = doc.createElement('script');
        bridge.textContent = BRIDGE;
        doc.body.appendChild(bridge);
        setHtml('<!DOCTYPE html>' + doc.documentElement.outerHTML);
      })
      .catch(error => {
        console.error(error);
        toast('error', 'Cash Lab unavailable', 'The original slot screen could not be loaded.');
      });
    return () => { cancelled = true; };
  }, [toast]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const message = event.data as FrameMessage | { type: string; enabled?: boolean };
      if (message.type === 'PT_FRAME_READY') {
        post({
          type: 'PT_INIT',
          symbols: symbolMeta,
          balance: latestState.current.spinsRemaining,
          dailyClaimed: latestState.current.freeSpinsClaimed,
          initialGrid: Array.from({length:5}, () => engine.randomReelStrip(3)),
        });
      } else if (message.type === 'PT_SPIN') {
        doSpinRef.current();
      } else if (message.type === 'PT_WATCH_AD') {
        setAdModal(true);
      } else if (message.type === 'PT_AUTO') {
        const enabled = !!message.enabled;
        autoRef.current = enabled;
        setAutoSpin(enabled);
      } else if (message.type === 'PT_DAILY_CLAIM') {
        if (latestState.current.freeSpinsClaimed) {
          toast('info', 'Daily spins already claimed', 'Return after the daily reset.');
        } else {
          latestActions.current.claimDailyBonusSpins();
          post({type:'PT_DAILY_STATE', claimed:true});
          toast('success', 'Daily spins claimed', 'Your spins were added to the shared balance.');
        }
      } else if (message.type === 'PT_PAYTABLE') {
        post({type:'PT_PAYTABLE', rows:Object.values(SYMBOLS).filter(s => !s.special).map(s => ({label:s.label,pays:s.pays}))});
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [post, toast]);

  useEffect(() => {
    post({type:'PT_BALANCE', balance:state.spinsRemaining});
    post({type:'PT_DAILY_STATE', claimed:state.freeSpinsClaimed});
  }, [state.spinsRemaining, state.freeSpinsClaimed, post]);

  const finishSpin = useCallback((result: SpinResult) => {
    setSpinning(false);
    let finalPP = result.totalPP;
    if (isPotAccelActive(latestState.current)) finalPP *= 2;
    if (isHotStreakActive(latestState.current)) finalPP = Math.floor(finalPP * 1.5);
    if (finalPP > 0) {
      if (finalPP >= 10) {
        doubleUpResolvedRef.current = false;
        setPendingDoubleUp(finalPP);
        latestActions.current.setDoubleUpPending(finalPP);
        setShowDoubleUp(true);
      } else latestActions.current.addPP(finalPP);
    }
    latestActions.current.addXP(1, false);
    latestActions.current.recordSpin();
    if (result.freeSpinsAwarded > 0) {
      latestActions.current.addSpins(result.freeSpinsAwarded);
      toast('success', `${result.freeSpinsAwarded} spins awarded`, 'Scatter reward added to your shared spin balance.');
    }
    if (result.jackpot) {
      latestActions.current.recordJackpot();
      toast('success', `${result.jackpot.type.toUpperCase()} JACKPOT`, `+${formatPP(result.jackpot.amount)} Puke Points`);
    }
    post({type:'PT_SPIN_RESULT', result:{...result, totalPP:finalPP}});
    if (autoRef.current && latestState.current.spinsRemaining > 1 && !result.jackpot && finalPP < 10) {
      window.setTimeout(() => { if (autoRef.current) doSpinRef.current(); }, turbo ? 500 : 900);
    }
  }, [post, toast, turbo]);

  const doSpinRef = useRef<() => void>(() => undefined);
  const doSpin = useCallback(() => {
    if (spinning) return;
    if (latestState.current.spinsRemaining <= 0) {
      autoRef.current = false;
      setAutoSpin(false);
      post({type:'PT_AUTO_STATE', enabled:false});
      toast('error', 'No spins remaining', 'Claim a reward to add spins to your shared balance.');
      post({type:'PT_SPIN_ERROR'});
      return;
    }
    setSpinning(true);
    const result = engine.spin();
    post({type:'PT_SPIN_START', turbo});
    window.setTimeout(() => finishSpin(result), turbo ? 1500 : 2600);
  }, [spinning, post, toast, turbo, finishSpin]);
  doSpinRef.current = doSpin;

  const completeAd = useCallback(() => {
    const awarded = latestActions.current.openMysteryPack();
    latestActions.current.watchAd();
    setAdModal(false);
    toast('success', 'SPINS AWARDED', `+${awarded} spins added to your shared balance.`);
  }, [toast]);

  const handleWheel = useCallback((result: WheelResult) => {
    if (doubleUpResolvedRef.current) return;
    doubleUpResolvedRef.current = true;
    setShowDoubleUp(false);
    latestActions.current.useDoubleUp();
    if (result.outcome === 'double' || result.outcome === 'safe' || result.outcome === 'half') {
      latestActions.current.addPP(result.amount);
      toast('success', 'REWARD SECURED', `+${formatPP(result.amount)} Puke Points`);
    } else toast('error', 'SPILLED', 'No Puke Points returned.');
  }, [toast]);

  return (
    <div className="w-full space-y-3">
      <div className="w-full mx-auto overflow-hidden" style={{maxWidth:941, aspectRatio:'941 / 1576'}}>
        {html ? (
          <iframe
            ref={frameRef}
            title="Puke Town Cash Lab Slots"
            srcDoc={html}
            className="block w-full h-full border-0"
            style={{width:'100%',height:'100%',background:'#020503'}}
            allow="autoplay"
          />
        ) : <div className="w-full h-full flex items-center justify-center text-toxic-300">Loading Cash Lab…</div>}
      </div>
      <div className="sr-only" aria-live="polite">Shared spins remaining: {state.spinsRemaining}</div>
      {showDoubleUp && pendingDoubleUp > 0 && (
        <SpinWheelModal
          stake={pendingDoubleUp}
          onWatchAd={() => setAdModal(true)}
          onClaim={handleWheel}
          onLose={() => handleWheel({outcome:'lose',amount:0})}
          onForfeit={() => { setShowDoubleUp(false); latestActions.current.useDoubleUp(); }}
        />
      )}
      <AdModal
        open={adModal}
        onClose={() => setAdModal(false)}
        onComplete={completeAd}
        title="WATCH AD"
        subtitle="Complete the rewarded ad to receive 15–25 spins."
        reward="15–25 spins"
      />
    </div>
  );
}

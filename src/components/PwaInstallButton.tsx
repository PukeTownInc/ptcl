import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        alert('INSTALLED! Puke Town Cash Lab is now on your home screen!');
      } else {
        alert('Install cancelled — tap again anytime to add!');
      }
      setDeferredPrompt(null);
      return;
    }

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);

    if (isIOS) {
      alert(
        'How to install (iPhone/iPad):\n\n' +
        '1. Tap the Share icon at the bottom\n' +
        '2. Scroll down and tap "Add to Home Screen"\n' +
        '3. Tap "Add" — Done!'
      );
    } else {
      alert(
        'Install not available in this browser:\n\n' +
        'Android: Tap menu → "Install app"\n' +
        'Or: Add to Home Screen via browser menu'
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-2 pt-1">
      <button
        onClick={handleClick}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-[15px] font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98] border-2 border-green-300"
        style={{
          background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
          boxShadow: '0 0 15px rgba(34, 197, 94, 0.4)',
        }}
      >
        INSTALL PUKE TOWN CASH LAB
        <span className="text-[13px] font-normal opacity-85 ml-1.5">— App Mode</span>
      </button>
    </div>
  );
}

import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

const ToastContext = createContext<(type: ToastType, title: string, message?: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3500);
  }, []);

  const remove = (id: string) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-[92%] max-w-sm safe-top">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="grunge-panel neon-border px-4 py-3 flex items-start gap-3 animate-slide-up"
          >
            {t.type === 'success' && <CheckCircle2 size={20} className="text-toxic-400 shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertTriangle size={20} className="text-hazard-red shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info size={20} className="text-radioactive-400 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm text-toxic-200">{t.title}</p>
              {t.message && <p className="text-xs text-toxic-100/60 mt-0.5">{t.message}</p>}
            </div>
            <button onClick={() => remove(t.id)} className="text-toxic-200/40 hover:text-toxic-400">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

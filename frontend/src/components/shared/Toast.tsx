import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import './Toast.css';

type ToastKind = 'success' | 'error' | 'warning' | 'info';

interface ToastEntry {
  id: string;
  kind: ToastKind;
  message: string;
  exiting?: boolean;
}

export interface ToastOptions {
  kind: ToastKind;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS: Record<ToastKind, React.ComponentType<{ size?: number; className?: string }>> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const EXIT_MS = 300;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, exiting: true } : t)));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), EXIT_MS);
  }, []);

  const addToast = useCallback((options: ToastOptions): string => {
    const id = `toast-${++counter.current}`;
    const duration = options.duration ?? 4500;
    setToasts(prev => [...prev, { id, kind: options.kind, message: options.message }]);
    timers.current.set(id, setTimeout(() => dismiss(id), duration));
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast: addToast, dismiss }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(t => {
            const Icon = ICONS[t.kind];
            return (
              <div key={t.id} className={`toast toast--${t.kind} ${t.exiting ? 'toast--exiting' : 'toast--entering'}`}>
                <Icon size={18} className="toast__icon" />
                <div className="toast__body">
                  <div className="toast__message">{t.message}</div>
                </div>
                <button className="toast__close" onClick={() => dismiss(t.id)} type="button">
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

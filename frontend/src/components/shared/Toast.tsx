import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { animate, createScope, utils, spring } from 'animejs';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
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
  const prefersReduced = usePrefersReducedMotion();
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const exitTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const toastRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animatedIds = useRef<Set<string>>(new Set());
  const counter = useRef(0);

  // Create scope for the toast container (re-create when it mounts/unmounts)
  const hasToasts = toasts.length > 0;
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scope = createScope({ root: container });
    scopeRef.current = scope;

    return () => {
      scope.revert();
      scopeRef.current = null;
    };
  }, [hasToasts]);

  // Animate entering toasts
  useEffect(() => {
    toasts.forEach((t) => {
      if (t.exiting || animatedIds.current.has(t.id)) return;
      const el = toastRefs.current.get(t.id);
      if (!el) return;

      animatedIds.current.add(t.id);

      if (prefersReduced) {
        utils.set(el, { opacity: 1, scale: 1, translateY: 0 });
        return;
      }

      utils.set(el, { opacity: 0, scale: 0.9, translateY: 16, willChange: 'opacity, transform' });
      animate(el, {
        opacity: [0, 1],
        scale: [0.9, 1],
        translateY: [16, 0],
        duration: 400,
        ease: spring({ stiffness: 300, damping: 18 }),
      });
    });
  }, [toasts]);

  const dismiss = useCallback((id: string) => {
    const el = toastRefs.current.get(id);

    if (prefersReduced || !el) {
      setToasts(prev => prev.filter(t => t.id !== id));
    } else {
      // Mark as exiting and animate out
      setToasts(prev => prev.map(t => (t.id === id ? { ...t, exiting: true } : t)));
      animate(el, {
        opacity: [1, 0],
        scale: [1, 0.92],
        translateY: [0, 12],
        duration: 250,
        ease: 'in(3)',
        onComplete: () => {
          setToasts(prev => prev.filter(t => t.id !== id));
          toastRefs.current.delete(id);
          animatedIds.current.delete(id);
          // Clear the safety fallback timer since onComplete fired
          const exitTimer = exitTimers.current.get(id);
          if (exitTimer) { clearTimeout(exitTimer); exitTimers.current.delete(id); }
        },
      });
    }

    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    const exitTimer = setTimeout(() => {
      // Safety fallback in case animation doesn't fire onComplete
      setToasts(prev => prev.filter(t => t.id !== id));
      toastRefs.current.delete(id);
      animatedIds.current.delete(id);
    }, EXIT_MS + 100);
    exitTimers.current.set(id, exitTimer);
  }, [prefersReduced]);

  const addToast = useCallback((options: ToastOptions): string => {
    const id = `toast-${++counter.current}`;
    const duration = options.duration ?? 4500;
    setToasts(prev => [...prev, { id, kind: options.kind, message: options.message }]);
    timers.current.set(id, setTimeout(() => dismiss(id), duration));
    return id;
  }, [dismiss]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      for (const t of timers.current.values()) clearTimeout(t);
      for (const t of exitTimers.current.values()) clearTimeout(t);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast, dismiss }}>
      {children}
      {toasts.length > 0 && (
        <div ref={containerRef} className="toast-container">
          {toasts.map(t => {
            const Icon = ICONS[t.kind];
            return (
              <div
                key={t.id}
                ref={(el) => {
                  if (el) toastRefs.current.set(t.id, el);
                  else toastRefs.current.delete(t.id);
                }}
                className={`toast toast--${t.kind}`}
              >
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

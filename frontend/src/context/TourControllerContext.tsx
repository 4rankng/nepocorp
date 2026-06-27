// TourControllerContext — the tour "engine": holds the active tour + current
// step, drives each step's directive via `sendAndWait` (the async directive
// entrypoint), and persists progress to localStorage. The TourController
// component renders the persistent chrome from this state.
//
// State machine: start (resets to step 0, or a resume step) → next/prev →
// complete (last step or "Xong") / skip ("Bỏ qua"). start() replaces any active
// tour (concurrent-tour guard). The tourActive singleton flag (agentHighlight)
// is set on start and cleared on end, so the chat directive path suppresses its
// own spotlight while a tour owns it.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { TOUR_CATALOG, TOUR_IDS, Role, type Tour, type TourId } from '@tingting/shared';
import { useAgentDirectives } from './AgentDirectiveContext';
import { useAuth } from '../hooks/useAuth';
import { setTourActive } from '../lib/agentHighlight';
import {
  getInProgressStep,
  markTourStep,
  markTourCompleted,
  clearTourProgress,
} from '../lib/tourProgress';

export interface TourControllerValue {
  tour: Tour | null;
  currentStep: number;
  /** True when the current step's spotlight target never mounted (graceful
   *  degradation note shown; the tour still advances). */
  highlightMissed: boolean;
  /** A tour left in_progress before a refresh whose role still applies. */
  resumable: Tour | null;
  start: (tourId: string, resumeStep?: number) => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  complete: () => void;
  dismissResume: () => void;
}

const TourControllerContext = createContext<TourControllerValue | null>(null);

export function useTourController(): TourControllerValue {
  const ctx = useContext(TourControllerContext);
  if (!ctx) throw new Error('useTourController must be used within TourControllerProvider');
  return ctx;
}

export function TourControllerProvider({ children }: { children: ReactNode }) {
  const { sendAndWait } = useAgentDirectives();
  const { user } = useAuth();
  const [tour, setTour] = useState<Tour | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightMissed, setHighlightMissed] = useState(false);
  const [resumable, setResumable] = useState<Tour | null>(null);

  const roleOk = useCallback(
    // No known user (still loading / logged out) → refuse rather than default-allow:
    // a curated tour must never start without a confirmed role.
    (t: Tour) => (user ? (t.roles as readonly Role[]).includes(user.role) : false),
    [user],
  );

  // Resume-on-refresh: on mount (once the user is known), surface a tour left
  // in_progress whose role still applies. The TourController shows "Tiếp tục?".
  useEffect(() => {
    if (!user) return;
    for (const id of TOUR_IDS) {
      const t = TOUR_CATALOG[id];
      if (getInProgressStep(id) !== null && (t.roles as readonly Role[]).includes(user.role)) {
        setResumable(t);
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

  // Drive the current step's directive whenever the step changes. Awaits the
  // target mounting so the spotlight lands; surfaces a graceful-degradation note
  // when it never appeared. Pure-text steps (no directive) just render.
  useEffect(() => {
    if (!tour) return;
    markTourStep(tour.id, currentStep);
    const step = tour.steps[currentStep];
    if (!step?.directive) {
      setHighlightMissed(false);
      return;
    }
    let cancelled = false;
    void sendAndWait(step.directive).then((outcome) => {
      if (!cancelled) setHighlightMissed(outcome.reason === 'highlight-missed');
    });
    return () => {
      cancelled = true;
    };
  }, [tour, currentStep, sendAndWait]);

  const start = useCallback(
    (tourId: string, resumeStep?: number) => {
      const t = TOUR_CATALOG[tourId as TourId];
      if (!t || !roleOk(t)) return;
      // Replacing another active tour, or leaving a stale in_progress record
      // from a dismissed resume prompt: clear every OTHER tour's in_progress
      // record so the resume-on-refresh scan can't resurrect a tour we just
      // left. Only the tour we're starting may keep its progress.
      for (const id of TOUR_IDS) {
        if (id !== t.id && getInProgressStep(id) !== null) clearTourProgress(id);
      }
      setResumable(null);
      setHighlightMissed(false);
      setTour(t);
      setCurrentStep(Math.max(0, Math.min(resumeStep ?? 0, t.steps.length - 1)));
      setTourActive(true);
    },
    [roleOk],
  );

  const next = useCallback(() => {
    if (!tour) return;
    if (currentStep >= tour.steps.length - 1) {
      markTourCompleted(tour.id);
      setTourActive(false);
      setTour(null);
      return;
    }
    setCurrentStep(currentStep + 1);
  }, [tour, currentStep]);

  const prev = useCallback(() => {
    if (!tour || currentStep === 0) return;
    setCurrentStep(currentStep - 1);
  }, [tour, currentStep]);

  const end = useCallback(
    (completed: boolean) => {
      if (!tour) return;
      if (completed) markTourCompleted(tour.id);
      else clearTourProgress(tour.id);
      setTourActive(false);
      setTour(null);
      setHighlightMissed(false);
    },
    [tour],
  );

  const skip = useCallback(() => end(false), [end]);
  const complete = useCallback(() => end(true), [end]);
  const dismissResume = useCallback(() => setResumable(null), []);

  const value: TourControllerValue = {
    tour,
    currentStep,
    highlightMissed,
    resumable,
    start,
    next,
    prev,
    skip,
    complete,
    dismissResume,
  };

  return (
    <TourControllerContext.Provider value={value}>{children}</TourControllerContext.Provider>
  );
}

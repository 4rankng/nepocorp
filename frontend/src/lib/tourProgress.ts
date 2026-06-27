// tourProgress — per-browser tour completion/resume state (v1: localStorage).
//
// Schema-versioned so a future server-side migration (users.preferences JSONB)
// can import it cleanly. Multi-device-unsafe by design — on-demand tours never
// nag, so a fresh browser simply doesn't know about completion elsewhere, which
// is the intended v1 trade-off (see the plan's WS-E).
const SCHEMA_VERSION = 1 as const;
const KEY_PREFIX = 'tingting:tour:v1:';

interface ProgressRecord {
  schema: 1;
  status: 'in_progress' | 'completed';
  currentStep: number;
  updatedAt: number;
}

function key(tourId: string): string {
  return `${KEY_PREFIX}${tourId}`;
}

function read(tourId: string): ProgressRecord | null {
  try {
    const raw = localStorage.getItem(key(tourId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProgressRecord>;
    if (parsed.schema !== SCHEMA_VERSION) return null;
    if (parsed.status !== 'in_progress' && parsed.status !== 'completed') return null;
    return {
      schema: 1,
      status: parsed.status,
      currentStep: typeof parsed.currentStep === 'number' ? parsed.currentStep : 0,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

function write(tourId: string, record: ProgressRecord): void {
  try {
    localStorage.setItem(key(tourId), JSON.stringify(record));
  } catch {
    // localStorage may be unavailable (private mode) — progress is best-effort.
  }
}

export function isTourCompleted(tourId: string): boolean {
  return read(tourId)?.status === 'completed';
}

/** Step index of an in-progress tour, or null when none/already completed. */
export function getInProgressStep(tourId: string): number | null {
  const rec = read(tourId);
  return rec?.status === 'in_progress' ? rec.currentStep : null;
}

export function markTourStep(tourId: string, currentStep: number): void {
  write(tourId, { schema: 1, status: 'in_progress', currentStep, updatedAt: Date.now() });
}

export function markTourCompleted(tourId: string): void {
  write(tourId, { schema: 1, status: 'completed', currentStep: 0, updatedAt: Date.now() });
}

export function clearTourProgress(tourId: string): void {
  try {
    localStorage.removeItem(key(tourId));
  } catch {
    // ignore
  }
}

// agentHighlight — imperative scroll-to + Driver.js spotlight used by the agent
// directive bridge (focus / scrollTo / navigate.highlight). Extracted from
// useFocusDeepLink so the bridge can call it outside the URL `?focus=` flow.
import { driver, type Driver } from 'driver.js';

let activeDriver: Driver | null = null;
let activeTimer: number | null = null;

function clearActiveDriver() {
  if (activeTimer !== null) {
    window.clearTimeout(activeTimer);
    activeTimer = null;
  }
  activeDriver?.destroy();
  activeDriver = null;
}

// Returns true when an element with `targetId` was found (and therefore
// scrolled + spotlight-highlighted); false lets the caller report an honest ack.
export function highlightElement(targetId: string, durationMs = 2000): boolean {
  const el = document.getElementById(targetId);
  if (!el) return false;

  clearActiveDriver();

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  activeDriver = driver({
    animate: true,
    duration: 400,
    smoothScroll: true,
    allowClose: true,
    allowScroll: true,
    overlayColor: '#0f172a',
    overlayOpacity: 0.55,
    stagePadding: 8,
    stageRadius: 10,
    popoverClass: 'agent-driver-popover',
    showButtons: ['close'],
    doneBtnText: 'Đã hiểu',
    onDestroyed: () => {
      activeDriver = null;
      if (activeTimer !== null) {
        window.clearTimeout(activeTimer);
        activeTimer = null;
      }
    },
  });

  activeDriver.highlight({
    element: el,
    popover: {
      title: 'Hướng dẫn',
      description: 'Bấm vào vùng đang được tô sáng để tiếp tục.',
      side: 'bottom',
      align: 'center',
      showButtons: ['close'],
      doneBtnText: 'Đã hiểu',
    },
  });

  activeTimer = window.setTimeout(() => {
    clearActiveDriver();
  }, durationMs);

  return true;
}

// ── Tour-active guard ───────────────────────────────────────────────────────
// While a curated tour is playing, the CHAT directive path suppresses its own
// highlight so two Driver.js spotlights never fight over the `activeDriver`
// singleton above. The TourController sets this on start/stop; the chat `send`
// reads it. The tour's own `sendAndWait` path ignores the flag — it owns the
// spotlight while a tour is active. (The discriminator is the entrypoint:
// chat → `send`, tour → `sendAndWait`.)
let tourActive = false;

export function setTourActive(active: boolean): void {
  tourActive = active;
  // Clear any lingering spotlight when a tour ends so it doesn't outlive the run.
  if (!active) clearActiveDriver();
}

export function isTourActive(): boolean {
  return tourActive;
}

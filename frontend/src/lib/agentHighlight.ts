// agentHighlight — imperative scroll-to + ring-highlight used by the agent
// directive bridge (focus / scrollTo / navigate.highlight). Extracted from
// useFocusDeepLink so the bridge can call it outside the URL `?focus=` flow.
//
// Returns true when an element with `targetId` was found (and therefore
// scrolled + ring-highlighted); false lets the caller report an honest ack.
export function highlightElement(targetId: string, durationMs = 2000): boolean {
  const el = document.getElementById(targetId);
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // Web Animations API; a no-op where unsupported (very old browsers).
  if (typeof el.animate === 'function') {
    el.animate(
      [
        { boxShadow: 'inset 0 0 0 2px var(--accent), 0 0 0 2px rgba(59,130,246,0.25)' },
        { boxShadow: 'none' },
      ],
      { duration: durationMs, easing: 'ease-out' },
    );
  }
  return true;
}

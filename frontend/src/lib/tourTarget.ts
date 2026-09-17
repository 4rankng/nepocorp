/** Resolve an assistant spotlight target by its stable attribute, then DOM id.
 *  The legacy data-tour-id attribute remains compatible with existing page
 *  targets and assistant navigation directives. */
export function resolveTourTarget(targetId: string): HTMLElement | null {
  if (!targetId) return null;
  const byDataAttr = document.querySelector<HTMLElement>(
    `[data-tour-id="${cssEscape(targetId)}"]`,
  );
  if (byDataAttr) return byDataAttr;
  // `getElementById` is faster than a querySelector for the id case and does
  // not require escaping — prefer it for the fallback.
  return document.getElementById(targetId) as HTMLElement | null;
}

/** Wrapper so an id with CSS meta-characters is still matched literally. */
function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  // Fallback: escape characters that are special in an attribute selector.
  return value.replace(/["\\\]]/g, '\\$&');
}

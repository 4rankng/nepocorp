import { useEffect } from 'react';

// Dropdown/calendar triggers retain their functional chevrons and indicators.
const BUTTONS = 'button:not([aria-haspopup]):not([role="combobox"]), a.btn:not([aria-haspopup]), [role="button"].btn:not([aria-haspopup]):not([role="combobox"])';
const WRAPPED = 'data-button-label-wrap';
const DECORATION = 'data-button-decoration';
const inlineDisplays = new WeakMap<HTMLElement, string>();

function restoreDecoration(icon: HTMLElement) {
  const display = inlineDisplays.get(icon);
  if (display !== undefined) {
    icon.style.display = display;
    inlineDisplays.delete(icon);
  }
  icon.removeAttribute(DECORATION);
}

function decorativeIcons(button: HTMLElement) {
  return Array.from(button.querySelectorAll<HTMLElement>('svg[aria-hidden="true"], img[alt=""]')).filter(icon => (
    !icon.matches('[aria-label], [aria-labelledby], [aria-describedby], [role="img"]')
    && !icon.querySelector('title')
    && !icon.closest('.spin, .animate-spin, [role="status"], [data-button-icon="status"]')
  ));
}

function labelWraps(button: HTMLElement) {
  const lines: Array<{ top: number; bottom: number }> = [];
  let primaryBlock: Element | null = null;
  const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  if (typeof range.getClientRects !== 'function') return false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue;
    if (node.parentElement?.closest('svg, [hidden], [aria-hidden="true"], .sr-only, .visually-hidden')) continue;
    // A title and its subtitle occupy different text blocks intentionally.
    // Measure wrapping within the primary label, including nested inline text,
    // rather than treating the separate description as another wrapped line.
    let block = node.parentElement;
    while (block && block !== button) {
      const display = window.getComputedStyle(block).display;
      if (display && display !== 'inline' && display !== 'contents') break;
      block = block.parentElement;
    }
    range.selectNodeContents(node);
    for (const rect of Array.from(range.getClientRects())) {
      if (rect.width <= 0 || rect.height <= 0) continue;
      primaryBlock ??= block;
      if (block === primaryBlock) lines.push({ top: rect.top, bottom: rect.bottom });
    }
  }
  lines.sort((a, b) => a.top - b.top);
  let bottom = lines[0]?.bottom ?? 0;
  return lines.some((line, index) => {
    if (index > 0 && line.top >= bottom - 1) return true;
    bottom = Math.max(bottom, line.bottom);
    return false;
  });
}

function syncButtonLabels(buttons: HTMLElement[]) {
  // Restore full contents together, read all line boxes, then apply the result.
  // Keeping writes separate avoids a forced layout for every individual button.
  const withIcons = buttons.filter(button => {
    const icons = decorativeIcons(button);
    button.querySelectorAll<HTMLElement>(`[${DECORATION}]`).forEach(restoreDecoration);
    icons.forEach(icon => icon.setAttribute(DECORATION, ''));
    button.removeAttribute(WRAPPED);
    return icons.length > 0;
  });
  const wrapped = withIcons.filter(labelWraps);
  wrapped.forEach(button => {
    button.setAttribute(WRAPPED, 'true');
    // AssetIcon uses inline display:inline-block. Preserve that explicit value
    // so the shared rule can hide decoration without a CSS priority override.
    button.querySelectorAll<HTMLElement>(`[${DECORATION}]`).forEach(icon => {
      if (!icon.style.display) return;
      inlineDisplays.set(icon, icon.style.display);
      icon.style.display = 'none';
    });
  });
}

/** Measure the complete button before hiding decoration, so a narrower label
 * after hiding an icon cannot cause an endless hide/show feedback loop. */
export function syncButtonLabelLayout(button: HTMLElement) {
  syncButtonLabels([button]);
}

/** One observer for shared Btn and native action buttons,
 * including dialogs rendered into portals. Only width/content changes recheck
 * layout; our decoration attributes and resulting height changes are ignored. */
export function useButtonLabelLayout() {
  useEffect(() => {
    const widths = new Map<HTMLElement, number>();
    const pending = new Set<HTMLElement>();
    let frame = 0;
    let disposed = false;
    const flush = () => {
      frame = 0;
      syncButtonLabels([...pending].filter(button => button.isConnected));
      pending.clear();
    };
    const schedule = (button: HTMLElement) => {
      pending.add(button);
      if (!frame) frame = window.requestAnimationFrame(flush);
    };
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(entries => {
      entries.forEach(entry => {
        const button = entry.target as HTMLElement;
        const width = entry.contentRect.width;
        if (Math.abs((widths.get(button) ?? -1) - width) < 0.5) return;
        widths.set(button, width);
        schedule(button);
      });
    });
    const visit = (node: Node) => {
      const element = node instanceof Element ? node : node.parentElement;
      if (!element) return;
      const candidates = [element.closest<HTMLElement>(BUTTONS), ...element.querySelectorAll<HTMLElement>(BUTTONS)];
      candidates.forEach(button => {
        if (!button) return;
        if (!widths.has(button)) {
          widths.set(button, -1);
          resize?.observe(button);
        }
        schedule(button);
      });
    };
    visit(document.body);
    const mutations = new MutationObserver(records => {
      records.forEach(record => {
        const owner = record.target instanceof Element ? record.target : record.target.parentElement;
        const button = owner?.closest<HTMLElement>(BUTTONS);
        if (button) schedule(button);
        record.addedNodes.forEach(visit);
      });
      widths.forEach((_width, button) => {
        if (button.isConnected) return;
        resize?.unobserve(button);
        widths.delete(button);
        pending.delete(button);
      });
    });
    mutations.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
      // Loading states may reuse an SVG and change only its class/ARIA. Our own
      // layout attributes are excluded, so measurement never observes itself.
      attributes: true,
      attributeFilter: ['class', 'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden', 'role', 'alt'],
    });
    const refresh = () => { if (!disposed) widths.forEach((_width, button) => schedule(button)); };
    window.addEventListener('resize', refresh);
    document.fonts?.addEventListener('loadingdone', refresh);
    void document.fonts?.ready.then(refresh);
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      mutations.disconnect();
      resize?.disconnect();
      window.removeEventListener('resize', refresh);
      document.fonts?.removeEventListener('loadingdone', refresh);
      widths.forEach((_width, button) => {
        button.removeAttribute(WRAPPED);
        button.querySelectorAll<HTMLElement>(`[${DECORATION}]`).forEach(restoreDecoration);
      });
    };
  }, []);
}

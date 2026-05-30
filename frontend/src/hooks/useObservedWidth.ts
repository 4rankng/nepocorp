import { useEffect, useRef, useState } from 'react';

/**
 * ResizeObserver-based width measurement.
 * Used as a workaround for recharts ResponsiveContainer mis-measuring
 * (rendering 14×14 SVGs) when its parent is a flex/grid item — the
 * auto-measure runs before the layout pass so it reads zero width,
 * then never re-measures.
 */
export function useObservedWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Initial synchronous measurement — ResizeObserver doesn't always fire
    // its first callback before paint, leaving the chart unmounted on
    // initial render. Measure once now so charts appear immediately.
    const initial = Math.round(el.getBoundingClientRect().width);
    if (initial > 0) setWidth(initial);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        if (w > 0) setWidth(w);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

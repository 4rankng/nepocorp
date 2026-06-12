import { useEffect, useRef, useCallback } from 'react';
import {
  animate,
  stagger,
  createScope,
  utils,
  spring,
} from 'animejs';

/**
 * Orchestrates dashboard entrance animations via anime.js v4.
 *
 * IMPORTANT: Must be called AFTER loading completes — the DOM elements
 * only exist when the real dashboard renders (not during skeleton state).
 * The hook waits for `ready=true` to initialize.
 *
 * Uses createScope for cleanup. All queries use rootRef directly.
 * Respects prefers-reduced-motion.
 */
export function useDashboardAnimations(ready: boolean) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!ready || hasAnimated.current) return;

    const root = rootRef.current;
    if (!root) return;

    // Double-check elements exist
    const hasKpis = root.querySelectorAll('.wf-kpi').length > 0;
    if (!hasKpis) return;

    hasAnimated.current = true;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scope = createScope({ root }).add(() => {
      if (prefersReducedMotion) {
        utils.set(root.querySelectorAll('.wf-head, .wf-kpi, .wf-bento > *, .wf-arow, .wf-aurow'), {
          opacity: 1,
          translateY: 0,
          translateX: 0,
        });
        return;
      }

      // ── Phase 1: Header entrance ──
      animate(root.querySelector('.wf-head'), {
        opacity: [0, 1],
        translateY: [16, 0],
        duration: 500,
        ease: 'out(3)',
      });

      // ── Phase 2: KPI cards stagger ──
      animate(root.querySelectorAll('.wf-kpi'), {
        opacity: [0, 1],
        translateY: [20, 0],
        scale: [0.96, 1],
        delay: stagger(80, { start: 150 }),
        duration: 600,
        ease: spring({ stiffness: 170, damping: 18 }),
      });

      // ── Phase 3: Bento cards stagger ──
      animate(root.querySelectorAll('.wf-bento > *'), {
        opacity: [0, 1],
        translateY: [24, 0],
        delay: stagger(100, { start: 500 }),
        duration: 650,
        ease: 'out(4)',
      });

      // ── Phase 4: Chart line draw ──
      const chartPaths = root.querySelectorAll('.wf-chart path');
      chartPaths.forEach((path) => {
        const svgPath = path as SVGPathElement;
        const length = svgPath.getTotalLength?.();
        if (length && length > 10) {
          svgPath.style.strokeDasharray = String(length);
          svgPath.style.strokeDashoffset = String(length);
          animate(svgPath, {
            strokeDashoffset: [length, 0],
            duration: 1200,
            delay: 700,
            ease: 'out(3)',
          });
        }
      });

      // ── Phase 5: Donut segments reveal ──
      const donutCircles = root.querySelectorAll('.wf-donut circle[stroke]:not([stroke="#eef1ef"])');
      if (donutCircles.length > 0) {
        animate(donutCircles, {
          opacity: [0, 1],
          duration: 400,
          delay: stagger(120, { start: 900 }),
          ease: 'out(3)',
        });
      }

      // ── Phase 6: Fleet utilization bar grows ──
      const utilBar = root.querySelector('.wf-util .track i');
      if (utilBar) {
        const el = utilBar as HTMLElement;
        const targetWidth = el.style.width;
        el.style.width = '0%';
        animate(el, {
          width: [0, targetWidth],
          duration: 800,
          delay: 800,
          ease: 'out(3)',
        });
      }

      // ── Phase 7: Truck margin bars grow ──
      const truckBars = root.querySelectorAll('.wf-vrow .bar i');
      truckBars.forEach((bar, i) => {
        const el = bar as HTMLElement;
        const tw = el.style.width;
        el.style.width = '0%';
        animate(el, {
          width: [0, tw],
          duration: 600,
          delay: 900 + i * 80,
          ease: 'out(3)',
        });
      });

      // ── Phase 8: Attention items stagger ──
      const attRows = root.querySelectorAll('.wf-arow');
      if (attRows.length > 0) {
        animate(attRows, {
          opacity: [0, 1],
          translateX: [-12, 0],
          delay: stagger(60, { start: 1100 }),
          duration: 400,
          ease: 'out(3)',
        });
      }

      // ── Phase 9: Audit log rows stagger ──
      const auditRows = root.querySelectorAll('.wf-aurow');
      if (auditRows.length > 0) {
        animate(auditRows, {
          opacity: [0, 1],
          translateX: [-8, 0],
          delay: stagger(40, { start: 1300 }),
          duration: 350,
          ease: 'out(3)',
        });
      }

      // ── Hover micro-interactions handled entirely via CSS transitions ──

      // ── KPI counter animation (callable method) ──
    });

    // Store counter method separately since scope.add('method') pattern
    // needs the scope callback parameter
    scopeRef.current = scope;

    return () => {
      scope.revert();
      scopeRef.current = null;
    };
  }, [ready]);

  /**
   * Animate KPI number counters from 0 → final value.
   */
  const animateCounters = useCallback(
    (targets: { el: HTMLElement; value: number; prefix?: string; suffix?: string }[]) => {
      targets.forEach(({ el, value }) => {
        const obj = { val: 0 };
        animate(obj, {
          val: value,
          duration: 1200,
          delay: 400,
          ease: 'outExpo',
          onUpdate: () => {
            el.textContent = Math.round(obj.val).toLocaleString('vi-VN');
          },
        });
      });
    },
    [],
  );

  return { rootRef, animateCounters };
}

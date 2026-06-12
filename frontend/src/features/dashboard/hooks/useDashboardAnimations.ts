import { useEffect, useRef, useCallback } from 'react';
import {
  animate,
  stagger,
  createScope,
  utils,
  spring,
  svg,
} from 'animejs';

/**
 * Orchestrates dashboard entrance animations via anime.js v4.
 *
 * 9-phase entrance sequence with absolute delays for reliable timing,
 * plus ambient animations (fleet pulse, badge pop), enhanced hover
 * spring physics, and button micro-squeeze feedback.
 *
 * Uses svg.createDrawable for chart line draws where possible,
 * with manual strokeDashoffset fallback.
 *
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
        utils.set(
          root.querySelectorAll(
            '.wf-head, .wf-kpi, .wf-bento > *, .wf-arow, .wf-aurow',
          ),
          { opacity: 1, translateY: 0, translateX: 0 },
        );
        return;
      }

      // ── Phase 1: Header entrance ──
      const header = root.querySelector('.wf-head');
      if (header) {
        animate(header, {
          opacity: [0, 1],
          translateY: [16, 0],
          duration: 500,
          ease: 'out(3)',
        });
      }

      // ── Phase 2: KPI cards stagger with spring physics ──
      const kpis = root.querySelectorAll('.wf-kpi');
      if (kpis.length > 0) {
        animate(kpis, {
          opacity: [0, 1],
          translateY: [20, 0],
          scale: [0.96, 1],
          delay: stagger(80, { start: 150 }),
          duration: 600,
          ease: spring({ stiffness: 170, damping: 18 }),
        });
      }

      // ── Phase 3: Bento cards stagger ──
      const bentoChildren = root.querySelectorAll('.wf-bento > *');
      if (bentoChildren.length > 0) {
        animate(bentoChildren, {
          opacity: [0, 1],
          translateY: [24, 0],
          delay: stagger(100, { start: 500 }),
          duration: 650,
          ease: 'out(4)',
        });
      }

      // Safety net: animate any bento children that render late
      // (e.g. audit log bento-full loads from separate query)
      const animateLateBento = () => {
        const stuckBento = root.querySelectorAll('.wf-bento > *');
        const stillHidden: Element[] = [];
        stuckBento.forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.style.opacity !== '1' && window.getComputedStyle(htmlEl).opacity === '0') {
            stillHidden.push(el);
          }
        });
        if (stillHidden.length > 0) {
          animate(stillHidden, {
            opacity: [0, 1],
            translateY: [24, 0],
            delay: stagger(80),
            duration: 500,
            ease: 'out(3)',
          });
        }
      };
      setTimeout(animateLateBento, 2500);

      // ── Phase 4: Chart line draw via svg.createDrawable ──
      const chartPaths = root.querySelectorAll('.wf-chart path');
      chartPaths.forEach((path) => {
        const svgPath = path as SVGPathElement;
        try {
          const drawable = svg.createDrawable(svgPath);
          animate(drawable, {
            draw: ['0 0', '0 1'],
            duration: 1200,
            delay: 700,
            ease: 'out(3)',
          });
        } catch {
          // Fallback: manual strokeDashoffset
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
        }
      });

      // ── Phase 5: Donut rotation + segment reveal ──
      const donutSvg = root.querySelector('.wf-donut svg');
      if (donutSvg) {
        animate(donutSvg as SVGElement, {
          rotate: [-90, 0],
          duration: 800,
          delay: 800,
          ease: 'out(4)',
        });
      }
      const donutCircles = root.querySelectorAll(
        '.wf-donut circle[stroke]:not([stroke="#eef1ef"])',
      );
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
      // Audit rows may render late (role-gated, separate query).
      // Set initial opacity via JS only when present at animation time.
      const animateAuditRows = () => {
        const rows = root.querySelectorAll('.wf-aurow');
        if (rows.length === 0) return;
        utils.set(rows, { opacity: 0 });
        animate(rows, {
          opacity: [0, 1],
          translateX: [-8, 0],
          delay: stagger(40, { start: 200 }),
          duration: 350,
          ease: 'out(3)',
        });
      };
      // Try immediately (if already rendered)
      animateAuditRows();
      // Safety net: try again after data likely loaded
      setTimeout(animateAuditRows, 2000);

      // ── Ambient animations (post-entrance, looping) ─────────────

      // Fleet "in transit" pip pulse
      const inTransitPip = root.querySelector(
        '.wf-fstat:nth-child(2) .pip',
      ) as HTMLElement | null;
      if (inTransitPip) {
        animate(inTransitPip, {
          scale: [1, 1.3, 1],
          opacity: [1, 0.6, 1],
          duration: 2000,
          loop: true,
          ease: 'inOut(2)',
        });
      }

      // Approval queue count badge pop
      const countBadge = root.querySelector(
        '.approval-queue__count',
      ) as HTMLElement | null;
      if (countBadge) {
        animate(countBadge, {
          scale: [0, 1.2, 1],
          duration: 500,
          delay: 1000,
          ease: spring({ stiffness: 300, damping: 12 }),
        });
      }

      // ── Enhanced hover micro-interactions ────────────────────────

      // Bento card hover with spring on leave
      root.querySelectorAll('.wf-card').forEach((el) => {
        const card = el as HTMLElement;
        card.addEventListener('mouseenter', () => {
          animate(card, {
            translateY: -2,
            duration: 200,
            ease: 'out(3)',
          });
        });
        card.addEventListener('mouseleave', () => {
          animate(card, {
            translateY: 0,
            duration: 400,
            ease: spring({ stiffness: 200, damping: 15 }),
          });
        });
      });

      // Button press micro-squeeze
      root.querySelectorAll('.wf-btn, .wf-minibtn').forEach((el) => {
        const btn = el as HTMLElement;
        btn.addEventListener('mousedown', () => {
          animate(btn, { scaleX: 0.97, duration: 80, ease: 'out(3)' });
        });
        btn.addEventListener('mouseup', () => {
          animate(btn, {
            scaleX: 1,
            duration: 200,
            ease: spring({ stiffness: 400, damping: 15 }),
          });
        });
      });
    });

    scopeRef.current = scope;

    return () => {
      scope.revert();
      scopeRef.current = null;
    };
  }, [ready]);

  /**
   * Animate KPI number counters from 0 → final value.
   * Staggered delay so counters cascade naturally.
   */
  const animateCounters = useCallback(
    (
      targets: {
        el: HTMLElement;
        value: number;
        prefix?: string;
        suffix?: string;
      }[],
    ) => {
      targets.forEach(({ el, value }, i) => {
        const obj = { val: 0 };
        animate(obj, {
          val: value,
          duration: 1200,
          delay: 400 + i * 100,
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

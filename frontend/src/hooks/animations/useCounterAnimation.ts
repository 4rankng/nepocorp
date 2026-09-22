import { useEffect, useRef, useCallback } from 'react';
import { animate, type JSAnimation } from 'animejs';
import { usePrefersReducedMotion } from '../usePrefersReducedMotion';

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface CounterTarget {
  /** DOM element whose textContent will be animated */
  el: HTMLElement | null;
  /** Target numeric value */
  value: number;
  /** Optional prefix (e.g., '₫') */
  prefix?: string;
  /** Optional suffix (e.g., '%', ' chuyến') */
  suffix?: string;
  /** Locale for number formatting (default: 'vi-VN') */
  locale?: string;
  /** Optional custom formatter — overrides default locale formatting */
  format?: (val: number) => string;
}

export interface CounterOptions {
  /** Animation duration per counter (ms, default: 1000) */
  duration?: number;
  /** Base delay before first counter starts (ms, default: 300) */
  delay?: number;
  /** Stagger between counters (ms, default: 80) */
  stagger?: number;
}

/* ─── Formatting ─────────────────────────────────────────────────────────── */

/** Counters with |value| below this settle immediately — too small to count up. */
const INSTANT_MAX = 10;

/**
 * Exact text for a counter at `val`. Single source of truth for mid-animation
 * frames and settle writes, so a settled element can never hold an
 * interpolated leftover.
 */
function textFor(target: CounterTarget, val: number): string {
  const { prefix = '', suffix = '', locale = 'vi-VN', format } = target;
  return format ? format(val) : `${prefix}${Math.round(val).toLocaleString(locale)}${suffix}`;
}

/** In-flight counter: the engine animation plus its exact-value settle write. */
interface RunningCounter {
  anim: JSAnimation;
  settle: () => void;
}

/* ─── Hook ───────────────────────────────────────────────────────────────── */

/**
 * Animated number counter — counts from 0 to target value with outExpo easing.
 *
 * Designed for KPI values. Uses Vietnamese locale formatting by default.
 * Cancels running animations when called again (handles data refresh).
 *
 * Settle guarantee: when an animation ends or is cancelled the element's
 * textContent is exactly the final formatted value (+ suffix), never an
 * interpolated frame. Counters with |value| < 10 skip the count-up and settle
 * immediately.
 *
 * Usage:
 *   const { animateCounters } = useCounterAnimation({ duration: 1200 });
 *   // After render, when data is ready:
 *   animateCounters([
 *     { el: revenueEl, value: 150000000, prefix: '₫' },
 *     { el: countEl, value: 42, suffix: ' chuyến' },
 *   ]);
 */
export function useCounterAnimation({
  duration = 1000,
  delay = 300,
  stagger: staggerMs = 80,
}: CounterOptions = {}) {
  const animationsRef = useRef<RunningCounter[]>([]);
  const targetsRef = useRef<CounterTarget[]>([]);
  const reducedMotion = usePrefersReducedMotion();

  // anime.js v4 fires onComplete only when the engine reaches the animation's
  // duration — never on pause/cancel. Every abort path must therefore land the
  // exact final value itself, or the DOM freezes at an interpolated frame.
  const cancelRunning = useCallback(() => {
    animationsRef.current.forEach(({ anim, settle }) => {
      anim.pause();
      settle();
    });
    animationsRef.current = [];
  }, []);

  const animateCounters = useCallback(
    (targets: CounterTarget[]) => {
      cancelRunning();
      targetsRef.current = targets;

      targets.forEach((target, i) => {
        const { el, value } = target;
        if (!el) return;
        const settle = () => {
          el.textContent = textFor(target, value);
        };
        if (reducedMotion || Math.abs(value) < INSTANT_MAX) {
          settle();
          return;
        }
        const obj = { val: 0 };
        const anim = animate(obj, {
          val: value,
          duration,
          delay: delay + i * staggerMs,
          ease: 'outExpo',
          onUpdate: () => {
            el.textContent = textFor(target, obj.val);
          },
          onComplete: settle,
        });
        animationsRef.current.push({ anim, settle });
      });
    },
    [duration, delay, staggerMs, reducedMotion, cancelRunning],
  );

  // A preference change during an animation must leave the authoritative
  // value visible, rather than freezing the counter halfway through.
  useEffect(() => {
    if (reducedMotion) animateCounters(targetsRef.current);
  }, [reducedMotion, animateCounters]);

  // Cleanup on unmount — a cancelled counter must still land its final value.
  useEffect(() => cancelRunning, [cancelRunning]);

  return { animateCounters };
}

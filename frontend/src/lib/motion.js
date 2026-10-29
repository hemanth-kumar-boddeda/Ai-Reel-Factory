import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * The motion layer.
 *
 * GSAP owns the substantial choreography: the page entrance, the section
 * reveals and the progress transitions. CSS owns the simple hover and focus
 * states, and Three.js owns the hero scene. The three never overlap.
 *
 * Every timeline is created inside a `gsap.context` that is reverted when the
 * component unmounts, so a route change can never leave a timeline running.
 */

/** True when the visitor asked for less motion. */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The entrance choreography for a page: the heading arrives, then the
 * top-level blocks follow in a short stagger.
 *
 * @param {import('react').RefObject<HTMLElement>} scopeRef the element that
 *   holds the animated children
 * @param {object} options
 * @param {string} options.selector the direct children that arrive
 * @param {number} options.stagger seconds between the arrivals
 */
export function usePageEntrance(scopeRef, options = {}) {
  const { selector = '[data-animate]', stagger = 0.055, y = 12, delay = 0.04 } = options;

  useLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return undefined;

    const reduced = prefersReducedMotion();
    const targets = scope.querySelectorAll(selector);
    if (!targets.length) return undefined;

    if (reduced) {
      gsap.set(targets, { opacity: 1, y: 0, clearProps: 'transform' });
      return undefined;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.52,
          ease: 'power3.out',
          stagger,
          delay,
          clearProps: 'transform',
        }
      );
    }, scope);

    return () => context.revert();
  }, [scopeRef, selector, stagger, y, delay]);
}

/**
 * A reveal for the blocks that only matter once they are on screen.
 * It uses one shared listener per scope and reverts on unmount.
 */
export function useScrollReveal(scopeRef, selector = '[data-reveal]') {
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return undefined;

    const targets = Array.from(scope.querySelectorAll(selector));
    if (!targets.length) return undefined;

    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      gsap.set(targets, { opacity: 1, y: 0, clearProps: 'transform' });
      return undefined;
    }

    const context = gsap.context(() => {
      gsap.set(targets, { opacity: 0, y: 14 });
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            gsap.to(entry.target, {
              opacity: 1,
              y: 0,
              duration: 0.55,
              ease: 'power3.out',
              clearProps: 'transform',
            });
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
      );
      targets.forEach((target) => observer.observe(target));
    }, scope);

    return () => context.revert();
  }, [scopeRef, selector]);
}

/**
 * A number that counts up to the value the backend reported.
 *
 * It never invents a value and it never runs when the motion is reduced - the
 * real number is shown immediately instead.
 */
export function useCountUp(value, { duration = 0.9, decimals = 0 } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      node.textContent = '—';
      return undefined;
    }

    const target = Number(value);
    if (prefersReducedMotion()) {
      node.textContent = target.toFixed(decimals);
      return undefined;
    }

    const counter = { value: 0 };
    const context = gsap.context(() => {
      gsap.to(counter, {
        value: target,
        duration,
        ease: 'power2.out',
        onUpdate: () => {
          node.textContent = counter.value.toFixed(decimals);
        },
      });
    });

    return () => context.revert();
  }, [value, duration, decimals]);

  return ref;
}

/**
 * The progress of a real job.
 *
 * The bar only ever moves to the value the API reported. It never ticks
 * forward on its own, so the animation cannot imply progress that did not
 * happen.
 */
export function useJobProgress(value) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const reported = Number(value);
    if (!Number.isFinite(reported)) {
      node.style.width = '0%';
      return undefined;
    }

    if (prefersReducedMotion()) {
      node.style.width = `${Math.max(0, Math.min(100, reported))}%`;
      return undefined;
    }

    const context = gsap.context(() => {
      gsap.to(node, {
        width: `${Math.max(0, Math.min(100, reported))}%`,
        duration: 0.6,
        ease: 'power2.out',
      });
    });

    return () => context.revert();
  }, [value]);

  return ref;
}

/**
 * The small, tactile feedback on a press. It never delays the click.
 *
 * The return uses a plain ease: the design contract forbids a bounce or a
 * spring overshoot, because this is equipment and not a toy.
 */
export function usePressFeedback(ref) {
  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) return undefined;

    const context = gsap.context(() => {
      gsap.to(node, {
        scale: 0.97,
        duration: 0.09,
        ease: 'power2.out',
        transformOrigin: 'center',
        onComplete: () => {
          gsap.to(node, {
            scale: 1,
            duration: 0.22,
            ease: 'power2.out',
          });
        },
      });
    });

    return () => context.revert();
  }, [ref]);
}

export { gsap };

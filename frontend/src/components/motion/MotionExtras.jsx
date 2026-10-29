import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap, prefersReducedMotion } from '../../lib/motion';
import './MotionExtras.css';

/**
 * The two global interactions: how far the canvas has been read, and a small
 * magnetic pull on the navigation.
 *
 * Every ease is a plain power2: the design contract forbids a bounce or an
 * overshoot. Both features are off for coarse pointers and for reduced
 * motion, and neither ever transforms a surface that has its own CSS
 * transform (the shared .btn keeps its press feedback).
 */

const MAGNET_SELECTOR =
  '.shell-nav-link, .shell-icon-button, .shell-search, .shell-brand';

export default function MotionExtras() {
  const barRef = useRef(null);
  const location = useLocation();

  // Reading progress of the workspace canvas.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return undefined;

    const update = (main) => {
      const max = main.scrollHeight - main.clientHeight;
      const progress = max > 0 ? main.scrollTop / max : 0;
      bar.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
    };

    // Capture catches scroll from .shell-main wherever and whenever it mounts.
    const onScroll = (event) => {
      const element = event.target;
      if (element instanceof Element && element.classList.contains('shell-main')) {
        update(element);
      }
    };

    document.addEventListener('scroll', onScroll, true);
    const main = document.querySelector('.shell-main');
    if (main) update(main);

    return () => document.removeEventListener('scroll', onScroll, true);
  }, [location.pathname]);

  // The magnetic pull on the chrome.
  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) {
      return undefined;
    }

    const quick = new WeakMap();
    let active = null;

    const onMove = (event) => {
      const element =
        event.target instanceof Element
          ? event.target.closest(MAGNET_SELECTOR)
          : null;
      if (element !== active) {
        if (active) {
          gsap.to(active, { x: 0, y: 0, duration: 0.3, ease: 'power2.out' });
        }
        active = element;
      }
      if (!element) return;

      if (!quick.has(element)) {
        quick.set(element, {
          x: gsap.quickTo(element, 'x', { duration: 0.28, ease: 'power2.out' }),
          y: gsap.quickTo(element, 'y', { duration: 0.28, ease: 'power2.out' }),
        });
      }
      const rect = element.getBoundingClientRect();
      quick.get(element).x((event.clientX - (rect.left + rect.width / 2)) * 0.22);
      quick.get(element).y((event.clientY - (rect.top + rect.height / 2)) * 0.3);
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      if (active) gsap.to(active, { x: 0, y: 0, duration: 0.2, ease: 'power2.out' });
      active = null;
    };
  }, []);

  return <span className="motion-progress" ref={barRef} aria-hidden="true" />;
}

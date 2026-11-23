import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Scrolls to the element named by the URL hash once the page content is
 * `ready` (lessons load their MDX asynchronously, which shifts the layout),
 * then briefly highlights it. Used when coming back from the Lab.
 */
export function useScrollToHash(ready: boolean) {
  const { hash, key } = useLocation();
  useEffect(() => {
    if (!ready || hash.length < 2) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (!el) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      el.classList.add('flash-target');
      timer = setTimeout(() => el.classList.remove('flash-target'), 2000);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
    };
  }, [ready, hash, key]);
}

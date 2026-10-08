// Free CDN libraries, pinned versions. No npm dependencies are required.
const CDN = {
  gsap: 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js',
  ScrollTrigger: 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js',
  Lenis: 'https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js',
};
let libraries;

function loadScript(name) {
  if (window[name]) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CDN[name];
    script.async = true;
    const timeout = setTimeout(() => finish(new Error(`${name}: CDN timeout`)), 12000);
    function finish(error) {
      clearTimeout(timeout);
      script.onload = script.onerror = null;
      if (error) { script.remove(); reject(error); }
      else resolve();
    }
    script.onload = () => finish(window[name] ? null : new Error(`${name}: missing global`));
    script.onerror = () => finish(new Error(`${name}: CDN unavailable`));
    document.head.append(script);
  });
}

function loadLibraries() {
  if (!libraries) {
    libraries = Promise.all([
      loadScript('gsap').then(() => loadScript('ScrollTrigger')),
      loadScript('Lenis'),
    ]).catch((error) => { libraries = undefined; throw error; });
  }
  return libraries;
}

/** Returns a cleanup function. Call it when leaving a page or unmounting React. */
export function mountLandingMotion(root, { minWidth = 1100 } = {}) {
  if (!root) return () => {};
  const media = window.matchMedia(`(min-width: ${minWidth}px) and (prefers-reduced-motion: no-preference)`);
  let disposed = false;
  let pending = false;
  let stop = null;

  async function synchronize() {
    if (disposed) return;
    if (!media.matches) { stop?.(); stop = null; return; }
    if (pending || stop) return;
    pending = true;
    try {
      await loadLibraries();
      if (disposed || !media.matches || !root.isConnected) return;
      const { gsap, ScrollTrigger, Lenis } = window;
      gsap.registerPlugin(ScrollTrigger);
      const html = document.documentElement;
      let lenis;
      let context;
      let frame = 0;
      let refreshFrame = 0;
      let active = true;
      let resizeObserver;
      const cards = new Map();

      function refresh() {
        cancelAnimationFrame(refreshFrame);
        refreshFrame = requestAnimationFrame(() => {
          if (!active) return;
          lenis?.resize();
          ScrollTrigger.refresh();
        });
      }
      function revealFocused(event) {
        for (const [card, tween] of cards) {
          if (card.contains(event.target)) {
            tween.progress(1);
            tween.scrollTrigger?.kill();
          }
        }
      }
      function cleanup() {
        if (!active) return;
        active = false;
        cancelAnimationFrame(frame);
        cancelAnimationFrame(refreshFrame);
        resizeObserver?.disconnect();
        root.removeEventListener('focusin', revealFocused);
        root.removeEventListener('load', refresh, true);
        root.removeEventListener('toggle', refresh, true);
        document.fonts?.removeEventListener('loadingdone', refresh);
        context?.revert(); // Only this page's tweens and ScrollTriggers.
        lenis?.destroy();
        html.classList.remove('hs-landing-motion');
        cards.clear();
      }
      stop = cleanup; // Also clean up a partially initialized page on errors.
      html.classList.add('hs-landing-motion');
      lenis = new Lenis({
        lerp: 0.1,
        smoothWheel: true,
        syncTouch: false,
        anchors: { offset: -104 },
        autoRaf: false,
      });
      lenis.on('scroll', ScrollTrigger.update);
      // Use real RAF timestamps without changing GSAP's global ticker settings.
      function raf(time) {
        if (!active) return;
        lenis.raf(time);
        frame = requestAnimationFrame(raf);
      }
      frame = requestAnimationFrame(raf);

      context = gsap.context(() => {}, root);
      context.add(() => {
        root.querySelectorAll('[data-motion-card]').forEach((card, index) => {
          // Preserve already-read content when restoring a scrolled page.
          if (card.getBoundingClientRect().bottom <= 0) return;
          const tween = gsap.from(card, {
            y: 32,
            opacity: 0,
            duration: 0.72,
            delay: (index % 2) * 0.07,
            ease: 'power3.out',
            scrollTrigger: { trigger: card, start: 'top 92%', once: true },
          });
          cards.set(card, tween);
        });
        root.querySelectorAll('[data-motion-title]').forEach((title) => {
          gsap.fromTo(title,
            { scale: 0.94, transformOrigin: 'left center' },
            { scale: 1, ease: 'none', scrollTrigger: {
              trigger: title.parentElement,
              start: 'top 90%',
              end: 'top 20%',
              scrub: 0.55,
            } },
          );
        });
      });
      root.addEventListener('focusin', revealFocused);
      root.addEventListener('load', refresh, true);
      root.addEventListener('toggle', refresh, true);
      document.fonts?.addEventListener('loadingdone', refresh);
      // FAQ expansion, language changes and late-loading pictures change geometry.
      if (window.ResizeObserver) {
        resizeObserver = new ResizeObserver(refresh);
        resizeObserver.observe(root);
      }
      document.fonts?.ready.then(() => { if (active) refresh(); });
      refresh();
    } catch (error) {
      stop?.();
      stop = null;
      // Content is visible by default; a blocked CDN keeps native scrolling.
      console.warn('Landing motion unavailable; using native scrolling.', error);
    } finally {
      pending = false;
    }
  }

  media.addEventListener('change', synchronize);
  void synchronize();
  return () => {
    disposed = true;
    media.removeEventListener('change', synchronize);
    stop?.();
    stop = null;
  };
}

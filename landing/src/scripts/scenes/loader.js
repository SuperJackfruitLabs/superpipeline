// The section scenes' loader. It puts each scene's still for the visitor's sun phase in place at
// once, and fetches three and the scenes only when the first one nears the viewport, after the
// page's own load, so the hero's first paint is untouched. One canvas serves every scene: it moves
// into the scene at the viewport's centre, plays it once, and leaves the still behind elsewhere.
//
// A section with steps has a pinned panel (desktop) and a scene above each step (phone; CSS shows
// one or the other). The step crossing the viewport's centre picks the panel's beat and the others
// dim; native scroll only. Reduced motion (the system setting or vibekit's data-motion="reduce"),
// a missing WebGL and a lost context keep the same layout with stills. Every label is HTML.
import { onMotionChange, reducedMotion, scenePhase } from './common.js';

const figs = [...document.querySelectorAll('figure[data-scene]')];
if (figs.length) {
  const phase = scenePhase();
  const beat = (f) => +(f.dataset.beat ?? 0);
  function setStill(f) {
    const img = f.querySelector('img[data-still]');
    const src = `/scenes/${f.dataset.scene}/${beat(f)}-${phase}.webp`;
    if (img && img.getAttribute('src') !== src) img.src = src;
  }
  figs.forEach(setStill);
  // Each pinned panel's steps: elements with data-steps-for="<panel id>" and data-beat.
  const panels = figs.filter((f) => f.id).map((f) => ({ f, steps: [...document.querySelectorAll(`[data-steps-for="${f.id}"]`)] })).filter((p) => p.steps.length);
  let stage = null, loading = false, dead = false, near = false, ticking = false;
  const reduced = reducedMotion;
  const shown = (el) => el.getClientRects().length > 0;

  function webgl() {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
      return !!gl;
    } catch { return false; }
  }
  function update() {
    ticking = false;
    const mid = innerHeight / 2;
    // The step nearest the centre line focuses; its beat goes to the panel.
    for (const { f, steps } of panels) {
      if (!shown(f)) { steps.forEach((s) => s.classList.remove('focus')); continue; }
      let best = steps[0], d = Infinity;
      for (const s of steps) {
        const r = s.getBoundingClientRect(), dd = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
        if (dd < d) { d = dd; best = s; }
      }
      steps.forEach((s) => s.classList.toggle('focus', s === best));
      f.dataset.beat = best.dataset.beat;
      setStill(f);
    }
    if (!stage) return;
    // The scene across the centre line plays; failing that, one at least 60% in view.
    let pick = null;
    for (const f of figs) {
      if (!shown(f)) continue;
      const r = f.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) { pick = f; break; }
      if (!pick && r.height && (Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / r.height >= 0.6) pick = f;
    }
    if (pick) stage.show(pick, beat(pick));
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  function stop() {
    stage?.dispose();
    stage = null;
  }
  async function start() {
    if (stage || loading || dead || reduced() || !webgl()) return;
    loading = true;
    try {
      const { createStage } = await import('./stage.js');
      if (reduced()) return;
      stage = createStage({ phase, onLost: () => { dead = true; stop(); } });
      if (stage) update(); else dead = true;
    } catch { stop(); } finally { loading = false; }
  }

  // Not before the page's own load is done, so three never competes with the hero for bandwidth.
  const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise((r) => addEventListener('load', r, { once: true }));
  const nearIO = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { near = true; loaded.then(start); }
  }, { rootMargin: '400px 0px' });
  figs.forEach((f) => nearIO.observe(f));
  if (panels.length) document.documentElement.classList.add('scene-steps');
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  update();
  onMotionChange(() => { if (reduced()) stop(); else if (near) loaded.then(start); });

  // Renders the stills in public/scenes (scripts/render-stills.mjs): ?scene-still exposes a hook
  // that draws one scene settled at one beat, for one phase, at its figure's size, as a WebP.
  if (new URLSearchParams(location.search).has('scene-still')) {
    window.__sceneStill = async (name, p, b = 0) => {
      stop();
      dead = true;
      const { renderStill } = await import('./stage.js');
      return renderStill(figs.find((f) => f.dataset.scene === name && shown(f)), p, b);
    };
  }
}

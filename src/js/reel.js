/* The film on the care page, and one wall seen through the years. */
import { page, scene as onScreen, follow, clamp, span } from './frame.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const spare = navigator.connection?.saveData;

/* it opens out as you reach it and plays without sound; the music is asked for, and then it starts from the top */
export function reel(sec) {
  const v = sec.querySelector('video');
  const box = sec.querySelector('[data-reel-f]');
  const words = sec.querySelector('[data-reel-t]');
  const line = sec.querySelector('[data-reel-line]');
  const play = sec.querySelector('[data-reel-play]');
  const sound = sec.querySelector('[data-reel-sound]');
  let held = reduced || spare; // paused by choice
  let near = false;
  let fade = 0;
  v.controls = false;
  v.muted = true;
  sec.classList.add('is-live');
  const label = () => {
    const on = !v.paused;
    sec.classList.toggle('is-playing', on);
    play.setAttribute('aria-label', on ? 'Pause the film' : 'Play the film');
    const loud = on && !v.muted;
    sound.setAttribute('aria-pressed', loud);
    sound.lastElementChild.textContent = loud ? 'Music on' : 'Play with music';
  };
  const go = () => v.play().catch(() => { held = true; label(); });
  const swell = (to, ms, done) => {
    const from = v.volume;
    const t0 = performance.now();
    const my = ++fade;
    const step = (t) => {
      if (my !== fade) return;
      const k = clamp((t - t0) / ms);
      v.volume = from + (to - from) * k;
      if (k < 1) requestAnimationFrame(step);
      else done?.();
    };
    requestAnimationFrame(step);
  };
  for (const e of ['play', 'pause', 'volumechange', 'ended']) v.addEventListener(e, label);
  play.addEventListener('click', () => {
    held = !v.paused;
    if (held) v.pause();
    else go();
  });
  sound.addEventListener('click', () => {
    if (!v.muted && !v.paused) {
      swell(0, 500, () => { v.muted = true; });
      return;
    }
    held = false;
    v.currentTime = 0;
    v.volume = 0;
    v.muted = false;
    go();
    swell(1, 500);
  });
  v.addEventListener('ended', () => {
    if (v.muted) go(); // silent, it turns over; with music, it ends
    else {
      v.muted = true;
      held = true;
    }
  });
  new IntersectionObserver(([e]) => {
    near = e.intersectionRatio > 0.35;
    if (near && !held) go();
    else if (!near && !v.paused) {
      if (v.muted) v.pause();
      else swell(0, 400, () => { v.muted = true; v.pause(); });
    }
  }, { threshold: [0, 0.35, 0.36] }).observe(box);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) v.pause();
    else if (near && !held) go();
  });
  label();
  if (reduced) return;
  const cur = { x: -1, v: 0 };
  onScreen(sec, (dt, t, top, h) => {
    const to = clamp((page.h * 0.35 - top) / Math.max(1, h - page.h + page.h * 0.35));
    if (cur.x < 0) cur.x = to;
    const p = follow(cur, to, dt, 150);
    const open = span(p, 0, 0.62);
    const ix = (1 - open) * (page.w > 800 ? 17 : 7);
    const iy = (1 - open) * (page.w > 800 ? 15 : 13);
    box.style.clipPath = `inset(${iy.toFixed(3)}% ${ix.toFixed(3)}%)`;
    v.style.transform = `scale(${(1.14 - 0.14 * open).toFixed(4)})`;
    words.style.opacity = (1 - span(p, 0.5, 0.72)).toFixed(3);
    words.style.transform = `translate3d(0,${(-open * 5).toFixed(2)}vh,0)`;
    words.style.visibility = p > 0.74 ? 'hidden' : '';
    if (v.duration) line.style.transform = `scaleX(${(v.currentTime / v.duration).toFixed(4)})`;
  });
}

/* the same wall from the same spot: the photographs are laid over one another and the years pass with the scroll */
export function years(sec) {
  const shots = [...sec.querySelectorAll('[data-year]')];
  const marks = [...sec.querySelectorAll('[data-year-at]')];
  const said = [...sec.querySelectorAll('[data-year-say]')];
  const n = shots.length;
  sec.classList.add('is-live');
  let now = -1;
  const tell = (i) => {
    if (i === now) return;
    now = i;
    said.forEach((s, k) => s.classList.toggle('on', k === i));
    marks.forEach((b, k) => (k === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
  };
  marks.forEach((b, k) => b.addEventListener('click', () => {
    const r = sec.getBoundingClientRect();
    scrollTo({ top: r.top + scrollY + ((k + 0.5) / n) * (r.height - innerHeight), behavior: reduced ? 'instant' : 'smooth' });
  }));
  tell(0);
  const cur = { x: -1, v: 0 };
  onScreen(sec, (dt, t, top, h) => {
    const to = clamp(-top / Math.max(1, h - page.h));
    if (cur.x < 0) cur.x = to;
    const at = follow(cur, to, dt, reduced ? 1 : 190) * n;
    for (let k = 0; k < n; k++) {
      const on = k === 0 ? 1 : span(at, k - 0.32, k + 0.24);
      const gone = k < n - 1 ? span(at, k + 1 + 0.24, k + 1 + 0.26) : 0; // covered, so not drawn
      shots[k].style.opacity = on.toFixed(4);
      shots[k].style.visibility = on <= 0.001 || gone >= 1 ? 'hidden' : '';
      shots[k].style.transform = `scale(${(1.035 - 0.035 * clamp((at - k + 0.4) / 1.2)).toFixed(4)})`;
    }
    tell(Math.min(n - 1, Math.max(0, Math.floor(at + 0.04))));
  });
}

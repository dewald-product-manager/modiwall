/* The edge of the commission: a soft line between the questions and the room, and a vine that climbs it, a leaf for every answer. */
import { page, scene as onScreen, follow, clamp, smooth } from './frame.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS = 'http://www.w3.org/2000/svg';

export function initVine(sec) {
  const host = sec.querySelector('[data-vine]');
  const svg = host.querySelector('svg');
  const fill = svg.querySelector('[data-edge]');
  const stem = svg.querySelector('[data-stem]');
  const twigs = svg.querySelector('[data-twigs]');
  const marks = [...host.querySelectorAll('[data-vine-at]')];
  const N = marks.length;
  const grown = { x: 0, v: 0 };
  let want = 0;
  let w = 1;
  let h = 1;
  let flat = false; // on phones the edge lies down
  const leaves = [];
  // small leaves along the way: where, which side, how large
  for (let i = 0; i < 17; i++) {
    const p = document.createElementNS(NS, 'path');
    twigs.append(p);
    leaves.push({ p, at: 0.035 + (i / 17) * 0.95, side: i % 2 ? 1 : -1, size: 0.72 + ((i * 37) % 10) / 18, last: -1 });
  }
  const fit = () => {
    const r = host.getBoundingClientRect();
    w = r.width;
    h = r.height;
    flat = matchMedia('(max-width: 1000px)').matches;
    svg.setAttribute('viewBox', `0 0 ${w.toFixed(1)} ${h.toFixed(1)}`);
  };
  new ResizeObserver(() => { fit(); last = -1; draw(0, performance.now(), true); }).observe(host);
  fit();
  let last = -1;
  /* the line itself: u runs from the foot to the head (or from left to right), and it never quite rests */
  const L = () => (flat ? w : h);
  const D = () => (flat ? h : w);
  const off = (u, t) => {
    const a = u * (flat ? 5.2 : 4.4);
    return D() * (0.5 + 0.17 * Math.sin(a + 0.6 + t * 0.00017) + 0.09 * Math.sin(a * 2.3 - t * 0.00023) + 0.05 * Math.sin(a * 4.1 + t * 0.0003));
  };
  const pt = (u, t, k = 0) => { // k: inwards, towards the questions
    const d = off(u, t) + (flat ? k : -k);
    return flat ? [u * L(), d] : [d, (1 - u) * L()];
  };
  const line = (from, to, t, k, n = 40) => {
    let s = '';
    for (let i = 0; i <= n; i++) {
      const [x, y] = pt(from + ((to - from) * i) / n, t, typeof k === 'function' ? k(from + ((to - from) * i) / n) : k);
      s += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return s;
  };
  const wind = (u) => 15 + Math.sin(u * 34) * 4.5;
  const station = (i) => 0.1 + (i / (N - 1)) * 0.8;
  function draw(dt, t, force) {
    const g = reduced ? want : follow(grown, want, dt, 900);
    fill.setAttribute('d', flat ? `${line(0, 1, t, 0)}L${w} ${h + 2}L0 ${h + 2}Z` : `${line(0, 1, t, 0)}L-2 0L-2 ${h}Z`);
    stem.setAttribute('d', g > 0.002 ? line(0, g, t, wind, Math.max(6, Math.round(64 * g))) : '');
    for (const l of leaves) {
      const k = smooth(clamp((g - l.at) / 0.07));
      const [x, y] = pt(l.at, t, wind(l.at));
      const [x2, y2] = pt(l.at + 0.01, t, wind(l.at + 0.01));
      const dir = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
      const sway = Math.sin(t * 0.0012 + l.at * 20) * 4;
      l.p.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(dir + l.side * (46 + sway)).toFixed(1)}) scale(${(k * l.size).toFixed(3)})`);
      if (l.last < 0) l.p.setAttribute('d', 'M0 0C5 -8 15 -10 25 -3C19 5 8 7 0 0Z');
      l.last = k;
    }
    marks.forEach((m, i) => {
      const [x, y] = pt(station(i), t, wind(station(i)));
      m.parentElement.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      m.classList.toggle('grown', g >= station(i) - 0.02);
    });
  }
  const set = (at, sent) => {
    want = sent ? 1 : station(at);
    marks.forEach((m, i) => {
      m.disabled = i > at && !sent && i > reach;
      if (i === at && !sent) m.setAttribute('aria-current', 'step');
      else m.removeAttribute('aria-current');
    });
    if (reduced) draw(0, 0, true);
  };
  let reach = 0;
  sec.addEventListener('mw:step', (e) => {
    reach = Math.max(reach, e.detail.at);
    set(e.detail.at, e.detail.sent);
  });
  marks.forEach((m, i) => m.addEventListener('click', () => sec.dispatchEvent(new CustomEvent('mw:go', { detail: i }))));
  set(Number(sec.dataset.at) || 0);
  host.classList.add('is-live');
  if (reduced) draw(0, 0, true);
  else onScreen(sec, (dt, t) => draw(dt, t));
  return { page };
}

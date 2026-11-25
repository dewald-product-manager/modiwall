/* Two walls that tell something. On the care page one wall lives through a visit, from the first look to the last sweep.
   On the clients page the leaves part, again and again, and someone's name is there. */
import { createWall } from './wall.js';
import { page, scene, box, follow, clamp, smooth } from './frame.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hash = (n) => {
  const v = Math.sin(n * 127.1) * 43758.5453;
  return v - Math.floor(v);
};

/* a wall that fills its stage, with plants standing beyond every edge */
async function full(sec, { px, anchor, style = 0 }) {
  const stage = sec.querySelector('[data-stage]');
  const canvas = sec.querySelector('[data-wall]');
  const W = await createWall(canvas, { anchor, style, shadow: false });
  const G = { W, w: 1, h: 1, cols: 1, rows: 1, m: 90, x: (i) => 0, y: (i) => 0 };
  G.fit = () => {
    const r = stage.getBoundingClientRect();
    const m = r.width < 700 ? px * 0.78 : px;
    const out = 2;
    const cols = Math.ceil(r.width / m) + out * 2;
    const rows = Math.ceil(r.height / m) + out * 2;
    const fresh = W.place({ w: r.width, h: r.height, cols, rows, m, ox: (r.width - cols * m) / 2, oy: (r.height - rows * m) / 2 });
    Object.assign(G, { w: r.width, h: r.height, cols, rows, m, n: cols * rows });
    G.x = (i) => W.L.ox + ((i % cols) + 0.5) * m;
    G.y = (i) => W.L.oy + (Math.floor(i / cols) + 0.5) * m;
    return fresh;
  };
  return G;
}

const beats = (sec, sel) => [...sec.querySelectorAll(sel)];
/* words come into focus, and go out of it */
function say(nodes, was, i, inn, out) {
  const key = `${inn.toFixed(3)} ${out.toFixed(3)}`;
  if (was[i] === key) return;
  was[i] = key;
  const s = nodes[i].style;
  s.visibility = inn > 0.001 && out < 0.999 ? 'visible' : 'hidden';
  s.opacity = (inn * (1 - out)).toFixed(3);
  s.transform = `translate3d(0,${((1 - inn) * 1.5 - out * 1.2).toFixed(3)}rem,0)`;
  const b = (1 - inn + out * 0.8) * 9;
  s.filter = b > 0.06 ? `blur(${b.toFixed(2)}px)` : 'none';
}

/* ------------------------------------------------------------------ one visit */
export async function careTale(sec) {
  const steps = beats(sec, '[data-beat]');
  const marks = beats(sec, '[data-mark-at]');
  const inner = sec.querySelector('[data-inner]');
  if (reduced) {
    sec.classList.add('is-flat');
    return;
  }
  const G = await full(sec, { px: 104, anchor: [0.4, 0.3] });
  const { W } = G;
  const N = steps.length;
  const was = [];
  const p = { x: -1, v: 0 };
  const lx = { x: 0, v: 0 };
  const ly = { x: 0, v: 0 };
  const amb = { x: 0.1, v: 0 };
  const lamp = { x: 0, v: 0 };
  const zoom = { x: 1.1, v: 0 };
  const hole = { x: 0, v: 0 };
  const water = { x: 0, v: 0 };
  let wt = 0;
  let mx = null;
  let my = 0;
  let tired = [];
  let at = -1;
  function layout() {
    if (!G.fit()) return;
    for (let i = 0; i < G.n; i++) W.plant(i, true, hash(i) * 0.5);
    // a few drifts that have had their day
    tired = [];
    const seeds = [[0.62, 0.3], [0.82, 0.58], [0.5, 0.74], [0.9, 0.2], [0.7, 0.86]];
    for (let i = 0; i < G.n; i++) for (const [a, b] of seeds) {
      const d = Math.hypot((G.x(i) - a * G.w) / G.m, (G.y(i) - b * G.h) / G.m);
      if (d < 1.25 + hash(i + 3) * 0.75 && !tired.includes(i)) tired.push(i);
    }
    tired.sort((a, b) => hash(a) - hash(b));
    at = -1;
  }
  layout();
  let timer;
  new ResizeObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(layout, 160);
  }).observe(sec.querySelector('[data-stage]'));
  sec.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX;
    my = e.clientY;
  }, { passive: true });
  sec.classList.add('is-ready');
  W.run(sec, (dt, top, h) => {
    const b = box(sec);
    const to = clamp((page.y - b.top) / Math.max(1, b.height - page.h));
    if (p.x < 0) p.x = to;
    const x = follow(p, to, dt, 200) * N;
    const k = Math.min(N - 1, Math.floor(x));
    steps.forEach((n, i) => say(steps, was, i, i === 0 ? 1 : smooth(clamp((x - i - 0.06) / 0.22)), i === N - 1 ? 0 : smooth(clamp((x - i - 0.84) / 0.2))));
    if (k !== at) {
      at = k;
      marks.forEach((n, i) => n.classList.toggle('on', i === k));
      sec.dataset.at = k;
    }
    // what is cut away, and what is put back
    const gone = smooth(clamp((x - 1.1) / 0.6));
    const back = smooth(clamp((x - 2.12) / 0.6));
    const a = Math.round(tired.length * back);
    const c = Math.round(tired.length * gone);
    if (x < 3.9) tired.forEach((i, n) => W.plant(i, n < a || n >= c));
    // the structure: the leaves part over it
    const opened = smooth(clamp((x - 4.0) / 0.16)) * (1 - smooth(clamp((x - 4.86) / 0.16)));
    const narrow = G.w < 800;
    const hx = G.w * (narrow ? 0.5 : 0.68);
    const hy = G.h * (narrow ? 0.34 : 0.5);
    const R = Math.min(G.w * (narrow ? 0.34 : 0.19), G.h * 0.3);
    if (x > 3.9) for (let i = 0; i < G.n; i++) {
      const d = Math.hypot(G.x(i) - hx, G.y(i) - hy) + (hash(i + 9) - 0.5) * G.m * 0.8;
      if (d < R * 1.12) W.plant(i, opened < 0.5);
    }
    follow(hole, opened, dt, 520);
    if (inner) {
      inner.style.opacity = clamp(hole.x * 1.4 - 0.4).toFixed(3);
      inner.style.transform = `translate3d(${(hx - R * 1.25).toFixed(1)}px,${(hy - R * 1.25).toFixed(1)}px,0) scale(${(0.94 + hole.x * 0.06).toFixed(4)})`;
      inner.style.width = inner.style.height = `${(R * 2.5).toFixed(1)}px`;
    }
    // light: a hand lamp while we look, then the day comes up
    const day = [0.36, 0.52, 0.6, 0.56, 0.46, 1];
    const f = clamp(x - k);
    follow(amb, day[k] + ((day[Math.min(N - 1, k + 1)] - day[k]) * smooth(clamp((f - 0.7) / 0.3))), dt, 420);
    follow(lamp, k === 0 ? 0.95 : k === N - 1 ? 0 : 0.5, dt, 520);
    const t = performance.now() / 1000;
    let gx = G.w * (narrow ? 0.5 : 0.66) + Math.sin(t * 0.46) * G.w * 0.2;
    let gy = G.h * 0.42 + Math.sin(t * 0.71 + 1) * G.h * 0.2;
    if (k === 4) [gx, gy] = [hx, hy - R * 0.3];
    if (mx !== null && k !== 4) {
      gx = mx;
      gy = my - top - (page.y - b.top > 0 ? page.y - b.top : 0);
      gy = my;
    }
    W.lamp = { x: follow(lx, gx, dt, 380), y: follow(ly, gy, dt, 380), r: Math.min(G.w, G.h) * 0.27, on: lamp.x };
    W.amb = amb.x;
    W.zoom = follow(zoom, 1.09 - 0.09 * (x / N) - (k === 2 ? -0.06 * Math.sin(f * Math.PI) : 0), dt, 520);
    // the water runs down through the planting
    follow(water, k === 3 ? Math.sin(clamp((f - 0.05) / 0.9) * Math.PI) : 0, dt, 260);
    wt = (wt + dt / 3600) % 1;
    W.water = { y: -0.25 * G.h + wt * 1.5 * G.h, s: water.x };
    W.gust += ((k === 1 ? 0.5 : 0) + Math.min(1.2, Math.abs(page.v) * 0.3) - W.gust) * (1 - Math.exp(-dt / 260));
  });
}

/* ------------------------------------------------------------------ names among the leaves */
export async function clearing(sec) {
  const names = beats(sec, '[data-name]');
  const marks = beats(sec, '[data-mark-at]');
  if (reduced) {
    sec.classList.add('is-flat');
    return;
  }
  const G = await full(sec, { px: 78, anchor: [1.7, 0.9] });
  const { W } = G;
  const N = names.length;
  const p = { x: -1, v: 0 };
  const lx = { x: 0, v: 0 };
  const ly = { x: 0, v: 0 };
  const was = [];
  const open = names.map(() => ({ x: 0, v: 0 }));
  let at = -2;
  let want = [];
  const spot = (k) => {
    const narrow = G.w < 800;
    const pos = narrow ? [[0.5, 0.38], [0.5, 0.46], [0.5, 0.36], [0.5, 0.44]][k % 4] : [[0.62, 0.45], [0.36, 0.42], [0.66, 0.5], [0.46, 0.4], [0.34, 0.48], [0.64, 0.42], [0.42, 0.5], [0.56, 0.44]][k % 8];
    return { x: pos[0] * G.w, y: pos[1] * G.h, rx: Math.min(G.w * (narrow ? 0.47 : 0.215), 400), ry: Math.min(G.h * (narrow ? 0.205 : 0.25), 265) };
  };
  function part(k) {
    at = k;
    marks.forEach((n, i) => {
      n.classList.toggle('on', i === k);
      if (i === k) n.setAttribute('aria-current', 'true');
      else n.removeAttribute('aria-current');
    });
    const s = k < 0 || k >= N ? null : spot(k);
    for (let i = 0; i < G.n; i++) {
      let bare = false;
      if (s) {
        const d = Math.hypot((G.x(i) - s.x) / s.rx, (G.y(i) - s.y) / s.ry);
        bare = d < 1 + (hash(i + k * 31) - 0.5) * 0.34;
      }
      if (want[i] === bare) continue;
      want[i] = bare;
      W.plant(i, !bare, bare ? 0 : 0.1 + hash(i) * 0.35);
    }
  }
  function layout() {
    if (!G.fit()) return;
    want = new Array(G.n).fill(false);
    for (let i = 0; i < G.n; i++) W.plant(i, true, hash(i) * 0.6);
    names.forEach((n, k) => {
      const s = spot(k);
      n.style.left = `${s.x}px`;
      n.style.top = `${s.y}px`;
      n.style.width = `${s.rx * 1.6}px`;
    });
    at = -2;
  }
  layout();
  let timer;
  new ResizeObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(layout, 160);
  }).observe(sec.querySelector('[data-stage]'));
  marks.forEach((m, i) => m.addEventListener('click', () => {
    const b = box(sec);
    scrollTo({ top: b.top + ((i + 0.62) / (N + 0.35)) * (b.height - page.h), behavior: 'smooth' });
  }));
  sec.classList.add('is-ready');
  W.amb = 0.1;
  const amb = { x: 0.1, v: 0 };
  const zoom = { x: 1.12, v: 0 };
  W.run(sec, (dt) => {
    const b = box(sec);
    const to = clamp((page.y - b.top) / Math.max(1, b.height - page.h));
    if (p.x < 0) p.x = to;
    const x = follow(p, to, dt, 170) * (N + 0.35);
    const k = x < 0.12 ? -1 : Math.min(N - 1, Math.floor(x));
    if (k !== at) part(k);
    names.forEach((n, i) => {
      const v = follow(open[i], i === k ? 1 : 0, dt, i === k ? 620 : 200);
      say(names, was, i, i === k ? smooth(clamp(v * 1.6 - 0.6)) : smooth(clamp(v * 1.2)), 0);
    });
    const s = k < 0 ? { x: G.w * 0.5, y: G.h * 0.4, rx: G.w * 0.3 } : spot(k);
    W.lamp = { x: follow(lx, s.x, dt, 420), y: follow(ly, s.y, dt, 420), r: s.rx * 0.92, on: 0.62 };
    W.amb = follow(amb, 0.46, dt, 700);
    W.zoom = follow(zoom, 1.1 - 0.06 * Math.sin((x / N) * 7), dt, 700);
    W.gust += (Math.min(1.2, Math.abs(page.v) * 0.3) - W.gust) * (1 - Math.exp(-dt / 260));
  });
}

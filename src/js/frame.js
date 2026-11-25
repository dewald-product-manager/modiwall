/* One heartbeat for every moving thing on the page. Each frame: the page scrolls, positions are read once, every scene
   on screen draws. Nothing else asks the browser to lay the page out while it is moving. */
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const root = document.documentElement;

export const page = { y: scrollY, w: innerWidth, h: innerHeight, v: 0, sharp: 1, hz: 60, busy: false };
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/* starts and ends with no speed and no jolt */
export const smooth = (v) => v * v * v * (v * (v * 6 - 15) + 10);
export const span = (p, a, b) => smooth(clamp((p - a) / (b - a)));
/* a follow that has weight: it gathers speed, and arrives without overshoot. lag is in milliseconds */
export function follow(s, to, dt, lag) {
  const w = 2 / lag;
  const d = s.x - to;
  const n = (s.v + w * d) * dt;
  const e = Math.exp(-w * dt);
  s.x = to + (d + n) * e;
  s.v = (s.v - w * n) * e;
  if (Math.abs(s.x - to) < 1e-5 && Math.abs(s.v) < 1e-7) {
    s.x = to;
    s.v = 0;
  }
  return s.x;
}

/* where things sit on the page, measured only when the page changes shape */
const boxes = new Map();
let stale = false;
function measure(el, b) {
  const r = el.getBoundingClientRect();
  b.top = r.top + scrollY;
  b.left = r.left;
  b.width = r.width;
  b.height = r.height;
}
export function box(el) {
  let b = boxes.get(el);
  if (!b) {
    b = {};
    boxes.set(el, b);
    measure(el, b);
  }
  return b;
}
const changed = () => {
  stale = true;
  wake();
};
new ResizeObserver(changed).observe(document.body);
addEventListener('resize', changed);

const scenes = new Set();
let raf = 0;
let then = 0;
/* draws while `el` is on screen: fn(dt, t, how far el's top is below the top of the window, its height) */
export function scene(el, fn) {
  const s = { el, fn, on: false };
  box(el);
  scenes.add(s);
  new IntersectionObserver((es) => {
    s.on = es[es.length - 1].isIntersecting;
    wake();
  }).observe(el);
}
export function wake() {
  if (!raf) raf = requestAnimationFrame(beat);
}

/* ---- the wheel moves the page with weight (mouse only) ---- */
const wheel = { x: scrollY, v: 0 };
let goal = null;
if (!reduced && fine) {
  addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (e.target.closest('dialog[open], textarea, select, .menu, [data-native-scroll]')) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? innerHeight : 1;
    if (goal === null) {
      wheel.x = goal = scrollY;
      wheel.v = 0;
    }
    goal = clamp(goal + e.deltaY * unit, 0, root.scrollHeight - innerHeight);
    wake();
  }, { passive: false });
  // anything else that scrolls (keyboard, scrollbar, anchors) takes over at once
  for (const k of ['keydown', 'pointerdown']) addEventListener(k, () => { goal = null; });
}

/* ---- resolution follows the machine: lowered only if frames are late, and only if that helps ---- */
const times = [];
let trial = 0;
let fixed = false;
function watch(dt) {
  if (dt > 80) return;
  times.push(dt);
  if (times.length < 70) return;
  const d = times.splice(0).sort((a, b) => a - b);
  const mid = d[35];
  page.hz = Math.min(240, 1000 / Math.max(4, d[7]));
  if (fixed) return;
  if (trial) {
    if (mid > trial * 0.93) {
      page.sharp = Math.min(1, page.sharp / 0.84); // fewer pixels changed nothing, so keep them
      fixed = true;
    }
    trial = 0;
  } else if (mid > 19 && page.sharp > 0.5) {
    trial = mid;
    page.sharp *= 0.84;
  }
}

/* heavy preparation waits for a pause in the scrolling, unless `el` is about to be seen */
export function quiet(el, near = 1) {
  return new Promise((done) => {
    let y = scrollY;
    let still = 0;
    const look = () => {
      still = Math.abs(scrollY - y) < 1 ? still + 60 : 0;
      y = scrollY;
      const b = box(el);
      if (still >= 180 || (b.top - y < page.h * (1 + near) && b.top + b.height - y > -page.h * near)) done();
      else setTimeout(look, 60);
    };
    look();
  });
}

function beat(t) {
  raf = 0;
  const real = then ? t - then : 16;
  const dt = Math.min(50, Math.max(1, real));
  then = t;
  if (goal !== null) {
    follow(wheel, goal, dt, 118);
    if (Math.abs(wheel.x - goal) < 0.35 && Math.abs(wheel.v) < 0.02) wheel.x = goal;
    scrollTo({ top: wheel.x, behavior: 'instant' });
    if (wheel.x === goal) goal = null;
  }
  const y = scrollY;
  page.v += ((y - page.y) / dt - page.v) * (1 - Math.exp(-dt / 90));
  page.y = y;
  if (stale) {
    stale = false;
    page.w = innerWidth;
    page.h = innerHeight;
    boxes.forEach((b, el) => measure(el, b));
  }
  let busy = goal !== null;
  for (const s of scenes) {
    if (!s.on) continue;
    busy = true;
    const b = boxes.get(s.el);
    s.fn(dt, t, b.top - y, b.height);
  }
  page.busy = busy;
  if (busy) {
    watch(real);
    wake();
  } else then = 0;
}

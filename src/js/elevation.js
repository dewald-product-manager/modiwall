/* The size of the wall, as an architect would draw it: to scale, beside a person, with its measure written on it.
   What fills it is a photograph of one of our own walls. */
import { follow } from './frame.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createElevation(host) {
  const canvas = host.querySelector('[data-el-wall]');
  const photo = host.querySelector('[data-el-photo]');
  const tank = host.querySelector('[data-el-tank]');
  const person = host.querySelector('[data-el-person]');
  const dimW = host.querySelector('[data-el-w]');
  const dimH = host.querySelector('[data-el-h]');
  const grip = host.querySelector('[data-grip]');
  const floor = host.querySelector('[data-el-floor]');
  const ctx = canvas.getContext('2d');
  const want = { w: 3, h: 2.5 };
  const now = { w: { x: 3, v: 0 }, h: { x: 2.5, v: 0 }, s: { x: 0, v: 0 } };
  let W = 1;
  let H = 1;
  let s = 100; // px to a metre
  let cx = 0;
  let fy = 0;
  let raf = 0;
  let then = 0;
  const text = (v) => `${(Math.round(v * 10) / 10).toString()} m`;
  const fit = () => {
    const r = host.getBoundingClientRect();
    W = r.width;
    H = r.height;
    go();
  };
  function draw(dt) {
    if (W < 2) return false;
    const narrow = W < 620;
    const side = narrow ? 1.5 : 2.6;
    const to = Math.min((W * (narrow ? 0.94 : 0.86)) / (want.w + side), (H * (narrow ? 0.66 : 0.62)) / (Math.max(want.h, 2) + 0.25));
    if (reduced || !now.s.x) {
      now.w.x = want.w;
      now.h.x = want.h;
      now.s.x = to;
    }
    follow(now.w, want.w, dt, 190);
    follow(now.h, want.h, dt, 190);
    s = follow(now.s, to, dt, 420);
    const w = now.w.x * s;
    const h = now.h.x * s;
    cx = W * (narrow ? 0.56 : 0.57);
    fy = H * (narrow ? 0.80 : 0.78);
    const left = cx - w / 2;
    const top = fy - h - 0.16 * s;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const cw = Math.max(2, Math.round(w * dpr));
    const ch = Math.max(2, Math.round(h * dpr));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    canvas.style.width = `${w.toFixed(1)}px`;
    canvas.style.height = `${h.toFixed(1)}px`;
    canvas.style.transform = `translate3d(${left.toFixed(1)}px,${top.toFixed(1)}px,0)`;
    tank.style.transform = `translate3d(${(left - 0.02 * s).toFixed(1)}px,${(fy - 0.17 * s).toFixed(1)}px,0)`; // the reservoir, as wide as the wall
    tank.style.width = `${(w + 0.04 * s).toFixed(1)}px`;
    tank.style.height = `${(0.17 * s).toFixed(1)}px`;
    if (photo.complete && photo.naturalWidth) {
      const k = Math.max(cw / photo.naturalWidth, ch / photo.naturalHeight);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(photo, (cw - photo.naturalWidth * k) / 2, (ch - photo.naturalHeight * k) * 0.45, photo.naturalWidth * k, photo.naturalHeight * k);
    }
    person.style.transform = `translate3d(${(left - 0.95 * s).toFixed(1)}px,${fy.toFixed(1)}px,0) scale(${(s / 100).toFixed(4)})`;
    floor.style.transform = `translate3d(0,${fy.toFixed(1)}px,0)`;
    dimW.style.transform = `translate3d(${left.toFixed(1)}px,${(top - 34).toFixed(1)}px,0)`;
    dimW.style.width = `${w.toFixed(1)}px`;
    dimH.style.transform = `translate3d(${(left + w + 34).toFixed(1)}px,${top.toFixed(1)}px,0)`;
    dimH.style.height = `${h.toFixed(1)}px`;
    grip.style.transform = `translate3d(${(left + w).toFixed(1)}px,${top.toFixed(1)}px,0)`;
    return Math.abs(now.w.x - want.w) + Math.abs(now.h.x - want.h) + Math.abs(s - to) / 100 > 0.003;
  }
  const loop = (t) => {
    const dt = Math.min(60, t - then || 16);
    then = t;
    raf = draw(dt) ? requestAnimationFrame(loop) : 0;
  };
  function go() {
    if (raf) return;
    then = 0;
    raf = requestAnimationFrame(loop);
  }
  photo.addEventListener('load', () => {
    go();
  });
  new ResizeObserver(fit).observe(host);
  fit();
  return {
    grip,
    size(w, h) {
      want.w = w;
      want.h = h;
      dimW.firstElementChild.textContent = text(w);
      dimH.firstElementChild.textContent = text(h);
      go();
    },
    /* a point in the window, as the size of a wall whose corner is there */
    metres(x, y) {
      const r = host.getBoundingClientRect();
      return [(2 * (x - r.left - cx)) / s, (fy - 0.16 * s - (y - r.top)) / s];
    },
  };
}

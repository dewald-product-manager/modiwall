/* See it on your wall. The photo is drawn to a canvas in this page and never leaves the device. */
import { frameWall } from './wall.js';

const STEP = 0.5; // metres per panel

/* CSS matrix3d that maps a w x h box onto four points */
function quadMatrix(w, h, [a, b, c, d]) { // a top left, b top right, c bottom right, d bottom left
  const dx1 = b.x - c.x;
  const dx2 = d.x - c.x;
  const sx = a.x - b.x + c.x - d.x;
  const dy1 = b.y - c.y;
  const dy2 = d.y - c.y;
  const sy = a.y - b.y + c.y - d.y;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-6;
  const g = (sx * dy2 - dx2 * sy) / den;
  const k = (dx1 * sy - sx * dy1) / den;
  const m = [
    (b.x - a.x + g * b.x) / w, (b.y - a.y + g * b.y) / w, 0, g / w,
    (d.x - a.x + k * d.x) / h, (d.y - a.y + k * d.y) / h, 0, k / h,
    0, 0, 1, 0,
    a.x, a.y, 0, 1,
  ];
  return `matrix3d(${m.map((v) => v.toFixed(7)).join(',')})`;
}

export async function initVisualiser(root) {
  const $ = (s) => root.querySelector(s);
  const stage = $('[data-vis-stage]');
  const photo = $('[data-vis-photo]');
  const plane = $('[data-vis-plane]');
  const line = $('[data-vis-line]');
  const handles = [...root.querySelectorAll('[data-corner]')];
  const out = $('[data-vis-out]');
  const cta = $('[data-vis-cta]');
  const msg = $('[data-vis-msg]');
  const ctx = photo.getContext('2d', { willReadFrequently: true });
  const state = { cols: 5, rows: 4, style: 0, touched: false, pts: [{ x: 0.3, y: 0.16 }, { x: 0.7, y: 0.16 }, { x: 0.7, y: 0.74 }, { x: 0.3, y: 0.74 }], source: null };
  let frame;
  let box = { w: 1, h: 1 };
  let m = 100;
  let pad = 40;

  try {
    frame = await frameWall(plane.querySelector('canvas'), stage);
  } catch {
    root.classList.add('is-off');
    msg.textContent = 'This browser cannot draw the wall. Send us a photo instead and we will show you.';
    return;
  }

  /* an empty room to begin with: plain plaster, evening light, a stone floor */
  function room(w, h) {
    const fl = h * 0.82;
    let g = ctx.createLinearGradient(0, 0, w, fl);
    g.addColorStop(0, '#f3f0ea');
    g.addColorStop(0.55, '#e2ddd3');
    g.addColorStop(1, '#c9c3b7');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, fl);
    g = ctx.createRadialGradient(w * 0.22, h * 0.05, 0, w * 0.22, h * 0.05, w * 0.75);
    g.addColorStop(0, 'rgba(255,250,236,.9)');
    g.addColorStop(1, 'rgba(255,250,236,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, fl);
    g = ctx.createLinearGradient(0, fl, 0, h);
    g.addColorStop(0, '#8f877a');
    g.addColorStop(1, '#b7afa2');
    ctx.fillStyle = g;
    ctx.fillRect(0, fl, w, h - fl);
    g = ctx.createLinearGradient(0, fl - h * 0.05, 0, fl);
    g.addColorStop(0, 'rgba(40,34,26,0)');
    g.addColorStop(1, 'rgba(40,34,26,.22)');
    ctx.fillStyle = g;
    ctx.fillRect(0, fl - h * 0.05, w, h * 0.05);
  }

  function paint() {
    const r = stage.getBoundingClientRect();
    box = { w: r.width, h: r.height };
    const dpr = Math.min(2, devicePixelRatio || 1);
    photo.width = Math.round(r.width * dpr);
    photo.height = Math.round(r.height * dpr);
    const w = photo.width;
    const h = photo.height;
    if (state.source) {
      const s = Math.max(w / state.source.width, h / state.source.height);
      const sw = state.source.width * s;
      const sh = state.source.height * s;
      ctx.drawImage(state.source, (w - sw) / 2, (h - sh) / 2, sw, sh);
    } else room(w, h);
    light();
  }

  /* match the planting to the light in the photo */
  function light() {
    const xs = state.pts.map((p) => p.x);
    const ys = state.pts.map((p) => p.y);
    const x = Math.max(0, Math.min(...xs)) * photo.width;
    const y = Math.max(0, Math.min(...ys)) * photo.height;
    const w = Math.max(2, (Math.min(1, Math.max(...xs)) * photo.width) - x);
    const h = Math.max(2, (Math.min(1, Math.max(...ys)) * photo.height) - y);
    const d = ctx.getImageData(x, y, w, h).data;
    const sum = [0, 0, 0];
    let n = 0;
    for (let i = 0; i < d.length; i += 4 * 97) {
      sum[0] += d[i];
      sum[1] += d[i + 1];
      sum[2] += d[i + 2];
      n++;
    }
    const avg = sum.map((v) => v / n / 255);
    const l = (avg[0] + avg[1] + avg[2]) / 3;
    const gain = Math.min(1.1, 0.42 + l * 0.9);
    frame.W.tint = avg.map((v) => gain * (1 + (v / Math.max(0.05, l) - 1) * 0.35));
  }

  /* until a corner is moved, the wall keeps its true proportions */
  function centre() {
    if (state.touched) return;
    const ratio = state.cols / state.rows;
    const w = Math.min(box.w * 0.66, box.h * 0.6 * ratio);
    const hx = w / 2 / box.w;
    const hy = w / ratio / 2 / box.h;
    const cy = 0.45;
    state.pts = [{ x: 0.5 - hx, y: cy - hy }, { x: 0.5 + hx, y: cy - hy }, { x: 0.5 + hx, y: cy + hy }, { x: 0.5 - hx, y: cy + hy }];
  }

  function size() {
    centre();
    const target = Math.min(1000, Math.max(560, box.w * 0.8));
    m = Math.round(Math.min(150, Math.max(70, target / Math.max(state.cols, state.rows))));
    pad = Math.round(m * 0.95);
    const c = plane.querySelector('canvas');
    c.style.width = `${state.cols * m + pad * 2}px`;
    c.style.height = `${state.rows * m + pad * 2}px`;
    c.style.left = c.style.top = `${-pad}px`;
    frame.set({ cols: state.cols, rows: state.rows, m, pad, style: state.style });
    const area = state.cols * state.rows * STEP * STEP;
    const text = (v) => (v * STEP).toFixed(1);
    out.textContent = `${text(state.cols)} × ${text(state.rows)} m`;
    root.querySelector('[data-vis-area]').textContent = `${area % 1 ? area : area.toFixed(0)} m²`;
    cta.href = `/get-a-quote.html?area=${area}`;
    fit();
  }

  function fit() {
    const px = state.pts.map((p) => ({ x: p.x * box.w, y: p.y * box.h }));
    plane.style.transform = quadMatrix(state.cols * m, state.rows * m, px);
    line.setAttribute('points', px.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
    handles.forEach((h, i) => { h.style.transform = `translate(${px[i].x.toFixed(1)}px,${px[i].y.toFixed(1)}px)`; });
  }

  /* drag a corner, or drag the wall itself */
  let drag = null;
  const convex = (pts) => {
    let sign = 0;
    for (let i = 0; i < 4; i++) {
      const [a, b, c] = [pts[i], pts[(i + 1) % 4], pts[(i + 2) % 4]];
      const z = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (Math.abs(z) < 0.0012) return false;
      if (sign && Math.sign(z) !== sign) return false;
      sign = Math.sign(z);
    }
    return true;
  };
  const move = (pts) => {
    const next = pts.map((p) => ({ x: Math.min(1.04, Math.max(-0.04, p.x)), y: Math.min(1.04, Math.max(-0.04, p.y)) }));
    if (!convex(next)) return;
    state.pts = next;
    state.touched = true;
    fit();
  };
  stage.addEventListener('pointerdown', (e) => {
    const corner = e.target.closest('[data-corner]');
    const onWall = e.target.closest('[data-vis-plane], [data-vis-line]');
    if (!corner && !onWall) return;
    drag = { i: corner ? handles.indexOf(corner) : -1, x: e.clientX, y: e.clientY, pts: state.pts };
    stage.setPointerCapture(e.pointerId);
    root.classList.add('is-drag');
    e.preventDefault();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = (e.clientX - drag.x) / box.w;
    const dy = (e.clientY - drag.y) / box.h;
    move(drag.pts.map((p, i) => (drag.i < 0 || drag.i === i ? { x: p.x + dx, y: p.y + dy } : p)));
  });
  const end = () => {
    if (!drag) return;
    drag = null;
    root.classList.remove('is-drag');
    light();
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  handles.forEach((h, i) => h.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d) return;
    e.preventDefault();
    move(state.pts.map((p, k) => (k === i ? { x: p.x + d[0] * 0.01, y: p.y + d[1] * 0.01 } : p)));
  }));

  root.querySelectorAll('[data-vis-file]').forEach((input) => input.addEventListener('change', async () => {
    const file = input.files[0];
    input.value = '';
    if (!file) return;
    msg.textContent = '';
    if (!/^image\//.test(file.type) || file.size > 40e6) {
      msg.textContent = 'Choose a photo in JPEG, PNG or WebP format, up to 40 MB.';
      return;
    }
    try {
      const big = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const s = Math.min(1, 2400 / Math.max(big.width, big.height));
      state.source?.close?.();
      state.source = s < 1 ? await createImageBitmap(big, { resizeWidth: Math.round(big.width * s), resizeHeight: Math.round(big.height * s), resizeQuality: 'high' }) : big;
      root.classList.add('has-photo');
      state.touched = false;
      stage.style.setProperty('--ar', `${state.source.width} / ${state.source.height}`);
      requestAnimationFrame(() => {
        paint();
        size();
        stage.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    } catch {
      msg.textContent = 'That photo could not be opened. Try another one, or take a new photo.';
    }
  }));
  root.querySelectorAll('[data-vis-step]').forEach((b) => b.addEventListener('click', () => {
    const [axis, by] = b.dataset.visStep.split(',');
    const max = axis === 'cols' ? 20 : 10;
    state[axis] = Math.min(max, Math.max(2, state[axis] + Number(by)));
    while (state.cols * state.rows > 200) state[axis === 'cols' ? 'rows' : 'cols']--;
    size();
  }));
  root.querySelectorAll('[data-vis-style]').forEach((i) => i.addEventListener('change', () => {
    state.style = Number(i.value);
    size();
  }));

  paint();
  size();
  let timer;
  new ResizeObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      paint();
      size();
    }, 120);
  }).observe(stage);
  root.classList.add('is-ready');
}

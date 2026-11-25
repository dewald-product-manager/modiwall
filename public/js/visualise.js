
import { frameWall } from './wall.js?v=426d4046';
const STEP = 0.5; // metres per panel
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
function room(w, h) {
const fl = h * 0.84;
let g = ctx.createLinearGradient(0, 0, w, fl);
g.addColorStop(0, '#efebe3');
g.addColorStop(0.5, '#dcd5c9');
g.addColorStop(1, '#b9b1a3');
ctx.fillStyle = g;
ctx.fillRect(0, 0, w, fl);
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < 2600; i++) {
ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,.016)' : 'rgba(70,58,40,.012)';
ctx.beginPath();
ctx.ellipse(rnd() * w, rnd() * fl, 8 + rnd() * w * 0.04, 2 + rnd() * 9, rnd() * 3, 0, 7);
ctx.fill();
}
ctx.save();
ctx.filter = `blur(${Math.round(w * 0.013)}px)`;
ctx.fillStyle = 'rgba(255,240,206,.6)';
for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
const x = w * (0.03 + c * 0.125 + r * 0.022);
const y = h * (0.1 + r * 0.2 + c * 0.03);
ctx.beginPath();
ctx.moveTo(x, y);
ctx.lineTo(x + w * 0.105, y + h * 0.03);
ctx.lineTo(x + w * 0.125, y + h * 0.2);
ctx.lineTo(x + w * 0.02, y + h * 0.17);
ctx.fill();
}
ctx.restore();
g = ctx.createLinearGradient(0, fl, 0, h);
g.addColorStop(0, '#766c5e');
g.addColorStop(1, '#a79d8e');
ctx.fillStyle = g;
ctx.fillRect(0, fl, w, h - fl);
ctx.strokeStyle = 'rgba(40,32,22,.28)';
ctx.lineWidth = Math.max(1, h * 0.0016);
for (let i = -6; i <= 6; i++) {
ctx.beginPath();
ctx.moveTo(w / 2 + i * w * 0.1, fl);
ctx.lineTo(w / 2 + i * w * 0.19, h);
ctx.stroke();
}
ctx.fillStyle = '#e9e4da';
ctx.fillRect(0, fl - h * 0.02, w, h * 0.02);
g = ctx.createLinearGradient(0, fl, 0, fl + h * 0.05);
g.addColorStop(0, 'rgba(20,15,8,.4)');
g.addColorStop(1, 'rgba(20,15,8,0)');
ctx.fillStyle = g;
ctx.fillRect(0, fl, w, h * 0.05);
g = ctx.createRadialGradient(w / 2, h * 0.4, h * 0.2, w / 2, h * 0.4, w * 0.75);
g.addColorStop(0, 'rgba(30,22,10,0)');
g.addColorStop(1, 'rgba(30,22,10,.36)');
ctx.fillStyle = g;
ctx.fillRect(0, 0, w, h);
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
const trough = root.querySelector('[data-vis-trough]');
Object.assign(trough.style, { top: `${state.rows * m}px`, width: `${state.cols * m}px`, height: `${Math.round(m * 0.3)}px` });
evening();
frame.set({ cols: state.cols, rows: state.rows, m, pad, style: state.style });
const area = state.cols * state.rows * STEP * STEP;
const text = (v) => (v * STEP).toFixed(1);
out.textContent = `${text(state.cols)} × ${text(state.rows)} m`;
root.querySelector('[data-vis-area]').textContent = `${area % 1 ? area : area.toFixed(0)} m²`;
cta.href = `get-a-quote.html?area=${area}`;
fit();
}
function fit() {
const px = state.pts.map((p) => ({ x: p.x * box.w, y: p.y * box.h }));
root.style.setProperty('--hx', `${(((state.pts[0].x + state.pts[1].x) / 2) * 100).toFixed(1)}%`);
root.style.setProperty('--hy', `${(((state.pts[0].y + state.pts[1].y) / 2) * 100).toFixed(1)}%`);
plane.style.transform = quadMatrix(state.cols * m, state.rows * m, px);
line.setAttribute('points', px.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
handles.forEach((h, i) => { h.style.transform = `translate(${px[i].x.toFixed(1)}px,${px[i].y.toFixed(1)}px)`; });
}
let dusk = false;
function evening() {
const { W } = frame;
W.amb = dusk ? 0.16 : 1;
W.lamp = { x: (state.cols * m) / 2 + pad, y: pad - m * 0.2, r: Math.max(state.cols, state.rows) * m * 0.42, on: dusk ? 1.1 : 0 };
}
root.querySelector('[data-vis-evening]').addEventListener('click', (e) => {
dusk = !dusk;
e.currentTarget.setAttribute('aria-pressed', dusk);
root.classList.toggle('is-evening', dusk);
evening();
frame.W.draw();
});
const bare = root.querySelector('[data-vis-bare]');
const show = (v) => root.classList.toggle('is-bare', v);
bare.addEventListener('pointerdown', () => show(true));
for (const n of ['pointerup', 'pointerleave', 'pointercancel', 'blur', 'keyup']) bare.addEventListener(n, () => show(false));
bare.addEventListener('keydown', (e) => (e.key === ' ' || e.key === 'Enter') && show(true));
root.querySelector('[data-vis-save]').addEventListener('click', async () => {
const bmp = await frame.W.snapshot();
const cv = document.createElement('canvas');
cv.width = photo.width;
cv.height = photo.height;
const x = cv.getContext('2d');
if (dusk) x.filter = 'brightness(.3) saturate(.72)';
x.drawImage(photo, 0, 0);
x.filter = 'none';
const M = new DOMMatrix(quadMatrix(state.cols * m, state.rows * m, state.pts.map((p) => ({ x: p.x * cv.width, y: p.y * cv.height }))));
const W0 = state.cols * m + pad * 2;
const H0 = state.rows * m + pad * 2;
const sx = bmp.width / W0;
const sy = bmp.height / H0;
const at = (u, v) => {
const p = M.transformPoint(new DOMPoint(u - pad, v - pad, 0, 1));
return { x: p.x / p.w, y: p.y / p.w };
};
const N = 26;
for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
const u0 = (c / N) * W0;
const v0 = (r / N) * H0;
const du = W0 / N;
const dv = H0 / N;
const a = at(u0, v0);
const b = at(u0 + du, v0);
const d = at(u0, v0 + dv);
x.save();
x.setTransform((b.x - a.x) / du, (b.y - a.y) / du, (d.x - a.x) / dv, (d.y - a.y) / dv, a.x, a.y);
x.drawImage(bmp, u0 * sx, v0 * sy, du * sx, dv * sy, 0, 0, du + 0.8, dv + 0.8);
x.restore();
}
cv.toBlob((blob) => {
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = 'my-modiwall.jpg';
a.click();
setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}, 'image/jpeg', 0.92);
});
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
if (e.target.closest('.vis__tools')) return;
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

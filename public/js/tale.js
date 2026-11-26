
import { createWall } from './wall.js?v=ef5bcdf1';
import { page, scene, box, follow, clamp, smooth } from './frame.js?v=c5329617';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hash = (n) => {
const v = Math.sin(n * 127.1) * 43758.5453;
return v - Math.floor(v);
};
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
function say(L, r, y) {
const sharp = smooth(clamp((r - 0.14) / 0.86));
const haze = 0.55 * smooth(clamp(r / 0.36)) * (1 - sharp); // never brighter together than the logo alone
const words = smooth(clamp((r - 0.5) / 0.5));
const key = `${haze.toFixed(3)} ${sharp.toFixed(3)} ${words.toFixed(3)} ${y.toFixed(2)}`;
if (L.was === key) return;
L.was = key;
L.el.style.visibility = haze + sharp > 0.0005 ? 'visible' : 'hidden';
L.el.style.transform = `translate3d(0,${y.toFixed(2)}px,0)`;
L.haze.style.opacity = haze.toFixed(3);
L.sharp.style.opacity = sharp.toFixed(3);
if (L.words) L.words.style.opacity = words.toFixed(3);
}
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
const logos = names.map((el) => {
const sharp = el.querySelector('img');
const haze = sharp.cloneNode();
haze.alt = '';
haze.setAttribute('aria-hidden', 'true');
haze.classList.add('nm__haze');
sharp.classList.add('nm__sharp');
sharp.before(haze);
return { el, sharp, haze, words: el.querySelector('p'), was: '', on: false, to: 14, r: { x: 0, v: 0 }, y: { x: 14, v: 0 } };
});
const p = { x: -1, v: 0 };
const lx = { x: 0, v: 0 };
const ly = { x: 0, v: 0 };
const lr = { x: G.w * 0.276, v: 0 };
let at = -2;
let since = 0; // when the current clearing began to open
let want = [];
const due = new Map(); // cells whose leaves are about to fold away, and when
const spot = (k) => {
const narrow = G.w < 800;
const pos = narrow ? [[0.5, 0.38], [0.5, 0.46], [0.5, 0.36], [0.5, 0.44]][k % 4] : [[0.62, 0.45], [0.36, 0.42], [0.66, 0.5], [0.46, 0.4], [0.34, 0.48], [0.64, 0.42], [0.42, 0.5], [0.56, 0.44]][k % 8];
return { x: pos[0] * G.w, y: pos[1] * G.h, rx: Math.min(G.w * (narrow ? 0.47 : 0.215), 400), ry: Math.min(G.h * (narrow ? 0.205 : 0.25), 265) };
};
const reach = (i, s) => Math.hypot((G.x(i) - s.x) / s.rx, (G.y(i) - s.y) / s.ry);
function part(k) {
const old = at >= 0 && at < N ? spot(at) : null;
at = k;
since = performance.now();
marks.forEach((n, i) => {
n.classList.toggle('on', i === k);
if (i === k) n.setAttribute('aria-current', 'true');
else n.removeAttribute('aria-current');
});
const s = k < 0 || k >= N ? null : spot(k);
for (let i = 0; i < G.n; i++) {
const d = s ? reach(i, s) : 9;
const bare = d < 1 + (hash(i + k * 31) - 0.5) * 0.34;
if (want[i] === bare) continue;
want[i] = bare;
if (bare) due.set(i, since + clamp(d) * 280 + hash(i + 7) * 80); // the clearing opens from its middle outwards
else {
due.delete(i);
W.plant(i, true, 0.3 + (old ? (1 - clamp(reach(i, old))) * 0.45 : 0) + hash(i) * 0.2);
}
}
}
function layout() {
if (!G.fit()) return;
want = new Array(G.n).fill(false);
due.clear();
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
const now = performance.now();
for (const [i, t] of due) {
if (t > now) continue;
due.delete(i);
W.plant(i, false);
}
const open = now - since > 480;
logos.forEach((L, i) => {
const on = i === k && open;
if (on !== L.on) {
L.on = on;
L.to = on ? 0 : L.r.x > 0.5 ? -10 : 14; // a name that was read drifts up as it goes; one barely seen sinks back
}
const r = follow(L.r, on ? 1 : 0, dt, on ? 680 : 460);
if (!on && r < 0.002) {
L.y.x = L.to = 14; // gone: ready to rise again from below
L.y.v = 0;
}
say(L, r, follow(L.y, L.to, dt, 560));
});
const s = k < 0 ? { x: G.w * 0.5, y: G.h * 0.4, rx: G.w * 0.3 } : spot(k);
W.lamp = { x: follow(lx, s.x, dt, 420), y: follow(ly, s.y, dt, 420), r: follow(lr, s.rx * 0.92, dt, 420), on: 0.62 };
W.amb = follow(amb, 0.46, dt, 700);
W.zoom = follow(zoom, 1.1 - 0.06 * Math.sin((x / N) * 7), dt, 700);
W.gust += (Math.min(1.2, Math.abs(page.v) * 0.3) - W.gust) * (1 - Math.exp(-dt / 260));
});
}

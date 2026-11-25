
import { createWall } from './wall.js?v=d99e9af5';
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

import { html } from './html.js?v=fd61fe77';
import { foliage } from './wall.js?v=e3437558';
const COLS = 5;
const ROWS = 4;
const wrap = (body, box = '0 0 500 500') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${body}</svg>`;
function backPanel() {
let s = '<rect width="500" height="500" rx="10" fill="#0f1514"/><rect x="10" y="10" width="480" height="480" rx="6" fill="#1f2826"/>';
for (let i = 0; i < 22; i++) s += `<rect x="${24 + i * 20.6}" y="26" width="12" height="448" fill="#121917"/><rect x="${36 + i * 20.6}" y="26" width="3" height="448" fill="#36423f"/>`;
return s;
}
function frontGrid() {
let d = 'M8 0H492Q500 0 500 8V492Q500 500 492 500H8Q0 500 0 492V8Q0 0 8 0Z';
for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) d += `M${28 + c * 35} ${28 + r * 35}h18v18h-18z`;
let s = `<path fill-rule="evenodd" fill="#2c3633" d="${d}"/><path fill="none" stroke="#50605b" stroke-width="2" d="M8 1H492Q499 1 499 8V492"/>`;
for (const [x, y] of [[14, 14], [486, 14], [14, 486], [486, 486]]) s += `<circle cx="${x}" cy="${y}" r="6" fill="#0d1211" stroke="#63736e" stroke-width="2"/>`;
return s;
}
const potAt = (i) => ({ x: 55 + (i % COLS) * 97.5, y: 40 + Math.floor(i / COLS) * 118 });
const RING = '<path d="M30 540H-30V-20Q-30 -40 -10 -40H510Q530 -40 530 -20V540H470" fill="none" stroke="#0f1514" stroke-width="22" stroke-linecap="round"/><path class="flow flow--up" d="M30 540H-30V-20Q-30 -40 -10 -40H250"/><path class="flow flow--up" d="M470 540H530V-20Q530 -40 510 -40H250"/><rect x="-40" y="532" width="580" height="60" rx="12" fill="#0f1514"/><rect x="-28" y="548" width="556" height="32" rx="8" fill="#2c6b57"/>';
const clamp = (v) => Math.min(1, Math.max(0, v));
const ease = (v) => 1 - (1 - v) ** 3;
const span = (p, a, b) => ease(clamp((p - a) / (b - a)));
export function initSystem(sec) {
const cam = sec.querySelector('[data-rig]');
const steps = [...sec.querySelectorAll('[data-steps] li')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pots = [...Array(COLS * ROWS).keys()];
const el = (cls, markup = '', parent = cam) => {
const d = document.createElement('div');
d.className = cls;
d.innerHTML = html(markup);
parent.append(d);
return d;
};
const pic = (src, parent, cls, box) => {
const i = new Image();
i.src = src;
i.alt = '';
i.className = cls;
Object.assign(i.style, box);
parent.append(i);
return i;
};
const pc = (v) => `${(v / 5).toFixed(2)}%`;
const wall = el('rig__layer rig__wall');
const ring = el('rig__layer', wrap(RING));
const back = el('rig__layer', wrap(backPanel() + pots.slice(0, 11).map((i) => `<path class="flow" d="M${50 + i * 41.2} 24V476"/>`).join('')));
const grid = el('rig__layer', wrap(frontGrid()));
const potLayer = el('rig__layer');
const plantLayer = el('rig__layer');
const potEls = pots.map((i) => {
const { x, y } = potAt(i);
return pic(new URL('../img/pot.webp', import.meta.url).href, potLayer, 'rig__it', { left: pc(x - 46), top: pc(y - 22), width: '18.4%' });
});
const tile = (box) => {
const cv = document.createElement('canvas');
cv.className = 'rig__it';
Object.assign(cv.style, box, { opacity: 0 });
return cv;
};
const plantEls = pots.map((i) => {
const { x, y } = potAt(i);
const cv = tile({ left: pc(x - 100), top: pc(y - 178), width: '40%', height: '40%' });
cv.style.transformOrigin = '50% 96%';
plantLayer.append(cv);
return cv;
});
const more = el('rig__layer');
const around = [];
for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) if (r || c) around.push({ r, c });
const moreEls = around.map(({ r, c }) => {
const cv = tile({ left: `${c * 100 - 20}%`, top: `${r * 100 - 26}%`, width: '140%', height: '146%' });
more.append(cv);
return cv;
});
const KIND = [1, 9, 0, 5, 3, 4, 7, 8];
const kindOf = (i) => KIND[Math.floor((Math.sin((i % COLS) * 1.1 + Math.floor(i / COLS) * 1.6) + 1) * 3.99)];
foliage().then((img) => {
const dpr = Math.min(2, devicePixelRatio || 1);
const stamp = (x, k, cx, cy, size, rot, bright) => {
x.save();
x.translate(cx, cy);
x.rotate(rot);
x.filter = `brightness(${bright}) saturate(1.15)`;
x.drawImage(img, (k % 4) * 256, Math.floor(k / 4) * 256, 256, 256, -size / 2, -size, size, size);
x.restore();
};
plantEls.forEach((cv, i) => {
const w = Math.round(cam.offsetWidth * 0.4 * dpr);
cv.width = cv.height = w;
const x = cv.getContext('2d');
const k = kindOf(i);
stamp(x, k, w * 0.5, w * 0.97, w * 0.8, -0.4, 0.62);
stamp(x, k, w * 0.5, w * 0.97, w * 0.8, 0.42, 0.78);
stamp(x, k, w * 0.5, w * 0.97, w * 0.92, 0.02, 1.08);
});
const w = Math.round(cam.offsetWidth * 1.4 * 0.55 * dpr);
const h = Math.round((w * 730) / 700);
const u1 = w / 700;
moreEls.forEach((cv, n) => setTimeout(() => {
cv.width = w;
cv.height = h;
const x = cv.getContext('2d');
x.fillStyle = '#0f1714';
x.fillRect(104 * u1, 140 * u1, 492 * u1, 470 * u1);
for (let layer = 0; layer < 2; layer++) {
for (let i = COLS * ROWS - 1; i >= 0; i--) {
const { x: px, y: py } = potAt(i);
const t = Math.sin((i + n * 5 + layer * 3) * 12.9) * 0.5;
stamp(x, kindOf(i + n * 3), (100 + px) * u1, (176 + py) * u1, 215 * u1, t, layer ? 1.02 : 0.55);
}
}
}, 60 + n * 45));
});
const order = pots.map((i) => (i % COLS) * 0.06 + Math.floor(i / COLS) * 0.09);
const last = new Map(); // skip writes that change nothing
const put = (node, prop, value) => {
const key = `${prop}${value}`;
const seen = last.get(node) ?? {};
if (seen[prop] === key) return;
seen[prop] = key;
last.set(node, seen);
if (prop.startsWith('--')) node.style.setProperty(prop, value);
else node.style[prop] = value;
};
const AT = [0, 0.18, 0.36, 0.58, 0.78, 1.001];
let u = 1;
const measure = () => { u = cam.offsetWidth / 500; };
function render(p) {
const a = span(p, 0.02, 0.16);
const b = span(p, 0.18, 0.34);
const water = span(p, 0.58, 0.66);
const end = span(p, 0.8, 0.97);
const z = (node, v) => put(node, 'transform', `translate3d(0,0,${(v * u).toFixed(1)}px)`);
z(wall, -40 - (1 - a) * 40);
z(ring, -20 - (1 - a) * 20);
z(back, (1 - a) * 170);
z(grid, 26 + (1 - b) * 260);
z(potLayer, 52);
z(plantLayer, 84);
z(more, 30);
put(plantLayer, 'opacity', '1');
put(grid, 'opacity', (0.25 + 0.75 * span(p, 0.08, 0.2)).toFixed(2));
put(ring, 'opacity', (1 - span(p, 0.8, 0.86)).toFixed(2));
put(wall, 'opacity', (1 - span(p, 0.8, 0.9)).toFixed(2));
potEls.forEach((n, i) => {
const k = span(p, 0.35 + order[i] * 0.34, 0.44 + order[i] * 0.34);
put(n, 'opacity', clamp(k * 3).toFixed(2));
put(n, 'transform', `translate3d(${((1 - k) * 170 * u).toFixed(1)}px,${((1 - k) * -40 * u).toFixed(1)}px,${((1 - k) * 60 * u).toFixed(1)}px)`);
});
plantEls.forEach((n, i) => {
const k = span(p, 0.6 + order[i] * 0.22, 0.68 + order[i] * 0.22);
put(n, 'opacity', clamp(k * 4).toFixed(2));
put(n, 'transform', `translateY(${((1 - k) * 10).toFixed(1)}%) scale(${(0.35 + 0.65 * k).toFixed(3)})`);
});
moreEls.forEach((n, i) => {
const { r, c } = around[i];
const k = span(p, 0.79 + i * 0.011, 0.9 + i * 0.011);
put(n, 'opacity', clamp(k * 2.5).toFixed(2));
put(n, 'transform', `translate3d(${((1 - k) * (c || 0.6) * 260 * u).toFixed(1)}px,${((1 - k) * r * 220 * u).toFixed(1)}px,0)`);
});
put(cam, 'transform', `rotateX(${(-20 + p * 12 + end * 4).toFixed(1)}deg) rotateY(${(-46 + p * 26 - end * 6).toFixed(1)}deg) scale(${(1 - end * 0.5).toFixed(3)})`);
put(cam, '--water', water.toFixed(2));
sec.classList.toggle('is-wet', water > 0.01 && end < 0.5);
steps.forEach((li, i) => {
li.classList.toggle('on', p >= AT[i] && p < AT[i + 1]);
put(li, '--p', clamp((p - AT[i]) / (Math.min(1, AT[i + 1]) - AT[i])).toFixed(3));
});
}
measure();
if (reduced) {
render(0.77);
steps.forEach((li) => li.classList.add('on'));
return;
}
let live = false;
let cur = -1;
let then = 0;
function loop(now) {
if (!live) return;
const r = sec.getBoundingClientRect();
const t = clamp(-r.top / (r.height - innerHeight));
const dt = Math.min(60, now - then || 16);
then = now;
const next = cur < 0 ? t : cur + (t - cur) * (1 - Math.exp(-dt / 95));
if (Math.abs(next - cur) > 0.0003) {
cur = next;
render(cur);
}
requestAnimationFrame(loop);
}
render(0);
addEventListener('resize', () => {
measure();
last.clear();
render(Math.max(0, cur));
});
new IntersectionObserver(([e]) => {
const was = live;
live = e.isIntersecting;
if (live && !was) requestAnimationFrame(loop);
}).observe(sec);
}

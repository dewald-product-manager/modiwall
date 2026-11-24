import { html } from './html.js?v=fd61fe77';
import { foliage } from './wall.js?v=d891c108';
const COLS = 5;
const ROWS = 4;
const wrap = (body, box = '0 0 500 500') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${body}</svg>`;
const note = (x1, y1, x2, y2, a, b = '') => `<g class="note"><path d="M${x1} ${y1}L${x2} ${y2}"/><circle cx="${x1}" cy="${y1}" r="5"/><text x="${x2 + (x2 < x1 ? -10 : 10)}" y="${y2 + 5}" text-anchor="${x2 < x1 ? 'end' : 'start'}">${a}${b ? `<tspan x="${x2 + (x2 < x1 ? -10 : 10)}" dy="24">${b}</tspan>` : ''}</text></g>`;
const dim = (x1, x2, y, t) => `<g class="note"><path d="M${x1} ${y - 9}V${y + 9}M${x2} ${y - 9}V${y + 9}M${x1} ${y}H${x2}"/><text x="${(x1 + x2) / 2}" y="${y - 14}" text-anchor="middle">${t}</text></g>`;
function backPanel(labels) {
let s = '<rect width="500" height="500" rx="4" fill="#0c1211"/><rect x="9" y="9" width="482" height="482" rx="3" fill="#1b2422"/><rect x="18" y="18" width="464" height="464" fill="#0f1514"/>';
for (let i = 0; i < 23; i++) s += `<rect x="${20 + i * 20.7}" y="18" width="3.4" height="464" fill="#3a4643"/><rect x="${23.400 + i * 20.7}" y="18" width="5" height="464" fill="#070b0a"/>`;
s += '<rect x="14" y="-11" width="472" height="18" rx="8" fill="#1f2927"/><rect x="14" y="-9" width="472" height="5" rx="2" fill="#46534f"/><rect x="14" y="-2" width="472" height="7" fill="#070b0a"/>';
s += '<rect x="22" y="494" width="456" height="19" rx="9.500" fill="#2a3532"/><rect x="22" y="497" width="456" height="4" rx="2" fill="#5a6863"/>';
for (let i = 0; i < 22; i++) s += `<rect x="${30 + i * 20.7}" y="508" width="6" height="13" rx="1.500" fill="#1b2422"/>`;
s += '<rect x="-13" y="18" width="15" height="464" rx="7" fill="#1f2927"/><rect x="-9" y="20" width="4" height="460" rx="2" fill="#46534f"/><rect x="496" y="14" width="17" height="472" rx="8" fill="#2a3532"/><rect x="500" y="16" width="4" height="468" rx="2" fill="#5a6863"/>';
for (const [x, y] of [[26, 26], [474, 26], [26, 474], [474, 474], [250, 474], [250, 26]]) s += `<circle cx="${x}" cy="${y}" r="6.500" fill="#26302d" stroke="#55625e" stroke-width="1.500"/><circle cx="${x}" cy="${y}" r="2.400" fill="#050807"/>`;
if (labels) s += dim(0, 500, -58, '500 mm') + note(505, 120, 570, 92, 'Male side rail', 'slides into the next') + note(140, 300, -70, 270, 'Water', 'channels') + note(420, 503, 570, 470, 'Foot tube', 'feeds the panel below');
return s;
}
function frontGrid(labels) {
const N = 16;
const M = 18;
const slot = (c, r) => [3, 7, 11, 15].includes(r) && c % 3 === (r % 2 ? 1 : 2);
let s = '<rect width="500" height="500" rx="10" fill="#202a27"/>';
let cut = '';
for (let r = 0; r < M; r++) for (let c = 0; c < N; c++) {
const x = 18 + c * 29.1;
const y = 16 + r * 26.1;
if (slot(c, r)) cut += `M${x} ${y}h22v18h-22z`;
else s += `<rect x="${x}" y="${y}" width="22" height="18" rx="1.500" fill="#141c1a"/><rect x="${x}" y="${y}" width="22" height="2" fill="#38443f"/>`;
}
s = `<mask id="g"><rect width="500" height="500" rx="10" fill="#fff"/><path d="${cut}" fill="#000"/></mask><g mask="url(#g)">${s}</g><rect x="1" y="1" width="498" height="498" rx="9" fill="none" stroke="#55625e" stroke-width="2"/>`;
for (const [x, y] of [[10, 10], [490, 10], [10, 490], [490, 490]]) s += `<circle cx="${x}" cy="${y}" r="7" fill="#8b9793"/><path d="M${x - 4} ${y}h8M${x} ${y - 4}v8" stroke="#1b2422" stroke-width="1.800"/>`;
if (labels) s += note(490, 10, 572, -18, 'Fixed at', 'four corners') + note(120, 190, -70, 170, 'Slots for', 'the vessels');
return s;
}
const potAt = (i) => ({ x: 55 + (i % COLS) * 97.5, y: 40 + Math.floor(i / COLS) * 118 });
const RING = '<rect x="-44" y="-56" width="588" height="18" rx="9" fill="#0c1211"/><path d="M-35 548V-47M535 548V-47" stroke="#0c1211" stroke-width="18" stroke-linecap="round"/><path class="flow flow--up" d="M-35 560V-47H250"/><path class="flow flow--up" d="M535 560V-47H250"/><rect x="-62" y="536" width="624" height="72" rx="5" fill="#0c1211"/><rect x="-50" y="556" width="600" height="42" rx="2" fill="#1d4f40"/><path d="M-50 566Q-25 560 0 566T50 566T100 566T150 566T200 566T250 566T300 566T350 566T400 566T450 566T500 566T550 566V598H-50Z" fill="#2c6b57"/><g><rect x="214" y="548" width="72" height="46" rx="6" fill="#3a4643"/><circle cx="250" cy="571" r="14" fill="#141c1a"/><circle class="pump" cx="250" cy="571" r="8" fill="none" stroke="#a0e515" stroke-width="3" stroke-dasharray="8 6"/></g><g><rect x="590" y="430" width="64" height="84" rx="8" fill="#141c1a"/><rect x="599" y="441" width="46" height="24" rx="2" fill="#a0e515"/><text x="622" y="459" text-anchor="middle" font-size="17" fill="#0c382c">02:45</text><path d="M622 514V560H562" fill="none" stroke="#141c1a" stroke-width="5"/></g>';
const WATER_NOTES = note(-35, 220, -110, 190, 'Ring main') + note(250, 571, 330, 660, 'Pump, in the reservoir') + note(645, 452, 668, 400, 'Digital', 'timer') + note(120, -47, 60, -104, 'Feeds from the top');
const clamp = (v) => Math.min(1, Math.max(0, v));
const ease = (v) => 1 - (1 - v) ** 3;
const span = (p, a, b) => ease(clamp((p - a) / (b - a)));
export function initSystem(sec) {
const cam = sec.querySelector('[data-rig]');
const tech = sec.hasAttribute('data-detail'); // the system page labels every part
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
const ring = el('rig__layer', wrap(RING + (tech ? `<g class="notes" data-notes>${WATER_NOTES}</g>` : '')));
const nextR = el('rig__layer', wrap(backPanel()));
const nextT = el('rig__layer', wrap(backPanel()));
const back = el('rig__layer', wrap(backPanel(tech).replace(/<g class="note">/g, '<g class="note note--a">') + pots.concat([20, 21]).map((i) => `<path class="flow" d="M${33.500 + i * 20.7} 14V486"/>`).join('')));
const grid = el('rig__layer', wrap(frontGrid(tech).replace(/<g class="note">/g, '<g class="note note--b">')));
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
const cv = tile({ left: pc(x - 105), top: pc(y - 116), width: '42%', height: '42%' });
cv.style.transformOrigin = '50% 40%';
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
const KIND = [0, 2, 14, 3, 12, 7, 10, 18];
const kindOf = (i) => KIND[Math.floor((Math.sin((i % COLS) * 1.1 + Math.floor(i / COLS) * 1.6) + 1) * 3.99)];
foliage().then((img) => {
const dpr = Math.min(2, devicePixelRatio || 1);
const stamp = (x, k, cx, cy, size, rot, bright) => {
x.save();
x.translate(cx, cy - size * 0.62);
x.rotate(Math.PI + rot); // cells are stored hanging point down
x.filter = `brightness(${bright})`;
x.drawImage(img, (k % 5) * 256, Math.floor(k / 5) * 256, 256, 256, -size / 2, -size, size, size);
x.restore();
};
plantEls.forEach((cv, i) => {
const w = Math.round(cam.offsetWidth * 0.42 * dpr);
cv.width = cv.height = w;
const x = cv.getContext('2d');
const k = kindOf(i);
stamp(x, k, w * 0.46, w * 0.66, w * 0.68, 0.5, 0.55);
stamp(x, k, w * 0.54, w * 0.68, w * 0.7, -0.5, 0.72);
stamp(x, k, w * 0.5, w * 0.72, w * 0.78, 0.05, 1.05);
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
stamp(x, kindOf(i + n * 3), (100 + px) * u1, (190 + py) * u1, 205 * u1, t, layer ? 1.02 : 0.5);
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
const join = span(p, 0.06, 0.17) * (1 - span(p, 0.18, 0.24)); // neighbours visit, show how they lock, and leave
const z = (node, v) => put(node, 'transform', `translate3d(0,0,${(v * u).toFixed(1)}px)`);
z(wall, -40 - (1 - a) * 40);
z(ring, -20 - (1 - a) * 20);
z(back, (1 - a) * 170);
const away = (1 - span(p, 0.06, 0.15)) * 130;
put(nextR, 'transform', `translate3d(${((516 + away) * u).toFixed(1)}px,0,${((1 - a) * 170 * u).toFixed(1)}px)`);
put(nextT, 'transform', `translate3d(0,${((-518 - away) * u).toFixed(1)}px,${((1 - a) * 170 * u).toFixed(1)}px)`);
put(nextR, 'opacity', (join * 0.9).toFixed(2));
put(nextT, 'opacity', (join * 0.9).toFixed(2));
put(cam, '--na', (span(p, 0.01, 0.05) * (1 - span(p, 0.16, 0.2))).toFixed(2));
put(cam, '--nb', (span(p, 0.2, 0.26) * (1 - span(p, 0.36, 0.4))).toFixed(2));
put(cam, '--nw', (span(p, 0.58, 0.63) * (1 - span(p, 0.77, 0.8))).toFixed(2));
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

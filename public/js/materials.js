
import { createRoom } from './room.js?v=293d82a9';
import { clamp, smooth, span, follow, page } from './frame.js?v=c5329617';
const beat = (p, a, b, c, d) => span(p, a, b) * (1 - span(p, c, d));
const WIDE = [[0, [0.2, 0.47, 1.9]], [0.17, [0.27, 0.48, 1.74]], [0.33, [0.75, 0.5, 1.78]], [0.5, [0.52, 0.31, 1.5]], [0.66, [0.5, 0.42, 1.14]], [1, [0.5, 0.5, 1.0]]];
const TALL = [[0, [0.12, 0.5, 1.06]], [0.17, [0.15, 0.5, 1.04]], [0.33, [0.86, 0.5, 1.04]], [0.5, [0.53, 0.46, 1.08]], [0.66, [0.52, 0.48, 1.03]], [1, [0.5, 0.5, 1.0]]];
function camera(list, p) {
let i = 0;
while (i < list.length - 2 && p > list[i + 1][0]) i++;
const [a, A] = list[i];
const [b, B] = list[i + 1];
const k = smooth(clamp((p - a) / (b - a)));
return A.map((v, n) => v + (B[n] - v) * k);
}
export async function initMaterials(sec) {
const canvas = sec.querySelector('[data-room]');
const lines = [...sec.querySelectorAll('[data-line]')];
if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
sec.classList.add('is-flat');
return;
}
const say = [[-0.2, -0.1, 0.13, 0.19], [0.22, 0.28, 0.35, 0.41], [0.43, 0.49, 0.56, 0.62], [0.64, 0.69, 0.74, 0.79], [0.84, 0.91, 3, 4]];
const was = lines.map(() => '');
function words(p) {
lines.forEach((n, i) => {
const [a, b, c, d] = say[i];
const inn = smooth(clamp((p - a) / (b - a)));
const out = smooth(clamp((p - c) / (d - c)));
const key = `${inn.toFixed(3)} ${out.toFixed(3)}`;
if (key === was[i]) return;
was[i] = key;
const s = n.style;
s.visibility = inn > 0 && out < 1 ? 'visible' : 'hidden';
s.opacity = (inn * (1 - out)).toFixed(3);
s.transform = `translate3d(0,${((1 - inn) * 0.34 - out * 0.26).toFixed(4)}em,0)`;
const b2 = (1 - inn + out * 0.8) * 12;
s.filter = b2 > 0.05 ? `blur(${b2.toFixed(2)}px)` : 'none';
});
}
words(0);
const R = await createRoom(canvas, 'mat');
sec.classList.add('is-lit');
const at = { x: -1, v: 0 };
let arrive = 0;
R.run(sec, (dt, top, h) => {
const to = clamp(-top / Math.max(1, h - page.h));
if (at.x < 0) at.x = to;
follow(at, to, dt, 230);
arrive += ((top < page.h * 0.55 ? 1 : 0) - arrive) * (1 - Math.exp(-dt / 700));
const p = at.x;
const ember = span(p, 0.6, 0.68) * 0.075;
const grown = span(p, 0.76, 0.96);
R.w = [
arrive * (1 - span(p, 0.15, 0.28)) * 0.92 + ember + grown * 0.34,
beat(p, 0.17, 0.3, 0.36, 0.48) * 0.9 + ember + grown * 0.4,
beat(p, 0.37, 0.5, 0.57, 0.67) * 0.72 + grown * 0.22,
grown * 1.02,
];
R.rise = -0.1 + span(p, 0.76, 0.97) * 1.55;
R.view = camera(R.size.w < R.size.h ? TALL : WIDE, p);
words(p);
});
}

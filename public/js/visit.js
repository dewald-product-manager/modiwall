
import { page, scene as onScreen, box, follow, clamp, smooth } from './frame.js?v=c5329617';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export function initVisit(sec) {
const says = [...sec.querySelectorAll('[data-visit-t]')];
const views = [...sec.querySelectorAll('[data-visit-v]')];
const tasks = [...sec.querySelectorAll('[data-visit-task]')];
const marks = [...sec.querySelectorAll('[data-visit-at]')];
const N = says.length;
let now = -1;
const go = (k) => {
const b = box(sec);
scrollTo({ top: b.top + ((k + 0.5) / N) * (b.height - page.h), behavior: reduced ? 'instant' : 'smooth' });
};
marks.forEach((m, k) => m.addEventListener('click', () => go(k)));
const load = (k) => {
const v = views[k]?.querySelector('video');
if (v && v.preload === 'none') {
v.preload = 'auto';
v.load();
}
};
const step = (k) => {
if (k === now) return;
now = k;
load(k);
load(k + 1);
views.forEach((w, i) => {
const v = w.querySelector('video');
if (!v) return;
if (i === k) v.play().catch(() => {});
else setTimeout(() => i !== now && v.pause(), 1100); // it goes on moving until it is covered
});
says.forEach((s, i) => {
s.classList.toggle('on', i === k);
s.classList.toggle('gone', i < k);
});
tasks.forEach((t) => t.classList.toggle('done', Number(t.dataset.visitTask) <= k));
marks.forEach((m, i) => (i === k ? m.setAttribute('aria-current', 'step') : m.removeAttribute('aria-current')));
};
sec.classList.add('is-ready');
const key = views.map(() => -1);
const draw = (p) => {
const x = p * N; // each part of the visit has the same length of page
const k = Math.min(N - 1, Math.floor(x + 0.12));
step(k);
views.forEach((w, i) => {
const inn = i === 0 ? 1 : smooth(clamp((x - i + 0.36) / 0.48));
const out = smooth(clamp((x - i - 0.64) / 0.48));
const q = inn * 10 + out;
if (Math.abs(q - key[i]) < 0.0005) return;
key[i] = q;
w.style.clipPath = inn > 0.999 ? 'none' : `inset(${((1 - inn) * 100).toFixed(2)}% 0 0 0)`;
w.style.visibility = inn > 0.001 && out < 0.999 ? 'visible' : 'hidden';
w.firstElementChild.style.transform = `translate3d(0,${((1 - inn) * 12 - out * 6).toFixed(2)}%,0) scale(${(1.14 - inn * 0.1 + out * 0.03).toFixed(4)})`;
});
sec.style.setProperty('--p', p.toFixed(4));
};
if (reduced) {
const still = () => {
const r = sec.getBoundingClientRect();
const k = Math.min(N - 1, Math.floor(clamp(-r.top / Math.max(1, r.height - innerHeight)) * N));
draw((k + 0.3) / N);
views.forEach((w) => w.querySelector('video')?.pause());
};
still();
addEventListener('scroll', still, { passive: true });
return;
}
new IntersectionObserver(([e]) => {
const v = views[now]?.querySelector('video');
if (!v) return;
if (e.isIntersecting) v.play().catch(() => {});
else v.pause();
}).observe(sec.firstElementChild);
const cur = { x: -1, v: 0 };
onScreen(sec, (dt, t, top, h) => {
const to = clamp(-top / Math.max(1, h - page.h));
if (cur.x < 0) cur.x = to;
draw(follow(cur, to, dt, 190));
});
}

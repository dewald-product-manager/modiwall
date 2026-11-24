
const GAP = 620; // distance between photos along the corridor
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export function initCorridor(sec) {
const cam = sec.querySelector('[data-cam]');
const stage = sec.querySelector('[data-hall]');
const bar = sec.querySelector('[data-hall-title]');
const meter = sec.querySelector('[data-hall-meter]');
const all = [...sec.querySelectorAll('[data-frame]')];
let list = all;
let z = 0;
let cur = -1;
let live = false;
let then = 0;
let mx = 0;
let my = 0;
let cx = 0;
let cy = 0;
function hang() {
const w = stage.clientWidth;
const h = stage.clientHeight;
const narrow = w < 800;
const size = narrow ? Math.min(w * 1.02, 470) : Math.min(h * 0.82, w * 0.42);
list.forEach((f, i) => {
const side = i % 2 ? 1 : -1;
const ratio = Number(f.dataset.ratio);
const fh = ratio > 1 ? size * 0.86 : size * 1.06;
const fw = fh * Math.min(1.45, Math.max(0.68, ratio));
f.style.width = `${fw.toFixed(0)}px`;
f.style.height = `${fh.toFixed(0)}px`;
const x = side * (narrow ? w * 0.33 : w * 0.36 + fw * 0.1);
const y = (i % 4 < 2 ? -1 : 1) * h * 0.035;
f.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(0)}px,${y.toFixed(0)}px,${-i * GAP - 500}px) rotateY(${-side * (narrow ? 20 : 34)}deg)`;
});
z = (list.length - 1) * GAP + 420;
sec.style.setProperty('--len', list.length);
cur = -1;
}
function render(p) {
const at = p * z;
cam.style.transform = `translate3d(${(cx * -46).toFixed(1)}px,${(cy * -26).toFixed(1)}px,${at.toFixed(1)}px) rotateY(${(cx * 2.2).toFixed(2)}deg)`;
let near = 0;
list.forEach((f, i) => {
const d = i * GAP + 500 - at; // distance ahead of the viewer
const show = d > -260 && d < GAP * 6.4;
f.style.visibility = show ? 'visible' : 'hidden';
if (!show) return;
const fog = Math.max(0, Math.min(1, 1 - (d - GAP * 1.2) / (GAP * 4.6)));
f.style.opacity = (d < 60 ? Math.max(0, (d + 200) / 260) : 0.1 + fog * 0.9).toFixed(3);
if (d < 760) near = i;
});
near = Math.min(list.length - 1, near);
if (bar.dataset.i !== String(near)) {
bar.dataset.i = near;
bar.textContent = list[near].dataset.title;
bar.classList.remove('turn');
void bar.offsetWidth;
bar.classList.add('turn');
}
meter.style.transform = `scaleX(${p.toFixed(4)})`;
}
function loop(t) {
if (!live) return;
const dt = Math.min(60, t - then || 16);
then = t;
const r = sec.getBoundingClientRect();
const to = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
const k = 1 - Math.exp(-dt / 130);
cx += (mx - cx) * k;
cy += (my - cy) * k;
cur = cur < 0 ? to : cur + (to - cur) * k;
render(cur);
requestAnimationFrame(loop);
}
if (reduced) {
sec.classList.add('is-flat');
return { filter() {} };
}
hang();
render(0);
stage.addEventListener('pointermove', (e) => {
if (e.pointerType !== 'mouse') return;
mx = e.clientX / innerWidth - 0.5;
my = e.clientY / innerHeight - 0.5;
}, { passive: true });
sec.addEventListener('focusin', (e) => {
const f = e.target.closest('[data-frame]');
if (!f || !e.target.matches(':focus-visible')) return;
const i = list.indexOf(f);
scrollTo({ top: sec.offsetTop + (Math.max(0, i * GAP - 60) / z) * (sec.offsetHeight - innerHeight), behavior: 'smooth' });
});
let timer;
let seen = innerWidth;
new ResizeObserver(() => {
clearTimeout(timer);
timer = setTimeout(() => {
if (innerWidth !== seen || !matchMedia('(pointer: coarse)').matches) hang();
seen = innerWidth;
}, 120);
}).observe(stage);
new IntersectionObserver(([e]) => {
const was = live;
live = e.isIntersecting;
if (live && !was) requestAnimationFrame(loop);
}).observe(sec);
return {
filter(place) {
list = all.filter((f) => place === 'all' || f.dataset.place === place);
all.forEach((f) => { f.hidden = !list.includes(f); });
hang();
render(0);
scrollTo({ top: sec.offsetTop, behavior: 'smooth' });
},
};
}


import { html } from './html.js?v=fd61fe77';
const SEED = '<svg viewBox="-40 -40 80 80" aria-hidden="true"><g class="sd"><path class="sd__l" d="M0 2C-14 -4 -25 -17 -24 -32C-9 -30 1 -17 0 2Z"/><path class="sd__r" d="M0 2C14 -4 25 -17 24 -32C9 -30 -1 -17 0 2Z"/><path class="sd__s" d="M0 -9C5.400 -4 6.600 3 0 9C-6.600 3 -5.400 -4 0 -9Z"/></g></svg>';
const SPRIG = '<svg viewBox="-50 -110 100 120" aria-hidden="true"><path class="sp__stem" pathLength="1" d="M0 6C-3 -18 4 -44 0 -78"/><path class="sp__a" d="M0 -28C-20 -30 -33 -44 -34 -62C-14 -61 1 -48 0 -28Z"/><path class="sp__b" d="M1 -44C20 -46 34 -60 35 -78C15 -77 0 -64 1 -44Z"/><path class="sp__c" d="M0 -74C-11 -84 -10 -98 4 -108C15 -97 13 -84 0 -74Z"/></svg>';
export function initSeed() {
if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
const seed = document.createElement('div');
const tag = document.createElement('div');
const word = document.createElement('b');
seed.className = 'seed';
seed.innerHTML = html(SEED);
tag.className = 'seed-tag';
tag.append(word);
for (const n of [seed, tag]) {
n.setAttribute('aria-hidden', 'true');
document.body.append(n);
}
let x = -100;
let y = -100;
let tx = x;
let ty = y;
let gx = x;
let gy = y;
let vx = 0;
let raf = 0;
let then = 0;
let seen = false;
const run = (t) => {
const dt = Math.min(50, t - then || 16);
then = t;
const k = 1 - Math.exp(-dt / 26); // close behind the hand, never drifting
const px = x;
x += (tx - x) * k;
y += (ty - y) * k;
vx += ((x - px) / dt - vx) * 0.2;
const g = 1 - Math.exp(-dt / 120);
gx += (tx - gx) * g;
gy += (ty - gy) * g;
seed.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${Math.max(-26, Math.min(26, vx * 14)).toFixed(1)}deg)`;
tag.style.transform = `translate3d(${gx.toFixed(1)}px,${gy.toFixed(1)}px,0)`;
raf = Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(tx - gx) + Math.abs(vx) > 0.15 ? requestAnimationFrame(run) : 0;
};
const go = () => {
if (raf) return;
then = 0;
raf = requestAnimationFrame(run);
};
addEventListener('pointermove', (e) => {
if (e.pointerType !== 'mouse') return;
tx = e.clientX;
ty = e.clientY;
if (!seen) {
seen = true;
x = gx = tx;
y = gy = ty;
document.documentElement.classList.add('has-seed');
seed.classList.add('born');
}
const t = e.target;
const field = t.closest?.('input:not([type=radio],[type=checkbox],[type=range],[type=file]),textarea,select');
const named = t.closest?.('[data-cursor]');
seed.classList.toggle('open', !named && !!t.closest?.('a,button,label,summary,[role=button],[data-lamp],input[type=range]'));
seed.classList.toggle('away', !!field);
if (named && !e.buttons) word.textContent = named.dataset.cursor;
tag.classList.toggle('on', !!named && !e.buttons);
seed.classList.toggle('in-tag', !!named && !e.buttons);
go();
}, { passive: true });
document.addEventListener('pointerleave', () => {
seed.classList.add('away');
tag.classList.remove('on');
});
document.addEventListener('pointerenter', () => seed.classList.remove('away'));
addEventListener('pointerdown', (e) => {
if (e.pointerType !== 'mouse' || e.button) return;
seed.classList.add('press');
const s = document.createElement('div');
s.className = 'sprout';
s.style.left = `${e.clientX}px`;
s.style.top = `${e.clientY}px`;
s.style.setProperty('--lean', `${(Math.random() * 28 - 14).toFixed(0)}deg`);
s.innerHTML = html(SPRIG);
document.body.append(s);
s.addEventListener('animationend', (ev) => ev.target === s && s.remove());
const more = document.querySelectorAll('.sprout');
if (more.length > 5) more[0].remove();
}, { passive: true });
addEventListener('pointerup', () => seed.classList.remove('press'), { passive: true });
}

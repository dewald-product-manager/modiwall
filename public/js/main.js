
import { html } from './html.js?v=fd61fe77';
import { page, box, scene, quiet, follow, clamp, smooth } from './frame.js?v=c5329617';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
root.classList.add('js');
if (location.hostname.endsWith('.github.io')) {
const tag = document.querySelector('meta[name=robots]');
if (tag) tag.content = 'noindex';
}
if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) $$('.btn').forEach((b) => {
b.addEventListener('pointermove', (e) => {
const r = b.getBoundingClientRect();
b.style.translate = `${((e.clientX - r.left - r.width / 2) * 0.16).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * 0.26).toFixed(1)}px`;
}, { passive: true });
b.addEventListener('pointerleave', () => { b.style.translate = ''; });
});
const top = $('[data-top]');
let lastY = 0;
let run = 0; // how far the page has moved without turning back
let ticking = false;
function onScroll() {
const y = page.y = scrollY;
top.classList.toggle('is-stuck', y > 40);
const d = y - lastY;
run = d * run < 0 ? d : run + d;
if (y < 420) top.classList.remove('is-away');
else if (run > 14) top.classList.add('is-away');
else if (run < -90 && !pinned()) top.classList.remove('is-away');
lastY = y;
ticking = false;
}
const scenes = $$('[data-rooms], [data-night], [data-names], [data-visit], [data-cut], [data-years], [data-hall-page]');
const pinned = () => innerWidth > 800 && scenes.some((s) => {
const b = box(s);
return page.y > b.top + 4 && page.y < b.top + b.height - innerHeight - 4;
});
addEventListener('scroll', () => {
if (!ticking) {
ticking = true;
requestAnimationFrame(onScroll);
}
}, { passive: true });
onScroll();
const burger = $('[data-burger]');
const menu = $('[data-menu]');
function setMenu(open) {
menu.hidden = !open;
root.classList.toggle('menu-open', open);
burger.setAttribute('aria-expanded', open);
$('#main').inert = open;
if (!open) burger.focus({ preventScroll: true });
}
burger.addEventListener('click', () => setMenu(menu.hidden));
addEventListener('keydown', (e) => {
if (e.key === 'Escape' && !menu.hidden) setMenu(false);
});
matchMedia('(min-width: 1021px)').addEventListener('change', (e) => {
if (e.matches && !menu.hidden) setMenu(false);
});
if (!reduced) $$('h2, .open h1, .ph h1, .vis-top h1, .quote h1, .lost h1').forEach((h) => {
if (h.closest('.foot, .lightbox') || h.matches('.vh')) return;
const words = h.textContent.trim().split(/\s+/);
h.setAttribute('aria-label', words.join(' '));
h.textContent = '';
words.forEach((w, i) => {
const o = document.createElement('span');
const n = document.createElement('span');
o.className = 'w';
o.setAttribute('aria-hidden', 'true');
n.textContent = w;
n.style.setProperty('--i', i);
o.append(n);
h.append(o, ' ');
});
h.classList.add('words');
h.dataset.watch = '';
});
const io = new IntersectionObserver((es) => {
for (const e of es) {
if (!e.isIntersecting) continue;
e.target.classList.add('in');
io.unobserve(e.target);
}
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
$$('[data-watchall]').forEach((g) => [...g.children].forEach((c) => { c.dataset.watch = ''; }));
$$('[data-slots]').forEach((g) => [...g.children].forEach((c, i) => {
c.dataset.slot = '';
c.style.setProperty('--i', i % 4);
}));
$$('[data-slot], [data-watch]').forEach((el) => io.observe(el));
$$('.lume').forEach((l) => l.addEventListener('transitionend', (e) => {
if (e.target.matches('picture') && l.classList.contains('in')) l.classList.add('done');
}));
const hero = $('[data-hero]');
if (hero) {
const start = () => import('./wall.js?v=d99e9af5').then((m) => m.heroWall(hero)).catch(() => hero.classList.add('no-webgl'));
if (document.readyState === 'complete') start();
else requestAnimationFrame(() => setTimeout(start, 0));
}
const vis = $('[data-vis]');
if (vis) import('./visualise.js?v=1aa3d066').then((m) => m.initVisualiser(vis));
const system = $('[data-system]');
if (system) {
const near = new IntersectionObserver(([e]) => {
if (!e.isIntersecting) return;
near.disconnect();
quiet(system, 1.1).then(() => import('./system.js?v=f446d86f')).then((m) => m.initSystem(system));
}, { rootMargin: '260% 0px' });
near.observe(system);
}
for (const [sel, fn] of [['[data-rooms]', 'rooms'], ['[data-record]', 'record'], ['[data-who]', 'who']]) {
const el = $(sel);
if (el) import('./home.js?v=37aad70b').then((m) => m[fn](el));
}
const peek = $('[data-peeks]');
if (peek && !reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
const card = document.createElement('div');
card.className = 'peek';
card.setAttribute('aria-hidden', 'true');
const pics = $$('[data-peek]', peek).map((a) => {
const i = new Image();
i.alt = '';
i.dataset.src = a.dataset.peek;
card.append(i);
return i;
});
document.body.append(card);
let x = 0;
let y = 0;
let tx = 0;
let ty = 0;
let raf = 0;
let then = 0;
const run = (t) => {
const k = 1 - Math.exp(-Math.min(50, t - then || 16) / 120);
then = t;
const vx = (tx - x) * k;
x += vx;
y += (ty - y) * k;
card.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${Math.max(-6, Math.min(6, vx * 0.35)).toFixed(2)}deg)`;
raf = card.classList.contains('on') || Math.abs(tx - x) > 0.3 ? requestAnimationFrame(run) : 0;
};
peek.addEventListener('pointerenter', (e) => {
pics.forEach((p) => { p.src ||= p.dataset.src; });
x = tx = e.clientX;
y = ty = e.clientY;
});
peek.addEventListener('pointermove', (e) => {
tx = Math.max(e.clientX, innerWidth * 0.62); // never over the words
ty = e.clientY;
const a = e.target.closest('[data-peek]');
card.classList.toggle('on', !!a);
if (a) pics.forEach((p, i) => p.classList.toggle('on', i === [...$$('[data-peek]', peek)].indexOf(a)));
if (!raf) {
then = 0;
raf = requestAnimationFrame(run);
}
}, { passive: true });
peek.addEventListener('pointerleave', () => card.classList.remove('on'));
}
$$('[data-strip]').forEach((strip) => {
const near = new IntersectionObserver(([e]) => {
if (!e.isIntersecting) return;
near.disconnect();
quiet(strip, 0.7).then(() => import('./wall.js?v=d99e9af5')).then((m) => m.stripWall(strip)).catch(() => strip.remove());
}, { rootMargin: '200% 0px' });
near.observe(strip);
});
const night = $('[data-night]');
if (night) {
const near = new IntersectionObserver(([e]) => {
if (!e.isIntersecting) return;
near.disconnect();
quiet(night, 1).then(() => import('./room.js?v=d173187c')).then((m) => m.nightRoom(night)).catch(() => night.classList.add('no-webgl'));
}, { rootMargin: '220% 0px' });
near.observe(night);
}
$$('[data-mark]').forEach((m) => new IntersectionObserver(([e]) => {
m.classList.toggle('in', e.isIntersecting);
m.classList.toggle('lg-go', e.isIntersecting && !reduced);
}, { threshold: 0.35 }).observe(m));
import('./pointer.js?v=d8371ced').then((m) => m.initPointer());
const mat = $('[data-mat]');
if (mat) {
let begun = false;
const begin = () => {
if (begun) return;
begun = true;
import('./materials.js?v=c5d90df1').then((m) => m.initMaterials(mat)).catch(() => mat.classList.add('is-flat'));
};
if (!navigator.connection?.saveData) addEventListener('load', () => setTimeout(() => (window.requestIdleCallback ?? setTimeout)(begin), 3600));
const near = new IntersectionObserver(([e]) => {
if (!e.isIntersecting) return;
near.disconnect();
begin();
}, { rootMargin: '120% 0px' });
near.observe(mat);
}
if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) $$('[data-depth], .ph').forEach((sec) => {
const x = { x: 0, v: 0 };
const y = { x: 0, v: 0 };
let tx = 0;
let ty = 0;
let was = '';
sec.addEventListener('pointermove', (e) => {
tx = e.clientX / page.w - 0.5;
ty = e.clientY / page.h - 0.5;
}, { passive: true });
scene(sec, (dt) => {
const k = `${follow(x, tx, dt, 340).toFixed(4)} ${follow(y, ty, dt, 340).toFixed(4)}`;
if (k === was) return;
was = k;
sec.style.setProperty('--px', x.x.toFixed(4));
sec.style.setProperty('--py', y.x.toFixed(4));
});
});
const chapters = $$('[data-ch]');
if (chapters.length && !reduced) {
const list = chapters.map((c) => {
const shade = document.createElement('i');
shade.className = 'ch__shade';
c.firstElementChild.append(shade);
return { c, inn: c.firstElementChild, par: $('.ch__par', c), shade, k: '' };
});
const track = chapters[0].parentElement;
box(track);
chapters.forEach(box);
root.classList.add('has-ch');
scene($('[data-chapters]'), () => {
const wide = page.w > 900;
const tops = list.map(({ c }, i) => (wide ? Math.max(0, box(track).top + i * box(c).height - page.y) : box(c).top - page.y));
list.forEach((o, i) => {
const over = i + 1 < list.length ? smooth(clamp(1 - tops[i + 1] / page.h)) : 0;
const come = clamp(1 - tops[i] / page.h);
const key = `${over.toFixed(4)} ${come.toFixed(4)} ${wide}`;
if (o.k === key) return;
o.k = key;
o.inn.style.transform = wide ? `translate3d(0,${(over * -2.5).toFixed(3)}vh,0) scale(${(1 - over * 0.06).toFixed(5)})` : '';
o.shade.style.opacity = wide ? (over * 0.66).toFixed(3) : 0;
o.par.style.transform = `translate3d(0,${((1 - come) * 13 - over * 5).toFixed(3)}%,0) scale(${(1.14 - come * 0.1).toFixed(5)})`;
});
});
}
$$('[data-lit]').forEach((sec) => {
const wall = $('[data-lit-wall]', sec);
const glow = $('[data-lit-glow]', sec);
if (reduced) {
wall.style.setProperty('--mx', '50%');
wall.style.setProperty('--my', '50%');
sec.classList.add('is-bright');
return;
}
const names = $('.lit__on', wall);
const spot = document.createElement('div');
spot.className = 'lit__spot';
names.replaceWith(spot);
spot.append(names);
const x = { x: 0.2, v: 0 };
const y = { x: 0.4, v: 0 };
let tx = 0.2;
let ty = 0.4;
let held = -1e9;
let cx = null;
let cy = 0;
let half = 0;
box(sec);
box(wall);
const measure = () => {
half = Math.round(spot.offsetWidth / 2);
const r = wall.getBoundingClientRect();
names.style.width = `${r.width}px`;
names.style.height = `${r.height}px`;
};
new ResizeObserver(measure).observe(wall);
sec.addEventListener('pointermove', (e) => {
cx = e.clientX;
cy = e.clientY;
held = performance.now();
}, { passive: true });
let drift = 1;
scene(sec, (dt, t) => {
const b = box(wall);
const a = box(sec);
const alone = t - held > 1600;
if (cx !== null && !alone) {
tx = (cx - b.left) / b.width;
ty = (cy + page.y - b.top) / b.height;
} else {
tx = 0.5 + Math.sin(t / 3100) * 0.42;
ty = 0.5 + Math.sin(t / 1900) * 0.34;
}
drift += ((alone ? 1 : 0) - drift) * (1 - Math.exp(-dt / 500)); // hand to lamp and back without a jerk
const lag = 170 + drift * 520;
const px = Math.round(follow(x, tx, dt, lag) * b.width);
const py = Math.round(follow(y, ty, dt, lag) * b.height);
spot.style.transform = `translate3d(${px - half}px,${py - half}px,0)`;
names.style.transform = `translate3d(${half - px}px,${half - py}px,0)`;
glow.style.transform = `translate3d(${(b.left - a.left + px).toFixed(1)}px,${(b.top - a.top + py).toFixed(1)}px,0)`;
});
});
$$('details.faq').forEach((d) => {
const body = $('.faq__a', d);
const ease = { duration: reduced ? 0 : 380, easing: 'cubic-bezier(.2,.8,.2,1)' };
$('summary', d).addEventListener('click', (e) => {
e.preventDefault();
if (d.open) {
body.animate({ height: [`${body.offsetHeight}px`, '0px'] }, ease).onfinish = () => { d.open = false; };
} else {
d.open = true;
body.animate({ height: ['0px', `${body.offsetHeight}px`] }, ease);
}
});
});
const filters = $('[data-filters]');
const hall = $('[data-hall-page]');
if (hall) import('./corridor.js?v=882a348c').then(async (m) => {
const frames = $$('[data-frame]');
const rows = $$('.cards li');
const status = $('[data-filter-status]');
const walk = await m.initCorridor(hall, frames, (a) => a.click());
const pick = (b) => {
$$('button', filters).forEach((x) => x.setAttribute('aria-pressed', x === b));
rows.forEach((li) => { li.hidden = b.value !== 'all' && li.dataset.place !== b.value; });
walk.filter(b.value);
status.textContent = `${rows.filter((li) => !li.hidden).length} walls shown`;
};
filters.addEventListener('click', (e) => e.target.closest('button') && pick(e.target.closest('button')));
if (/^#(health|work|hospitality|home)$/.test(location.hash)) pick($(`[value=${location.hash.slice(1)}]`, filters));
const sound = $('[data-sound]');
let play;
sound.addEventListener('click', () => {
play ??= m.ambience();
const on = sound.getAttribute('aria-pressed') !== 'true';
sound.setAttribute('aria-pressed', on);
play(on);
});
new IntersectionObserver(([e]) => {
if (!e.isIntersecting && sound.getAttribute('aria-pressed') === 'true') {
sound.setAttribute('aria-pressed', 'false');
play?.(false);
}
}).observe(hall);
});
const shots = $$('a[data-lightbox]');
if (shots.length) {
const icon = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const box = document.createElement('dialog');
box.className = 'lightbox';
box.setAttribute('aria-label', 'Project photo');
box.innerHTML = html(`<img class="lightbox__img" alt=""><div class="lightbox__bar"><p class="lightbox__cap" aria-live="polite"></p><button class="round" type="button" data-step="-1" aria-label="Previous photo">${icon('M15 5l-7 7 7 7')}</button><button class="round" type="button" data-step="1" aria-label="Next photo">${icon('M9 5l7 7-7 7')}</button></div><button class="round lightbox__x" type="button" data-close aria-label="Close photo">${icon('M6 6l12 12M18 6L6 18')}</button>`);
document.body.append(box);
const img = $('img', box);
const cap = $('.lightbox__cap', box);
let list = shots;
let at = 0;
const show = (i) => {
at = (i + list.length) % list.length;
const a = list[at];
img.src = a.href;
img.alt = $('img', a)?.alt ?? a.dataset.title ?? '';
cap.textContent = a.dataset.title ?? $('.tile__cap', a)?.textContent ?? img.alt;
img.classList.remove('swap');
void img.offsetWidth;
img.classList.add('swap');
};
shots.forEach((a) => a.addEventListener('click', (e) => {
if (e.metaKey || e.ctrlKey) return;
e.preventDefault();
list = shots.filter((s) => !s.closest('[hidden]'));
const thumb = $('img', a);
const open = () => {
show(list.indexOf(a));
img.classList.remove('swap');
box.showModal();
};
if (!thumb || !document.startViewTransition || reduced) return open();
root.classList.add('morph');
thumb.style.viewTransitionName = 'shot';
const full = new Image();
full.src = a.href;
Promise.race([full.decode().catch(() => {}), new Promise((r) => { setTimeout(r, 350); })]).then(() => {
const vt = document.startViewTransition(() => {
thumb.style.viewTransitionName = '';
img.style.viewTransitionName = 'shot';
open();
});
vt.finished.finally(() => {
img.style.viewTransitionName = '';
root.classList.remove('morph');
});
});
}));
box.addEventListener('click', (e) => {
const b = e.target.closest('button');
if (b?.dataset.step) show(at + Number(b.dataset.step));
else if (b || e.target === box || e.target === img) box.close();
});
box.addEventListener('keydown', (e) => {
if (e.key === 'ArrowRight') show(at + 1);
if (e.key === 'ArrowLeft') show(at - 1);
});
let sx = 0;
box.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
box.addEventListener('touchend', (e) => {
const d = e.changedTouches[0].clientX - sx;
if (Math.abs(d) > 50) show(at + (d < 0 ? 1 : -1));
}, { passive: true });
}
for (const [sel, file, fn] of [['[data-book]', './book.js?v=c2bc8c26', 'initBook'], ['[data-names]', './tale.js?v=2e0bf3ac', 'clearing']]) {
const el = $(sel);
if (!el) continue;
if (reduced) el.classList.add('is-flat');
else (file === './book.js?v=c2bc8c26' ? import('./book.js?v=c2bc8c26') : import('./tale.js?v=2e0bf3ac')).then((m) => m[fn](el)).catch(() => el.classList.add('is-flat'));
}
const visit = $('[data-visit]');
if (visit) import('./visit.js?v=37ee7a39').then((x) => x.initVisit(visit));
const plants = $('[data-plants]');
if (plants) import('./plants.js?v=6609481b').then((x) => x.initPlants(plants));
const cut = $('[data-cut]');
if (cut) {
const near = new IntersectionObserver(([e]) => {
if (!e.isIntersecting) return;
near.disconnect();
quiet(cut, 1).then(() => import('./cut.js?v=a739831c')).then((x) => x.initCut(cut)).catch(() => cut.classList.add('is-flat'));
}, { rootMargin: '200% 0px' });
near.observe(cut);
}
const pals = $('[data-pals]');
if (pals) {
const show = (b) => {
$$('button', pals).forEach((x) => x.setAttribute('aria-pressed', x === b));
let n = 0;
$$('[data-pal]').forEach((c) => {
const hide = c.dataset.pal !== b.dataset.palAt;
const came = c.hidden && !hide;
c.hidden = hide;
if (came && !reduced) c.animate([{ opacity: 0, transform: 'translateY(1.4rem)' }, { opacity: 1, transform: 'none' }], { duration: 850, delay: (n++ % 4) * 70, easing: 'cubic-bezier(.19,.8,.22,1)', fill: 'backwards' });
});
};
pals.addEventListener('click', (e) => e.target.closest('button') && show(e.target.closest('button')));
show($('button', pals));
}
for (const [sel, fn] of [['[data-reel]', 'reel'], ['[data-years]', 'years']]) {
const el = $(sel);
if (el) import('./reel.js?v=61d99f51').then((m) => m[fn](el));
}
const form = $('[data-form]');
if (form) import('./form.js?v=aeb4d5d6').then((m) => m.initForm(form));
const dock = $('[data-dock]');
if (dock && hero) {
new IntersectionObserver(([e]) => dock.classList.toggle('on', !e.isIntersecting && e.boundingClientRect.top < 0)).observe(hero.closest('[data-pin]'));
} else if (dock && ($('[data-form]') || vis)) {
dock.remove(); // these pages already end in an action
} else if (dock) {
addEventListener('scroll', () => dock.classList.toggle('on', scrollY > 320), { passive: true });
}
const end = $('.cta');
if (dock && end) new IntersectionObserver(([e]) => dock.classList.toggle('away', e.isIntersecting)).observe(end);
const fetched = new Set([location.pathname]);
const warm = (e) => {
const a = e.target.closest?.('a[href*=".html"]:not([href^="http"])');
if (!a || a.matches('[data-lightbox]') || navigator.connection?.saveData) return;
const path = new URL(a.href).pathname;
if (fetched.has(path)) return;
fetched.add(path);
const l = document.createElement('link');
l.rel = 'prefetch';
l.href = path;
document.head.append(l);
};
document.addEventListener('pointerover', warm, { passive: true });
document.addEventListener('touchstart', warm, { passive: true });

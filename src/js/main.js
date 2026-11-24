/* Modiwall site behaviour. No dependencies, no third-party requests. */
import { html } from './html.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
root.classList.add('js');

/* the GitHub Pages copy is a preview: keep it out of search results */
if (location.hostname.endsWith('.github.io')) {
  const tag = document.querySelector('meta[name=robots]');
  if (tag) tag.content = 'noindex';
}

/* ---- eased wheel scrolling (mouse only): scroll-linked scenes and the page move in the same frame ---- */
if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let to = scrollY;
  let at = scrollY;
  let raf = 0;
  let then = 0;
  const run = (t) => {
    const dt = Math.min(50, t - then || 16);
    then = t;
    at += (to - at) * (1 - Math.exp(-dt / 110));
    if (Math.abs(to - at) < 0.4) at = to;
    scrollTo({ top: at, behavior: 'instant' });
    raf = at === to ? 0 : requestAnimationFrame(run);
  };
  addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (e.target.closest('dialog[open], textarea, select, .menu, [data-native-scroll]')) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? innerHeight : 1;
    if (!raf) at = to = scrollY;
    to = Math.max(0, Math.min(root.scrollHeight - innerHeight, to + e.deltaY * unit));
    if (!raf) {
      then = 0;
      raf = requestAnimationFrame(run);
    }
  }, { passive: false });
  // anything else that scrolls (keyboard, scrollbar, anchors) takes over at once
  addEventListener('keydown', () => { cancelAnimationFrame(raf); raf = 0; });
  addEventListener('pointerdown', () => { cancelAnimationFrame(raf); raf = 0; });
}

/* ---- buttons lean toward the pointer ---- */
if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) $$('.btn').forEach((b) => {
  b.addEventListener('pointermove', (e) => {
    const r = b.getBoundingClientRect();
    b.style.translate = `${((e.clientX - r.left - r.width / 2) * 0.16).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * 0.26).toFixed(1)}px`;
  }, { passive: true });
  b.addEventListener('pointerleave', () => { b.style.translate = ''; });
});

/* ---- header: hides going down, returns going up ---- */
const top = $('[data-top]');
let lastY = 0;
let ticking = false;
function onScroll() {
  const y = scrollY;
  top.classList.toggle('is-stuck', y > 40);
  top.classList.toggle('is-away', y > 500 && y > lastY + 2);
  lastY = y;
  ticking = false;
}
addEventListener('scroll', () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(onScroll);
  }
}, { passive: true });
onScroll();

/* ---- mobile menu ---- */
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

/* ---- headings: words slide in one after another, like panels ---- */
if (!reduced) $$('h2, .open h1, .quote h1, .lost h1').forEach((h) => {
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

/* ---- key photos are put together from panels ---- */
if (!reduced) $$('[data-panels]').forEach((el) => {
  const cols = 8;
  const rows = 5;
  const mask = document.createElement('div');
  mask.className = 'panels';
  mask.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < cols * rows; i++) {
    const t = document.createElement('i');
    t.style.setProperty('--i', (cols - 1 - (i % cols)) + (rows - 1 - Math.floor(i / cols)) + ((i * 7) % 3) * 0.5);
    mask.append(t);
  }
  el.append(mask);
  el.dataset.watch = '';
  mask.firstElementChild.addEventListener('transitionend', () => setTimeout(() => mask.remove(), 900), { once: true });
});

/* ---- slot-in reveals ---- */
const io = new IntersectionObserver((es) => {
  for (const e of es) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
$$('[data-slots]').forEach((g) => [...g.children].forEach((c, i) => {
  c.dataset.slot = '';
  c.style.setProperty('--i', i % 4);
}));
$$('[data-slot], [data-watch]').forEach((el) => io.observe(el));

/* ---- hero wall: starts after the first paint ---- */
const hero = $('[data-hero]');
if (hero) {
  const start = () => import('./wall.js').then((m) => m.heroWall(hero)).catch(() => hero.classList.add('no-webgl'));
  if (document.readyState === 'complete') start();
  else requestAnimationFrame(() => setTimeout(start, 0));
}

/* ---- text that lights up word by word (CSS drives it; this only marks the words) ---- */
if (!reduced) $$('[data-scrub]').forEach((p) => {
  const words = p.textContent.trim().split(/\s+/);
  p.textContent = '';
  words.forEach((w, i) => {
    const n = document.createElement('span');
    n.className = 'k';
    n.style.setProperty('--i', i);
    n.textContent = w;
    p.append(n, ' ');
  });
});

/* ---- visualiser ---- */
const vis = $('[data-vis]');
if (vis) import('./visualise.js').then((m) => m.initVisualiser(vis));

/* ---- scroll scenes ---- */
if ($('[data-system]')) import('./system.js').then((m) => m.initSystem($('[data-system]')));

/* ---- rooms: keep keyboard focus and the sideways track together ---- */
const rooms = $('[data-rooms]');
if (rooms) {
  const track = $('[data-track]', rooms);
  track.addEventListener('focusin', (e) => {
    if (getComputedStyle(track).animationName === 'none' || innerWidth <= 800 || !e.target.matches(':focus-visible')) return;
    const a = e.target.closest('li') ?? e.target;
    const f = Math.min(1, Math.max(0, (a.offsetLeft - innerWidth * 0.2) / (track.scrollWidth - innerWidth)));
    scrollTo({ top: rooms.offsetTop + f * (rooms.offsetHeight - innerHeight), behavior: 'smooth' });
  });
}

/* ---- lists that show a photo beside the pointer ---- */
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
    tx = e.clientX;
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

/* ---- a living strip along the foot of the page, built only when it is near ---- */
const strip = $('[data-strip]');
if (strip) {
  const near = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    near.disconnect();
    import('./wall.js').then((m) => m.stripWall(strip)).catch(() => {});
  }, { rootMargin: '0px 0px -12% 0px' });
  near.observe(strip);
}

/* ---- questions: animated open and close ---- */
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

/* ---- project filters ---- */
const filters = $('[data-filters]');
if (filters) {
  const tiles = $$('.tile');
  const status = $('[data-filter-status]');
  filters.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const apply = () => {
      $$('button', filters).forEach((x) => x.setAttribute('aria-pressed', x === b));
      let n = 0;
      tiles.forEach((t) => {
        t.hidden = b.value !== 'all' && t.dataset.place !== b.value;
        if (!t.hidden) n++;
        t.classList.add('in');
      });
      if (status) status.textContent = `${n} projects shown`;
    };
    if (document.startViewTransition && !reduced) document.startViewTransition(apply);
    else apply();
  });
}

if (filters && /^#(health|work|hospitality|home)$/.test(location.hash)) filters.querySelector(`[value=${location.hash.slice(1)}]`).click();

/* ---- lightbox ---- */
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
    img.alt = $('img', a).alt;
    cap.textContent = $('.tile__cap', a)?.textContent ?? img.alt;
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
    if (!document.startViewTransition || reduced) return open();
    // the photo you clicked grows into the full-screen one
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

/* ---- quote form ---- */
const form = $('[data-form]');
if (form) import('./form.js').then((m) => m.initForm(form));

/* ---- phones: a quiet way to act, once the hero has passed ---- */
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

/* ---- fetch the next page while the visitor is still hovering the link ---- */
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

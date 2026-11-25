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

/* ---- headings: words come into focus one after another ---- */
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

/* ---- slot-in reveals ---- */
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

/* ---- hero wall: starts after the first paint ---- */
const hero = $('[data-hero]');
if (hero) {
  const start = () => import('./wall.js').then((m) => m.heroWall(hero)).catch(() => hero.classList.add('no-webgl'));
  if (document.readyState === 'complete') start();
  else requestAnimationFrame(() => setTimeout(start, 0));
}

/* ---- visualiser ---- */
const vis = $('[data-vis]');
if (vis) import('./visualise.js').then((m) => m.initVisualiser(vis));

/* ---- scroll scenes ---- */
const system = $('[data-system]');
if (system) {
  const near = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    near.disconnect();
    import('./system.js').then((m) => m.initSystem(system));
  }, { rootMargin: '150% 0px' });
  near.observe(system);
}

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

/* ---- living strips along page closings, built only when near ---- */
$$('[data-strip]').forEach((strip) => {
  const near = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    near.disconnect();
    import('./wall.js').then((m) => m.stripWall(strip)).catch(() => strip.remove());
  }, { rootMargin: '0px 0px -8% 0px' });
  near.observe(strip);
});

/* ---- after dark: one lamp ---- */
const night = $('[data-night]');
if (night) {
  const near = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    near.disconnect();
    import('./room.js').then((m) => m.nightRoom(night)).catch(() => night.classList.add('no-webgl'));
  }, { rootMargin: '90% 0px' });
  near.observe(night);
}

/* ---- the mark draws itself whenever it arrives ---- */
$$('[data-mark]').forEach((m) => new IntersectionObserver(([e]) => {
  m.classList.toggle('in', e.isIntersecting);
  m.classList.toggle('lg-go', e.isIntersecting && !reduced);
}, { threshold: 0.35 }).observe(m));

/* ---- the pointer ---- */
import('./pointer.js').then((m) => m.initPointer());

/* ---- stone, timber, light ---- */
const mat = $('[data-mat]');
if (mat) {
  const near = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    near.disconnect();
    import('./materials.js').then((m) => m.initMaterials(mat)).catch(() => mat.classList.add('is-flat'));
  }, { rootMargin: '120% 0px' });
  near.observe(mat);
}

/* ---- depth: page openings answer the pointer in layers ---- */
if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) $$('[data-depth], .ph').forEach((sec) => {
  let x = 0;
  let y = 0;
  let tx = 0;
  let ty = 0;
  let raf = 0;
  let then = 0;
  const run = (t) => {
    const k = 1 - Math.exp(-Math.min(50, t - then || 16) / 240);
    then = t;
    x += (tx - x) * k;
    y += (ty - y) * k;
    sec.style.setProperty('--px', x.toFixed(4));
    sec.style.setProperty('--py', y.toFixed(4));
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(run) : 0;
  };
  sec.addEventListener('pointermove', (e) => {
    tx = e.clientX / innerWidth - 0.5;
    ty = e.clientY / innerHeight - 0.5;
    if (!raf) {
      then = 0;
      raf = requestAnimationFrame(run);
    }
  }, { passive: true });
});

/* ---- one house: chapters laid over one another, the one beneath falling back ---- */
const chapters = $$('[data-ch]');
if (chapters.length && !reduced) {
  let live = false;
  const inner = chapters.map((c) => c.firstElementChild);
  const run = () => {
    if (!live) return;
    const vh = innerHeight;
    const tops = chapters.map((c) => c.getBoundingClientRect().top);
    chapters.forEach((c, i) => {
      const over = i + 1 < chapters.length ? Math.min(1, Math.max(0, 1 - tops[i + 1] / vh)) : 0;
      const come = Math.min(1, Math.max(0, 1 - tops[i] / vh));
      const key = `${over.toFixed(3)}${come.toFixed(3)}`;
      if (c.dataset.k === key) return;
      c.dataset.k = key;
      inner[i].style.setProperty('--over', over.toFixed(3));
      inner[i].style.setProperty('--come', come.toFixed(3));
    });
    requestAnimationFrame(run);
  };
  new IntersectionObserver(([e]) => {
    const was = live;
    live = e.isIntersecting;
    if (live && !was) requestAnimationFrame(run);
  }).observe($('[data-chapters]'));
  root.classList.add('has-ch');
}

/* ---- client names, found by lamplight: follows the pointer, wanders when left alone ---- */
$$('[data-lit]').forEach((sec) => {
  const wall = $('[data-lit-wall]', sec);
  const glow = $('[data-lit-glow]', sec);
  let box = null;
  let x = 0.2;
  let y = 0.4;
  let tx = x;
  let ty = y;
  let held = 0;
  let live = false;
  let then = 0;
  const run = (t) => {
    if (!live) return;
    const dt = Math.min(50, t - then || 16);
    then = t;
    if (t - held > 1600) {
      tx = 0.5 + Math.sin(t / 3100) * 0.42;
      ty = 0.5 + Math.sin(t / 1900) * 0.34;
    }
    const k = 1 - Math.exp(-dt / (t - held > 1600 ? 520 : 150));
    x += (tx - x) * k;
    y += (ty - y) * k;
    wall.style.setProperty('--mx', `${(x * 100).toFixed(2)}%`);
    wall.style.setProperty('--my', `${(y * 100).toFixed(2)}%`);
    if (box) glow.style.transform = `translate3d(${(box.x + x * box.w).toFixed(0)}px,${(box.y + y * box.h).toFixed(0)}px,0)`;
    requestAnimationFrame(run);
  };
  const measure = () => {
    const a = sec.getBoundingClientRect();
    const b = wall.getBoundingClientRect();
    box = { x: b.left - a.left, y: b.top - a.top, w: b.width, h: b.height };
  };
  if (reduced) {
    wall.style.setProperty('--mx', '50%');
    wall.style.setProperty('--my', '50%');
    sec.classList.add('is-bright');
    return;
  }
  sec.addEventListener('pointermove', (e) => {
    const b = wall.getBoundingClientRect();
    tx = (e.clientX - b.left) / b.width;
    ty = (e.clientY - b.top) / b.height;
    held = performance.now();
  }, { passive: true });
  new ResizeObserver(measure).observe(wall);
  new IntersectionObserver(([e]) => {
    const was = live;
    live = e.isIntersecting;
    if (live && !was) {
      measure();
      requestAnimationFrame(run);
    }
  }).observe(sec);
});

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

/* ---- the walk through the walls, its filters and its sound ---- */
const filters = $('[data-filters]');
const hall = $('[data-hall-page]');
if (hall) import('./corridor.js').then(async (m) => {
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

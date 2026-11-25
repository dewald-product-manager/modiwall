/* Three scenes on the home page: the rooms, the record, and who it is for. */
import { page, scene as onScreen, box, follow, clamp, span, smooth } from './frame.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---- at home: one long room. The page scrolls down, the house moves past; its rooms can be named and gone to ---- */
export function rooms(sec) {
  const track = sec.querySelector('[data-track]');
  const list = [...sec.querySelectorAll('[data-room-at]')];
  const marks = [...sec.querySelectorAll('[data-room-go]')];
  const names = [...sec.querySelectorAll('[data-room-name]')];
  const line = sec.querySelector('[data-room-line]');
  const intro = sec.querySelector('[data-room-intro]');
  const wide = () => page.w > 800;
  let span0 = 0;
  let at = [];
  let now = -2;
  const measure = () => {
    if (!wide()) {
      track.style.transform = '';
      list.forEach((l) => { l.firstElementChild.style.transform = ''; l.style.removeProperty('--in'); });
      return;
    }
    span0 = Math.max(1, track.scrollWidth - page.w);
    at = list.map((l) => ({ x: l.offsetLeft, w: l.offsetWidth }));
  };
  new ResizeObserver(measure).observe(track);
  measure();
  const go = (k) => {
    const b = box(sec);
    const f = clamp((at[k].x + at[k].w / 2 - page.w / 2) / span0);
    scrollTo({ top: b.top + f * (b.height - page.h), behavior: reduced ? 'instant' : 'smooth' });
  };
  marks.forEach((m, k) => m.addEventListener('click', () => go(k)));
  track.addEventListener('focusin', (e) => {
    const k = list.indexOf(e.target.closest('[data-room-at]'));
    if (k >= 0 && wide() && e.target.matches(':focus-visible')) go(k);
  });
  // it can also be pulled along
  let from = null;
  if (fine) {
    track.addEventListener('pointerdown', (e) => { if (e.button === 0) from = { x: e.clientX, y: scrollY, moved: 0 }; });
    addEventListener('pointermove', (e) => {
      if (!from) return;
      const b = box(sec);
      from.moved = Math.max(from.moved, Math.abs(e.clientX - from.x));
      if (from.moved > 5) scrollTo({ top: from.y - ((e.clientX - from.x) / span0) * (b.height - page.h) * 1.15, behavior: 'instant' });
    });
    addEventListener('pointerup', () => setTimeout(() => { from = null; }, 0));
    track.addEventListener('click', (e) => {
      if (from && from.moved > 5) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
    track.addEventListener('dragstart', (e) => e.preventDefault());
  }
  if (reduced) return;
  sec.classList.add('is-live');
  const cur = { x: -1, v: 0 };
  onScreen(sec, (dt, t, top, h) => {
    if (!wide()) return;
    const to = clamp(-top / Math.max(1, h - page.h));
    if (cur.x < 0) cur.x = to;
    const p = follow(cur, to, dt, 170);
    const x = p * span0;
    track.style.transform = `translate3d(${(-x).toFixed(2)}px,0,0)`;
    const mid = x + page.w / 2;
    let best = -1;
    let near = 1e9;
    for (let k = 0; k < list.length; k++) {
      const a = at[k];
      const off = (a.x + a.w / 2 - mid) / page.w; // how far from the middle of the window
      if (Math.abs(off) > 1.3) continue;
      if (Math.abs(off) * page.w < near) {
        near = Math.abs(off) * page.w;
        best = k;
      }
      list[k].firstElementChild.style.transform = `translate3d(${(off * -7).toFixed(3)}%,0,0) scale(1.16)`; // the room behind its frame
      list[k].style.setProperty('--in', clamp(1.25 - Math.abs(off) * 1.5).toFixed(3));
    }
    line.style.transform = `scaleX(${p.toFixed(4)})`;
    const open = 1 - span(x, page.w * 0.12, page.w * 0.5);
    intro.style.opacity = open.toFixed(3);
    const shown = open > 0.35 ? -1 : best;
    if (shown !== now) {
      now = shown;
      names.forEach((n, k) => n.classList.toggle('on', k === now));
      marks.forEach((m, k) => (k === now ? m.setAttribute('aria-current', 'true') : m.removeAttribute('aria-current')));
    }
  });
}

/* ---- on the record: tall shutters turn to the light, one after another, and the picture is whole ---- */
export function record(sec) {
  const shots = [...sec.querySelectorAll('[data-shutters]')].map((f, j) => {
    const img = f.querySelector('img');
    const n = page.w > 800 ? 9 : 5;
    const slats = [];
    const wrap = document.createElement('div');
    wrap.className = 'shut';
    wrap.setAttribute('aria-hidden', 'true');
    for (let k = 0; k < n; k++) {
      const s = document.createElement('i');
      const c = img.cloneNode();
      c.alt = '';
      c.removeAttribute('loading');
      c.style.width = `${n * 100}%`;
      c.style.left = `${-k * 100}%`;
      s.append(c, document.createElement('b'));
      wrap.append(s);
      slats.push({ s, c, b: s.lastChild, d: Math.abs(k - (n - 1) * (j % 2 ? 0.72 : 0.28)) / n, last: -1 });
    }
    return { f, img, wrap, slats, sx: { x: 0, v: 0 }, go: 0, done: false };
  });
  if (reduced) return;
  shots.forEach((o) => {
    o.f.classList.add('is-shut');
    o.f.append(o.wrap);
    onScreen(o.f, (dt, t, top, h) => {
      if (o.done) return;
      o.go = clamp((page.h * 0.94 - top) / (page.h * 0.62));
      const p = follow(o.sx, o.go, dt, 210);
      let all = true;
      for (const q of o.slats) {
        const k = smooth(clamp((p - q.d * 0.5) / 0.5));
        if (k < 0.999) all = false;
        if (Math.abs(k - q.last) < 0.0004) continue;
        q.last = k;
        const turn = (1 - k) * 88;
        q.s.style.transform = `perspective(1400px) rotateY(${turn.toFixed(2)}deg)`;
        q.c.style.transform = `translate3d(0,${((1 - k) * 4).toFixed(2)}%,0) scale(${(1.12 - 0.12 * k).toFixed(4)})`;
        q.b.style.opacity = (1 - k).toFixed(3);
      }
      if (all && p > 0.998) {
        o.done = true;
        o.f.classList.add('is-open');
        setTimeout(() => o.wrap.remove(), 700);
      }
    });
  });
}

/* ---- who it is for: three doors, one open ---- */
export function who(sec) {
  const doors = [...sec.querySelectorAll('[data-door]')];
  const open = (k) => {
    sec.style.setProperty('--open', k);
    doors.forEach((d, i) => d.classList.toggle('on', i === k));
  };
  doors.forEach((d, k) => {
    d.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && open(k));
    d.addEventListener('focusin', () => open(k));
    d.addEventListener('click', (e) => {
      if (page.w <= 800 || d.classList.contains('on') || e.target.closest('a')) return;
      open(k);
    });
  });
  open(0);
  if (reduced) return;
  const x = { x: 0, v: 0 };
  let tx = 0;
  sec.addEventListener('pointermove', (e) => { tx = e.clientX / page.w - 0.5; }, { passive: true });
  let was = '';
  onScreen(sec, (dt) => {
    const v = follow(x, tx, dt, 380).toFixed(4);
    if (v !== was) sec.style.setProperty('--px', (was = v));
  });
}

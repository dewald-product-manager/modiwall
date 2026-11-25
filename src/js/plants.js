/* The plants page: one wall, six plantings. A new one is chosen and the wall folds away and grows again from where you pressed. */
import { createWall, STYLE_NAMES, loadPlate } from './wall.js';
import { page, box, follow, clamp } from './frame.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
/* the light each planting is made for: how much day, its colour, how much lamp */
const LIGHT = [[1, [1, 1, 1], 0], [1.04, [1.05, 1.01, 0.93], 0], [0.3, [1.04, 0.98, 0.9], 0.8], [1.02, [0.97, 1.0, 1.05], 0], [1.08, [1.05, 1.0, 0.92], 0], [0.34, [1.02, 0.97, 1.02], 0.72]];

export function initPlants(sec) {
  const areas = [...sec.querySelectorAll('[data-area-at]')];
  const themes = [...sec.querySelectorAll('[data-theme]')];
  const says = [...sec.querySelectorAll('[data-theme-say]')];
  const cards = [...document.querySelectorAll('.sp')];
  const notes = [...document.querySelectorAll('[data-area-note]')];
  let wall = null;
  let now = 0;
  const pick = (v, from) => {
    if (v === now && from) return;
    now = v;
    const area = v < 3 ? 'in' : 'ex';
    areas.forEach((b) => b.setAttribute('aria-pressed', b.dataset.areaAt === area));
    themes.forEach((b) => {
      b.setAttribute('aria-pressed', Number(b.dataset.theme) === v);
      b.parentElement.hidden = b.parentElement.dataset.area !== area;
    });
    says.forEach((s) => s.classList.toggle('on', Number(s.dataset.themeSay) === v));
    notes.forEach((n) => { n.hidden = n.dataset.areaNote !== area; });
    cards.forEach((c) => {
      const hide = c.dataset.area !== area;
      if (c.hidden === hide) return;
      c.hidden = hide;
      if (!hide && !reduced) c.animate([{ opacity: 0, transform: 'translateY(1.6rem)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: (cards.filter((x) => x.dataset.area === area).indexOf(c) % 4) * 80, easing: 'cubic-bezier(.19,.8,.22,1)', fill: 'backwards' });
    });
    wall?.show(v, from);
  };
  themes.forEach((b) => b.addEventListener('click', (e) => pick(Number(b.dataset.theme), e)));
  // the same hour of the day, in the other place
  const OTHER = [4, 3, 5, 1, 0, 2];
  areas.forEach((b) => b.addEventListener('click', (e) => (now < 3) !== (b.dataset.areaAt === 'in') && pick(OTHER[now], e)));
  pick(/^#exterior/.test(location.hash) ? 4 : 0);
  grow(sec, now).then((w) => {
    wall = w;
    if (wall.at !== now) wall.show(now);
  }).catch(() => sec.classList.add('is-flat'));
}

async function grow(sec, first) {
  const W = await createWall(sec.querySelector('[data-wall]'), { style: first, anchor: [0.3, 0.6] });
  const pin = sec.firstElementChild;
  let n = 0;
  const spot = (i) => [W.L.ox + ((i % W.L.cols) + 0.5) * W.L.m, W.L.oy + (Math.floor(i / W.L.cols) + 0.5) * W.L.m];
  const layout = () => {
    const r = pin.getBoundingClientRect();
    const m = r.width < 700 ? 68 : Math.max(92, r.width / 17);
    const cols = Math.ceil(r.width / m) + 4;
    const rows = Math.ceil(r.height / m) + 4;
    if (!W.place({ w: r.width, h: r.height, cols, rows, m, ox: (r.width - cols * m) / 2, oy: (r.height - rows * m) / 2 })) return;
    n = cols * rows;
    for (let i = 0; i < n; i++) W.plant(i, true, spot(i)[0] / 1800 + Math.sin(i * 12.9) * 0.1);
  };
  layout();
  let timer;
  new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(layout, 140); }).observe(pin);
  const state = { at: first, turn: 0 };
  state.show = async (v, e) => {
    const turn = ++state.turn;
    state.at = v;
    const r = pin.getBoundingClientRect();
    const x = e?.clientX || r.width * 0.3;
    const y = e?.clientY ? e.clientY - r.top : r.height * 0.7;
    const far = Math.hypot(r.width, r.height);
    const d = (i) => Math.hypot(spot(i)[0] - x, spot(i)[1] - y) / far;
    const ready = loadPlate(STYLE_NAMES[v]);
    if (reduced) {
      await W.style(v);
      W.draw();
      return;
    }
    for (let i = 0; i < n; i++) setTimeout(() => turn === state.turn && W.plant(i, false), d(i) * 620);
    await Promise.all([ready, new Promise((f) => { setTimeout(f, 1750); })]);
    if (turn !== state.turn) return;
    await W.style(v);
    if (turn !== state.turn) return;
    for (let i = 0; i < n; i++) W.plant(i, true, d(i) * 1.15);
  };
  const cur = LIGHT[first].flat().map((x) => ({ x, v: 0 }));
  const lx = { x: innerWidth * 0.62, v: 0 };
  const ly = { x: innerHeight * 0.4, v: 0 };
  let tx = 0.64;
  let ty = 0.4;
  sec.addEventListener('pointermove', (e) => {
    const b = box(sec);
    tx = e.clientX / b.width;
    ty = (e.clientY + page.y - b.top) / b.height;
    W.ptr.target = e.pointerType === 'mouse' ? 1 : 0;
    W.ptr.tx = tx * b.width;
    W.ptr.ty = ty * b.height;
    W.parTo = { x: 0.5 - tx, y: 0.5 - ty };
  }, { passive: true });
  sec.addEventListener('pointerleave', () => { W.ptr.target = 0; });
  sec.addEventListener('pointerdown', (e) => {
    const b = box(sec);
    if (!e.target.closest('button')) W.ripple(e.clientX, e.clientY + page.y - b.top);
  }, { passive: true });
  W.run(sec, (dt) => {
    const b = box(sec);
    const to = LIGHT[state.at].flat();
    cur.forEach((c, k) => follow(c, to[k], dt, 1500));
    W.amb = cur[0].x;
    W.tint = [cur[1].x, cur[2].x, cur[3].x];
    W.lamp = { x: follow(lx, tx * b.width, dt, 520), y: follow(ly, ty * b.height, dt, 520), r: Math.min(b.width, b.height) * 0.44, on: cur[4].x };
    W.zoom = 1 + clamp((page.y - b.top) / b.height) * 0.06;
    W.gust += (Math.min(1.2, Math.abs(page.v) * 0.3) - W.gust) * (1 - Math.exp(-dt / 260));
  });
  if (reduced) W.draw();
  sec.classList.add('is-ready');
  return state;
}

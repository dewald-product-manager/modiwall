/* Stone, timber, light: one room, lit one thing at a time. The camera glides from each to the next, every lamp fades the
   way a lamp does, the room falls dark, and then the wall that was there all along is lit from its foot to its top. */
import { createRoom } from './room.js';

const clamp = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => v * v * v * (v * (v * 6 - 15) + 10);
const span = (p, a, b) => smooth(clamp((p - a) / (b - a)));
/* up over [a, b], down again over [c, d] */
const beat = (p, a, b, c, d) => span(p, a, b) * (1 - span(p, c, d));

// along the scroll: where the camera is (x, y, closeness)
const WIDE = [[0, [0.14, 0.4, 1.95]], [0.17, [0.17, 0.42, 1.8]], [0.33, [0.86, 0.44, 1.85]], [0.5, [0.535, 0.44, 1.75]], [0.66, [0.52, 0.48, 1.24]], [1, [0.505, 0.485, 1.0]]];
const TALL = [[0, [0.1, 0.44, 1.12]], [0.17, [0.13, 0.44, 1.08]], [0.33, [0.89, 0.46, 1.08]], [0.5, [0.545, 0.47, 1.1]], [0.66, [0.53, 0.47, 1.04]], [1, [0.5, 0.48, 1.0]]];
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
  // when each line is on stage
  const say = [[-0.2, -0.1, 0.13, 0.19], [0.22, 0.28, 0.35, 0.41], [0.43, 0.49, 0.56, 0.62], [0.64, 0.69, 0.74, 0.79], [0.84, 0.91, 3, 4]];
  function words(p) {
    lines.forEach((n, i) => {
      const [a, b, c, d] = say[i];
      const inn = clamp((p - a) / (b - a));
      const out = clamp((p - c) / (d - c));
      n.style.visibility = inn > 0 && out < 1 ? 'visible' : 'hidden';
      n.style.setProperty('--in', smooth(inn).toFixed(3));
      n.style.setProperty('--out', smooth(out).toFixed(3));
    });
  }
  words(0);
  const R = await createRoom(canvas, 'mat');
  sec.classList.add('is-lit');
  let cur = -1;
  let arrive = 0;
  R.run(sec, (dt) => {
    const r = sec.getBoundingClientRect();
    const to = clamp(-r.top / Math.max(1, r.height - innerHeight));
    cur = cur < 0 ? to : cur + (to - cur) * (1 - Math.exp(-dt / 210));
    arrive += ((r.top < innerHeight * 0.55 ? 1 : 0) - arrive) * (1 - Math.exp(-dt / 700));
    const p = cur;
    const ember = span(p, 0.6, 0.68) * 0.05;
    const grown = span(p, 0.76, 0.96);
    R.w = [
      arrive * (1 - span(p, 0.15, 0.27)) + ember + grown * 0.3,
      beat(p, 0.18, 0.3, 0.36, 0.47) + ember + grown * 0.42,
      beat(p, 0.38, 0.5, 0.57, 0.66) * 1.05 + grown * 0.5,
      grown * 1.02,
    ];
    R.rise = -0.1 + span(p, 0.76, 0.97) * 1.55;
    R.view = camera(canvas.clientWidth < canvas.clientHeight ? TALL : WIDE, p);
    words(p);
  });
}

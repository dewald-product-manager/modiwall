/* The pointer: a fine point that is always exactly where the hand is, and a hairline ring that follows. The ring opens
   over anything that can be pressed, closes when it is, and holds one word over a picture. */
export function initPointer() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const dot = document.createElement('div');
  const ring = document.createElement('div');
  const line = document.createElement('i');
  const word = document.createElement('b');
  dot.className = 'pt';
  ring.className = 'pt-ring';
  ring.append(line, word);
  for (const n of [dot, ring]) {
    n.setAttribute('aria-hidden', 'true');
    document.body.append(n);
  }
  let tx = -100;
  let ty = -100;
  let x = tx;
  let y = ty;
  let raf = 0;
  let then = 0;
  let seen = false;
  const run = (t) => {
    const k = 1 - Math.exp(-Math.min(50, t - then || 16) / 70);
    then = t;
    x += (tx - x) * k;
    y += (ty - y) * k;
    ring.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.08 ? requestAnimationFrame(run) : 0;
  };
  const state = (s) => {
    if (ring.dataset.s === s) return;
    ring.dataset.s = s;
    dot.dataset.s = s;
  };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX;
    ty = e.clientY;
    if (!seen) {
      seen = true;
      x = tx;
      y = ty;
      document.documentElement.classList.add('has-pt');
    }
    dot.style.transform = `translate3d(${tx}px,${ty}px,0)`;
    const t = e.target;
    const named = t.closest?.('[data-cursor]');
    if (t.closest?.('dialog[open], input:not([type=radio],[type=checkbox],[type=range],[type=file]), textarea, select')) state('away');
    else if (named && !t.closest('button')) {
      word.textContent = named.dataset.cursor;
      state('word');
    } else state(t.closest?.('a, button, label, summary, [role=button], input[type=range]') ? 'open' : '');
    if (!raf) {
      then = 0;
      raf = requestAnimationFrame(run);
    }
  }, { passive: true });
  addEventListener('pointerdown', () => ring.classList.add('down'), { passive: true });
  addEventListener('pointerup', () => ring.classList.remove('down'), { passive: true });
  document.addEventListener('pointerleave', () => state('away'));
}

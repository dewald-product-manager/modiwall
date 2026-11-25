/* The commission: five short steps, our own walls beside them, a drawing to scale, and nothing typed is ever lost.
   Without scripts the same form shows all steps at once. */
import { html } from './html.js';
import { createElevation } from './elevation.js';
import { initVine } from './vine.js';

const RULES = {
  name: (v) => (v.trim().length < 2 ? 'Enter your name.' : ''),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter an email address like name@example.co.za.'),
  phone: (v) => (!v.trim() || /^[+\d][\d\s()-]{7,19}$/.test(v.trim()) ? '' : 'Enter a phone number using digits, for example 082 123 4567.'),
};
const num = (v) => (Math.round(v * 100) / 100).toString();

export function initForm(form) {
  const q = new URLSearchParams(location.search);
  const page = form.closest('[data-commission]');
  const $ = (s) => page.querySelector(s);
  const el = (n) => form.elements[n];
  const msg = form.querySelector('[data-msg]');
  const steps = [...form.querySelectorAll('[data-step]')];
  const back = form.querySelector('[data-back]');
  const next = form.querySelector('[data-next]');
  const send = form.querySelector('[type=submit]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const started = Date.now();
  let at = 0;
  let sized = false; // only send a size the visitor actually gave

  /* the wall can be pulled to size by its corner */
  const el0 = $('[data-el]');
  const room = createElevation(el0);
  {
    let on = false;
    const { grip } = room;
    grip.addEventListener('pointerdown', (e) => {
      on = true;
      grip.setPointerCapture(e.pointerId);
      page.classList.add('is-pulling');
      e.preventDefault();
    });
    grip.addEventListener('pointermove', (e) => {
      if (!on) return;
      const [w, h] = room.metres(e.clientX, e.clientY);
      const snap = (x, lo, hi) => Math.min(hi, Math.max(lo, Math.round(x * 2) / 2));
      el('w').value = snap(w, 1, 12);
      el('h').value = snap(h, 1, 5);
      size();
    });
    const off = () => {
      on = false;
      page.classList.remove('is-pulling');
    };
    grip.addEventListener('pointerup', off);
    grip.addEventListener('pointercancel', off);
  }
  /* beside each question, one of our own walls */
  const shots = [...page.querySelectorAll('[data-shot]')];
  const shot = (k) => shots.forEach((n) => {
    const now = n.dataset.shot === k;
    if (n.classList.contains('on') === now) return;
    n.classList.toggle('was', !now && n.classList.contains('on'));
    n.classList.toggle('on', now);
    const img = n.querySelector('img');
    if (now) img.loading = 'eager';
  });
  /* ---- the drawing and the sentence ---- */
  const picked = (n) => form.querySelector(`[name=${n}]:checked`)?.value ?? '';
  let saying = 0;
  const line = $('[data-sentence]');
  const words = line.firstElementChild;
  const say = (text) => {
    if (text === 'A wall.') text = 'A wall, and the room it belongs to.';
    if (words.textContent === text) return;
    clearTimeout(saying);
    if (reduced) {
      words.textContent = text;
      return;
    }
    line.classList.add('turn');
    saying = setTimeout(() => {
      words.textContent = text;
      line.classList.remove('turn');
    }, 420);
  };
  const draw = () => {
    const w = Number(el('w').value);
    const h = Number(el('h').value);
    form.querySelectorAll('[data-size]').forEach((b) => b.setAttribute('aria-pressed', sized && b.dataset.size === `${w},${h}`));
    $('[data-w]').textContent = `${num(w)} m`;
    $('[data-h]').textContent = `${num(h)} m`;
    room.size(w, h);
    shot(at === 4 ? 'reply' : at > 0 && picked('where') ? picked('where') : picked('wall') || 'start');
    const v = Number(el('area').value) || w * h;
    $('[data-area]').textContent = `${num(v)} m²`;
    const kind = { living: 'A living wall', artificial: 'An artificial wall', unsure: 'A wall' }[picked('wall')] ?? 'A wall';
    const where = { indoors: ', indoors', outdoors: ', outdoors', both: ', indoors and out' }[picked('where')] ?? '';
    const place = el('place').value.trim();
    say(`${kind}${where}${sized ? `, about ${num(v)} square metres` : ''}${place ? `, in ${place}` : ''}.`);
    page.classList.toggle('is-sized', sized);
    page.dataset.kind = picked('wall');
  };
  const size = () => {
    sized = true;
    el('area').value = num(Number(el('w').value) * Number(el('h').value));
    draw();
  };
  form.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => {
    [el('w').value, el('h').value] = b.dataset.size.split(',');
    size();
  }));
  el('w').addEventListener('input', size);
  el('h').addEventListener('input', size);
  const fromArea = (a) => {
    const w = Math.min(12, Math.max(1, Math.round(Math.sqrt(a * 1.3) * 2) / 2));
    el('w').value = w;
    el('h').value = Math.min(5, Math.max(1, Math.round((a / w) * 2) / 2));
  };
  el('area').addEventListener('input', () => {
    const a = Number(el('area').value);
    sized = a > 0;
    if (sized) fromArea(a);
    draw();
  });
  form.addEventListener('change', draw);
  el('place').addEventListener('input', draw);

  // ?area= and ?role= come from links on this site; only accept known-good values
  const area = Number(q.get('area'));
  if (area >= 0.25 && area <= 2000) {
    fromArea(area);
    el('area').value = num(area);
    sized = true;
  }
  const role = q.get('role');
  if (/^[a-z]{3,20}$/.test(role ?? '')) {
    const r = form.querySelector(`[name=role][value="${role}"]`);
    if (r) r.checked = true;
  }
  draw();

  /* ---- errors ---- */
  const setError = (name, text) => {
    form.querySelector(`[data-e="${name}"]`).textContent = text;
    if (text) el(name).setAttribute('aria-invalid', 'true');
    else el(name).removeAttribute('aria-invalid');
    return text;
  };
  for (const name in RULES) {
    el(name).addEventListener('blur', () => el(name).value && setError(name, RULES[name](el(name).value)));
    el(name).addEventListener('input', () => el(name).hasAttribute('aria-invalid') && setError(name, RULES[name](el(name).value)));
  }

  /* ---- steps ---- */
  const show = (n, focus = true) => {
    const dir = n >= at ? 1 : -1;
    at = Math.max(0, Math.min(steps.length - 1, n));
    steps.forEach((s, i) => {
      s.hidden = i !== at;
      s.style.setProperty('--dir', dir);
    });
    back.hidden = at === 0;
    next.hidden = at === steps.length - 1;
    send.hidden = at !== steps.length - 1;
    page.dataset.at = at;
    draw();
    page.style.setProperty('--done', (at / (steps.length - 1)).toFixed(3));
    $('[data-count]').textContent = `Step ${at + 1} of ${steps.length}`;
    page.dispatchEvent(new CustomEvent('mw:step', { detail: { at } }));
    if (focus) steps[at].querySelector('[data-focus]')?.focus({ preventScroll: true });
    if (focus && form.getBoundingClientRect().top < 0) form.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };
  page.classList.add('is-steps');
  initVine(page);
  page.addEventListener('mw:go', (e) => show(e.detail));
  next.addEventListener('click', () => show(at + 1));
  back.addEventListener('click', () => show(at - 1));
  // choosing a picture moves on by itself, for a pointer; keyboard users stay in control
  let byPointer = false;
  form.addEventListener('pointerdown', (e) => { byPointer = !!e.target.closest('.pick'); });
  form.addEventListener('keydown', (e) => {
    byPointer = false;
    if (e.key !== 'Enter' || e.target.matches('textarea, button, a')) return;
    if (at < steps.length - 1) {
      e.preventDefault();
      show(at + 1);
    }
  });
  form.addEventListener('change', (e) => {
    if (byPointer && e.target.closest('.pick') && at < 2) {
      const here = at;
      setTimeout(() => at === here && show(at + 1), 620);
    }
  });
  show(0, false);

  /* ---- send ---- */
  form.noValidate = true;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    msg.className = 'form__msg';
    const bad = Object.keys(RULES).filter((n) => setError(n, RULES[n](el(n).value)));
    const ok = el('consent').checked;
    form.querySelector('[data-e="consent"]').textContent = ok ? '' : 'Tick this box so we may reply to you.';
    if (!ok) bad.push('consent');
    if (bad.length) {
      show(steps.findIndex((s) => s.contains(el(bad[0]))), false);
      el(bad[0]).focus();
      return;
    }
    const data = new FormData(form);
    data.delete('w');
    data.delete('h');
    if (!sized) data.set('area', '');
    data.set('elapsed', String(Date.now() - started));
    send.disabled = true;
    page.classList.add('is-sending');
    try {
      const res = await fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' }, credentials: 'same-origin', signal: AbortSignal.timeout(15000) });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || '');
      const done = document.createElement('div');
      done.className = 'sent';
      done.tabIndex = -1;
      done.innerHTML = html('<h2>Planted.</h2><p class="lede"></p><a class="btn" href="vertical-garden.html">Walk through our walls</a>');
      done.querySelector('p').textContent = `Thank you, ${data.get('name')}. Your commission request has been sent, and we will reply to ${data.get('email')}.`;
      form.replaceWith(done);
      page.classList.add('is-sent');
      page.dataset.at = steps.length;
      page.dispatchEvent(new CustomEvent('mw:step', { detail: { at: steps.length - 1, sent: true } }));
      page.style.setProperty('--done', 1);
      done.focus();
      done.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    } catch (err) {
      send.disabled = false;
      msg.classList.add('bad');
      msg.textContent = `${err.message && err.message.length < 140 && !/fetch|JSON|abort|timed|Unexpected/i.test(err.message) ? err.message : 'Your request was not sent. What you typed is still here, so you can try again.'} `;
      const lines = [...data].filter(([k, v]) => v && !['website', 'elapsed', 'consent'].includes(k)).map(([k, v]) => `${k}: ${v}`).join('\n');
      const a = document.createElement('a');
      a.href = `mailto:info@modiwall.com?subject=${encodeURIComponent('Commission request')}&body=${encodeURIComponent(lines)}`;
      a.textContent = 'Or send it by email instead.';
      msg.append(a);
    } finally {
      page.classList.remove('is-sending');
    }
  });
}

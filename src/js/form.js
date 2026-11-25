/* The commission: five short steps, a room planted to scale as you answer, and nothing typed is ever lost.
   Without scripts the same form shows all steps at once. */
import { html } from './html.js';
import { createAtelier } from './atelier.js';

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

  /* ---- the drawing and the sentence ---- */
  const picked = (n) => form.querySelector(`[name=${n}]:checked`)?.value ?? '';
  let room = null;
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
    $('[data-w]').textContent = `${num(w)} m`;
    $('[data-h]').textContent = `${num(h)} m`;
    room?.size(w, h);
    room?.place({ indoors: 'in', outdoors: 'out', both: 'both' }[picked('where')] ?? 'in');
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

  createAtelier($('[data-atelier]')).then((r) => {
    room = r;
    page.classList.add('is-real');
    draw();
  }).catch(() => page.classList.add('no-webgl'));

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
    if (at === 1) ['out', 'both'].forEach((k) => room?.warm(k));
    page.style.setProperty('--done', (at / (steps.length - 1)).toFixed(3));
    $('[data-count]').textContent = `Step ${at + 1} of ${steps.length}`;
    if (focus) steps[at].querySelector('[data-focus]')?.focus({ preventScroll: true });
    if (focus && form.getBoundingClientRect().top < 0) form.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };
  page.classList.add('is-steps');
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

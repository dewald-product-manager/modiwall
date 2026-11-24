/* Quote form: prefill from the wall builder, validate, send, and never lose what was typed. */
import { html } from './html.js';

const RULES = {
  name: (v) => (v.trim().length < 2 ? 'Enter your name.' : ''),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter an email address like name@example.co.za.'),
  phone: (v) => (!v.trim() || /^[+\d][\d\s()-]{7,19}$/.test(v.trim()) ? '' : 'Enter a phone number using digits, for example 082 123 4567.'),
};

export function initForm(form) {
  const q = new URLSearchParams(location.search);
  const el = (n) => form.elements[n];
  const msg = form.querySelector('[data-msg]');
  const out = form.querySelector('[data-area]');
  const started = Date.now();

  // ?area= and ?role= come from links on this site; only accept known-good values
  const area = Number(q.get('area'));
  if (area >= 0.25 && area <= 2000) {
    el('area').value = Math.min(area, Number(el('area').max));
    el('exact').value = area;
  }
  const role = q.get('role');
  if (/^[a-z]{3,20}$/.test(role ?? '') && [...el('role').options].some((o) => o.value === role)) el('role').value = role;

  const paint = () => {
    const v = Number(el('exact').value || el('area').value);
    const top = !el('exact').value && v >= Number(el('area').max);
    out.textContent = `${v}${top ? '+' : ''} m²`;
  };
  el('area').addEventListener('input', () => {
    el('exact').value = '';
    paint();
  });
  paint();

  const setError = (name, text) => {
    const box = form.querySelector(`[data-e="${name}"]`);
    box.textContent = text;
    if (text) el(name).setAttribute('aria-invalid', 'true');
    else el(name).removeAttribute('aria-invalid');
    return text;
  };
  for (const name in RULES) {
    el(name).addEventListener('blur', () => el(name).value && setError(name, RULES[name](el(name).value)));
    el(name).addEventListener('input', () => el(name).hasAttribute('aria-invalid') && setError(name, RULES[name](el(name).value)));
  }

  form.noValidate = true;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    msg.className = 'form__msg';
    const bad = Object.keys(RULES).filter((n) => setError(n, RULES[n](el(n).value)));
    if (!el('consent').checked) {
      form.querySelector('[data-e="consent"]').textContent = 'Tick this box so we may reply to you.';
      bad.push('consent');
    } else form.querySelector('[data-e="consent"]').textContent = '';
    if (bad.length) {
      el(bad[0]).focus();
      return;
    }
    const btn = form.querySelector('[type=submit]');
    const data = new FormData(form);
    data.set('area', el('exact').value || el('area').value);
    data.set('elapsed', String(Date.now() - started));
    btn.disabled = true;
    btn.textContent = 'Sending';
    try {
      const res = await fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' }, credentials: 'same-origin', signal: AbortSignal.timeout(15000) });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || '');
      const done = document.createElement('div');
      done.className = 'sent';
      done.tabIndex = -1;
      done.innerHTML = html('<h2>Commission request sent</h2><p class="lede"></p><a class="link" href="vertical-garden.html">See our living walls</a>');
      done.querySelector('p').textContent = `Thank you, ${data.get('name')}. We will reply to ${data.get('email')}.`;
      form.replaceWith(done);
      done.focus();
      done.scrollIntoView({ block: 'center' });
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Send commission request';
      msg.classList.add('bad');
      msg.textContent = `${err.message && err.message.length < 140 && !/fetch|JSON|abort|timed|Unexpected/i.test(err.message) ? err.message : 'Your request was not sent. What you typed is still here, so you can try again.'} `;
      const lines = [...data].filter(([k, v]) => v && !['website', 'elapsed', 'exact', 'consent'].includes(k)).map(([k, v]) => `${k}: ${v}`).join('\n');
      const a = document.createElement('a');
      a.href = `mailto:info@modiwall.com?subject=${encodeURIComponent('Commission request')}&body=${encodeURIComponent(lines)}`;
      a.textContent = 'Or send it by email instead.';
      msg.append(a);
    }
  });
}

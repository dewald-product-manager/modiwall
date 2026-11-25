
import { page, scene as onScreen, follow, clamp, span, smooth } from './frame.js?v=c5329617';
import { programs, picture, texture, sized, slot } from './gl.js?v=da570bfd';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const AT = [2.15, -0.48, 0.9];
const AZ = (60 * Math.PI) / 180;
const EL = (8 * Math.PI) / 180;
const HT = 13.6;
const WT = 7.6;
const D = [Math.sin(AZ) * Math.cos(EL), -Math.sin(EL), -Math.cos(AZ) * Math.cos(EL)];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v) => { const l = Math.hypot(...v); return v.map((c) => c / l); };
const R = unit(cross(D, [0, 1, 0]));
const U = cross(R, D);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const uvOf = (x, y, z) => { const p = [x - AT[0], y - AT[1], z - AT[2]]; return [dot(p, R) / WT + 0.5, 0.5 - dot(p, U) / HT]; };
const CUT_U = uvOf(0, 0, 0.6)[0];
const QUAD = `#version 300 es
layout(location=0) in vec2 aQ; uniform vec4 uBox; out vec2 vUv; void main(){ vUv = aQ; vec2 p = uBox.xy + aQ * uBox.zw; gl_Position = vec4(p.x * 2. - 1., 1. - p.y * 2., 0., 1.); }`;
const PIC = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uTex; uniform float uLit; uniform vec2 uLamp; out vec4 o;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){ vec3 c = texture(uTex, vUv).rgb; vec2 d = (vUv - uLamp) * vec2(1., 1.79); float l = exp(-dot(d, d) * 2.6); c *= uLit * (.62 + .55 * l); o = vec4(c + (hash(gl_FragCoord.xy) - .5) / 220., 1.); }`;
const WVS = `#version 300 es
layout(location=0) in vec2 aP; layout(location=1) in vec4 aS; uniform vec4 uBox; out vec2 vUv; out vec4 vS;
void main(){ vUv = aP; vS = aS; vec2 p = uBox.xy + aP * uBox.zw; gl_Position = vec4(p.x * 2. - 1., 1. - p.y * 2., 0., 1.); }`;
const WFS = `#version 300 es
precision highp float; in vec2 vUv; in vec4 vS; uniform sampler2D uTex; uniform float uT, uFront, uLit; out vec4 o;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
void main(){
float s = vS.x, t = vS.y, kind = vS.z, start = vS.w;
float head = smoothstep(0., .22, uFront - start - s * step(kind, 1.5) - .4 * step(1.5, kind) * 0.);
if (kind > 2.5) {                                           // the reservoir: light moving on the water
float w = noise(vec2(s * 2.2 - uT * .35, t * 5. + uT * .6)) * .6 + noise(vec2(s * 5. + uT * .5, t * 11. - uT * .8)) * .4;
float line = smoothstep(.10, .0, abs(t - .93 - .035 * sin(s * 7. - uT * 2.6))) ;
float ca = pow(clamp(1. - abs(w - .5) * 5., 0., 1.), 3.) * smoothstep(.0, .9, t);
float a = (ca * .34 + line * .75) * head; vec3 c = mix(vec3(.25, .85, .72), vec3(.85, 1., .95), line);
o = vec4(c * a, a * .7) * uLit; return;
}
if (kind > 1.5) {                                           // damp, climbing the wick a little at a time
float f = fract(s * 1.1 - uT * .32); float a = smoothstep(.0, .5, f) * smoothstep(1., .55, f) * smoothstep(1., .2, abs(t)) * head;
o = vec4(vec3(.55, 1., .86) * a * .62, a * .35) * uLit; return;
}
float e = 1. - t * t;                                       // a rounded stream
float n1 = noise(vec2(t * 2.2, s * 5.5 - uT * 4.6)), n2 = noise(vec2(t * 4.5 + 7., s * 13. - uT * 8.5));
float body = smoothstep(-.02, .5, e + (n1 - .5) * .9);
vec2 nrm = vec2(t * .9 + (n1 - .5) * 1.1, (n2 - .5) * 1.2);
vec3 back = texture(uTex, vUv + nrm * vec2(.0075, .0042)).rgb;
float spec = pow(clamp(1. - abs(t + .34 + (n2 - .5) * .5) * 2.1, 0., 1.), 3.) * (.45 + .9 * n1) + pow(n2, 7.) * 1.7 + pow(clamp(1. - abs(t - .62) * 3.6, 0., 1.), 2.) * .22;
vec3 c = back * vec3(.86, 1.08, 1.04) * 1.2 + vec3(.018, .075, .066) + vec3(.86, 1., .97) * spec;
float a = body * head;
o = vec4(c * a, a) * uLit;
}`;
const WAY = [[0.25, 2.62, 0.05], [0.25, 2.46, 0.055], [0.245, 2.36, 0.075], [0.2, 2.24, 0.07], [0.13, 2.13, 0.055], [0.085, 2.02, 0.045], [0.072, 1.85, 0.036], [0.07, 1.2, 0.034], [0.07, 0.4, 0.036], [0.07, -0.4, 0.034], [0.07, -1.2, 0.036], [0.075, -1.86, 0.038], [0.1, -2.02, 0.05], [0.15, -2.14, 0.062], [0.215, -2.25, 0.072], [0.25, -2.36, 0.08], [0.25, -2.55, 0.075], [0.25, -2.79, 0.055]];
export async function initCut(sec) {
const canvas = sec.querySelector('[data-cut-canvas]');
const gl = canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'high-performance' });
if (!gl) throw new Error('no webgl2');
const making = programs(gl, [[QUAD, PIC], [WVS, WFS]], 'cut');
making.catch(() => {});
const small = innerWidth * Math.min(2, devicePixelRatio || 1) < 1500;
const img = await picture(new URL(`../img/system/cut${small ? '-s' : ''}.avif`, import.meta.url).href);
await slot();
const tex = await texture(gl, img, { mip: true, sharp: 8 });
const [picP, watP] = await making;
const v = [];
const idx = [];
const ribbon = (pts, kind, from) => {
const fine = [];
for (let i = 0; i < pts.length - 1; i++) {
const q = [pts[Math.max(0, i - 1)], pts[i], pts[i + 1], pts[Math.min(pts.length - 1, i + 2)]];
const n = Math.max(3, Math.ceil(Math.hypot(q[2][0] - q[1][0], q[2][1] - q[1][1]) / 0.06));
for (let k = 0; k < n; k++) {
const t = k / n;
fine.push([0, 1, 2].map((c) => 0.5 * (2 * q[1][c] + (q[2][c] - q[0][c]) * t + (2 * q[0][c] - 5 * q[1][c] + 4 * q[2][c] - q[3][c]) * t * t + (3 * q[1][c] - q[0][c] - 3 * q[2][c] + q[3][c]) * t ** 3)));
}
}
fine.push(pts[pts.length - 1]);
let len = 0;
fine.forEach((p, i) => {
const a = fine[Math.max(0, i - 1)];
const b = fine[Math.min(fine.length - 1, i + 1)];
const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
const nx = -(b[1] - a[1]) / l;
const ny = (b[0] - a[0]) / l;
if (i) len += Math.hypot(p[0] - fine[i - 1][0], p[1] - fine[i - 1][1]);
const o = v.length / 6;
for (const s of [-1, 1]) {
const wide = kind < 1.5 ? p[2] * 1.3 : p[2];
const [x, y] = uvOf(-0.01, p[1] + ny * wide * s, p[0] + nx * wide * s);
v.push(x, y, len, s, kind, from);
}
if (i) idx.push(o - 2, o - 1, o, o - 1, o + 1, o);
});
return len;
};
const TOP = 5.62;
const main = [[0.25, TOP - 0.06, 0.028], [0.25, TOP - 0.3, 0.03], [0.25, TOP - 0.46, 0.034]];
for (const py of [2.6, -2.6]) main.push(...WAY.map(([z, y, w]) => [z, y + py, w]));
main.push([0.25, -5.48, 0.05], [0.25, -5.64, 0.07]);
const total = ribbon(main, 0, 0);
const lengthTo = (y) => TOP - y; // near enough to how far the water has come by this height
for (const py of [2.6, -2.6]) for (let r = 0; r < 4; r++) {
const y = py + 2.1275 - 1.16 * r;
ribbon([[0.085, y - 0.52, 0.03], [0.1, y - 0.4, 0.03], [0.16, y - 0.26, 0.032], [0.235, y - 0.165, 0.032], [0.3, y - 0.128, 0.03], [0.4, y - 0.125, 0.03], [0.5, y - 0.125, 0.032], [0.6, y - 0.17, 0.04], [0.74, y - 0.3, 0.07], [0.86, y - 0.42, 0.11]], 2, lengthTo(y - 0.4) + 0.5);
}
{
const o = v.length / 6;
const n = 24;
for (let i = 0; i <= n; i++) for (const t of [0, 1]) {
const z = -0.05 + (1.55 - 0.03 + 0.05) * (i / n);
const [x, y] = uvOf(-0.004, -6.5 + (-5.62 + 6.5) * t, z);
v.push(x, y, (i / n) * 1.6, t, 3, total - 0.2);
if (i && t) idx.push(o + (i - 1) * 2, o + (i - 1) * 2 + 1, o + i * 2, o + (i - 1) * 2 + 1, o + i * 2 + 1, o + i * 2);
}
}
const quad = gl.createVertexArray();
gl.bindVertexArray(quad);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
const wat = gl.createVertexArray();
gl.bindVertexArray(wat);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 24, 0);
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 8);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
gl.bindVertexArray(null);
const beats = [...sec.querySelectorAll('[data-cut-say]')];
const marks = [...sec.querySelectorAll('[data-cut-at]')];
const pins = [...sec.querySelectorAll('[data-cut-pin]')].map((el) => ({ el, at: uvOf(-0.01, Number(el.dataset.y), Number(el.dataset.z)), a: Number(el.dataset.from), b: Number(el.dataset.to) }));
const STOPS = [5.2, 3.1, 0.2, -1.6, -5.2]; // the height looked at, for each thing said
const size = sized(canvas, 2);
const mouse = { x: { x: 0, v: 0 }, y: { x: 0, v: 0 }, tx: 0, ty: 0 };
let lit = 0;
let now = -1;
const draw = (p, t, dt) => {
if (!size.fit()) return;
const { cw, ch, w, h } = size;
const tall = w < 820;
const n = STOPS.length;
const k = clamp(p * n - 0.5, 0, n - 1);
const i = Math.min(n - 2, Math.floor(k));
const look = STOPS[i] + (STOPS[i + 1] - STOPS[i]) * smooth(clamp((k - i - 0.14) / 0.72));
const ph = Math.max((tall ? 2.5 : 2.75) * h, tall ? 0 : ((0.6 * w) / (1 - CUT_U)) * (HT / WT));
const pw = (ph * WT) / HT;
const cutU = CUT_U;
const x0 = tall ? w * 0.34 - cutU * pw : w * 0.44 - cutU * pw;
const [, vy] = uvOf(0, look, 0.4);
const y0 = Math.min(0, Math.max((tall ? 0.6 : 1) * h - ph, h * (tall ? 0.36 : 0.5) - vy * ph));
const mx = follow(mouse.x, mouse.tx, dt, 420);
const my = follow(mouse.y, mouse.ty, dt, 420);
const box = [(x0 - mx * 14) / w, (y0 - my * 10) / h, pw / w, ph / h];
lit += (1 - lit) * (1 - Math.exp(-dt / 900));
gl.viewport(0, 0, cw, ch);
gl.clearColor(0.012, 0.035, 0.027, 1);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, tex);
gl.disable(gl.BLEND);
gl.useProgram(picP.p);
gl.uniform4fv(picP.u.uBox, box);
gl.uniform1i(picP.u.uTex, 0);
gl.uniform1f(picP.u.uLit, lit);
gl.uniform2f(picP.u.uLamp, cutU + 0.16, vy);
gl.bindVertexArray(quad);
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
gl.enable(gl.BLEND);
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
gl.useProgram(watP.p);
gl.uniform4fv(watP.u.uBox, box);
gl.uniform1i(watP.u.uTex, 0);
gl.uniform1f(watP.u.uT, t / 1000);
gl.uniform1f(watP.u.uLit, lit);
gl.uniform1f(watP.u.uFront, span(p, 0.02, 0.06) * 0.9 + (TOP - look + (h / ph) * HT * 0.42) * span(p, 0.03, 0.1) + (p > 0.8 ? (p - 0.8) * 20 : 0));
gl.bindVertexArray(wat);
gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
const b = Math.min(n - 1, Math.round(k));
if (b !== now) {
now = b;
beats.forEach((e, j) => e.classList.toggle('on', j === b));
marks.forEach((e, j) => (j === b ? e.setAttribute('aria-current', 'step') : e.removeAttribute('aria-current')));
}
for (const q of pins) {
const on = span(p, q.a, q.a + 0.04) * (1 - span(p, q.b, q.b + 0.04));
q.el.style.opacity = on.toFixed(3);
q.el.style.visibility = on > 0.01 ? 'visible' : 'hidden';
q.el.style.transform = `translate3d(${((box[0] + q.at[0] * box[2]) * w).toFixed(1)}px,${((box[1] + q.at[1] * box[3]) * h).toFixed(1)}px,0)`;
}
};
marks.forEach((m, j) => m.addEventListener('click', () => {
const r = sec.getBoundingClientRect();
scrollTo({ top: r.top + scrollY + ((j + 0.5) / STOPS.length) * (r.height - innerHeight), behavior: reduced ? 'instant' : 'smooth' });
}));
sec.classList.add('is-ready');
if (reduced) {
lit = 1;
const still = () => {
const r = sec.getBoundingClientRect();
draw(clamp(-r.top / Math.max(1, r.height - innerHeight)), 2000, 1);
};
still();
addEventListener('scroll', still, { passive: true });
new ResizeObserver(still).observe(canvas);
return;
}
sec.addEventListener('pointermove', (e) => {
if (e.pointerType !== 'mouse') return;
mouse.tx = e.clientX / page.w - 0.5;
mouse.ty = e.clientY / page.h - 0.5;
}, { passive: true });
const cur = { x: -1, v: 0 };
onScreen(sec, (dt, t, top, h) => {
const to = clamp(-top / Math.max(1, h - page.h));
if (cur.x < 0) cur.x = to;
draw(follow(cur, to, dt, 220), t, dt);
});
}

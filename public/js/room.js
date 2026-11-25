
import { ROOM } from './roomdata.js?v=983f7cdd';
import { page, scene, follow } from './frame.js?v=c5329617';
import { programs, picture, texture, sized, slot } from './gl.js?v=da570bfd';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const VS = `#version 300 es
layout(location=0) in vec2 a; out vec2 q; void main(){ q = a; gl_Position = vec4(a * 2. - 1., 0., 1.); }`;
const FS = `#version 300 es
precision highp float;
in vec2 q; out vec4 o;
uniform sampler2D uA, uB, uC, uD, uZ; uniform vec4 uW, uS; uniform vec3 uView; uniform vec2 uAsp, uPar; uniform float uRise, uT, uExp;
vec3 lin(sampler2D t, vec2 uv, float s){ return pow(texture(t, uv).rgb, vec3(2.4)) * s; }
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
vec2 uv = uView.xy + (vec2(q.x, 1. - q.y) - .5) * uAsp / uView.z;
vec2 d = uPar; vec2 p = uv;
for (int i = 0; i < 3; i++) p = uv - d * (texture(uZ, p).r - .35);
uv = clamp(p, .001, .999);
vec3 c = lin(uA, uv, uS.x) * uW.x + lin(uB, uv, uS.y) * uW.y + lin(uC, uv, uS.z) * uW.z;
float lift = smoothstep(-.28, .06, uRise - (1. - uv.y) * 1.1);
c += lin(uD, uv, uS.w) * uW.w * lift;
c *= uExp * vec3(1.05, 1., .94);
c = c * (c * 2.51 + .03) / (c * (c * 2.43 + .59) + .14);
float l = dot(c, vec3(.2126, .7152, .0722)); c = clamp(l + (c - l) * .97, 0., 1.);
c = mix(c * 12.92, 1.055 * pow(max(c, vec3(1e-5)), vec3(1. / 2.4)) - .055, step(.0031308, c));
o = vec4(c + (hash(gl_FragCoord.xy + fract(uT) * 61.) - .5) / 180., 1.);
}`;
export async function createRoom(canvas, name) {
const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'high-performance' });
if (!gl) throw new Error('no webgl2');
const making = programs(gl, [[VS, FS]], 'room');
making.catch(() => {});
const need = Math.max(innerWidth, innerHeight * (16 / 9) * 0.8) * Math.min(1.75, devicePixelRatio || 1) * (name === 'mat' ? 1.5 : 1.1);
const tier = navigator.connection?.saveData || need < 1300 ? '-s' : need < 2300 || Math.max(innerWidth, innerHeight) < 1000 ? '' : '-l';
const at = (f) => picture(new URL(`../img/room/${f}.avif`, import.meta.url).href);
const pics = await Promise.all([0, 1, 2, 3].map((g) => at(`${name}-${g}${tier}`)).concat(at(`${name}-d`)));
const [{ p: prog, u }] = await making;
let asp = 0;
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
const tex = [];
for (const img of pics) {
tex.push(await texture(gl, img, { mip: true, sharp: 2 }));
asp ||= img.width / img.height;
img.close();
}
gl.useProgram(prog);
tex.forEach((t, i) => {
gl.activeTexture(gl.TEXTURE0 + i);
gl.bindTexture(gl.TEXTURE_2D, t);
gl.uniform1i(u[['uA', 'uB', 'uC', 'uD', 'uZ'][i]], i);
});
gl.uniform4fv(u.uS, ROOM[name]);
const size = sized(canvas, 1.75);
let key = '';
const R = {
w: [0, 0, 0, 0], // how far up each light is
view: [0.5, 0.5, 1], // where the camera looks, and how close
par: [0, 0],
rise: 2, // how far up the last light has climbed
exp: 0.95,
size,
draw(t) {
if (!size.fit()) return;
const { cw: w, ch: h } = size;
const k = [w, h, ...R.w.map((v) => v.toFixed(4)), ...R.view.map((v) => v.toFixed(5)), R.par[0].toFixed(5), R.par[1].toFixed(5), R.rise.toFixed(4)].join();
if (k === key) return;
key = k;
gl.viewport(0, 0, w, h);
const a = w / h;
const cov = a > asp ? [1, asp / a] : [a / asp, 1];
const z = R.view[2];
const hx = cov[0] / z / 2 + 0.008;
const hy = cov[1] / z / 2 + 0.008;
const fit = (v, half) => (half >= 0.5 ? 0.5 : Math.min(1 - half, Math.max(half, v)));
gl.uniform2f(u.uAsp, ...cov);
gl.uniform3f(u.uView, fit(R.view[0], hx), fit(R.view[1], hy), z * 1.012);
gl.uniform4fv(u.uW, R.w);
gl.uniform2f(u.uPar, ...R.par);
gl.uniform1f(u.uRise, R.rise);
gl.uniform1f(u.uExp, R.exp);
gl.uniform1f(u.uT, t / 1000);
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
},
run(sec, each) {
const mouse = { x: { x: 0, v: 0 }, y: { x: 0, v: 0 }, tx: 0, ty: 0 };
sec.addEventListener('pointermove', (e) => {
if (e.pointerType !== 'mouse') return;
mouse.tx = e.clientX / page.w - 0.5;
mouse.ty = e.clientY / page.h - 0.5;
}, { passive: true });
scene(sec, (dt, t, top, h) => {
R.par = [follow(mouse.x, mouse.tx, dt, 420) * 0.011, follow(mouse.y, mouse.ty, dt, 420) * 0.008];
each(dt, top, h);
R.draw(t);
});
},
};
await slot();
R.draw(0);
return R;
}
export async function nightRoom(sec) {
const canvas = sec.querySelector('[data-room]');
const sw = sec.querySelector('[data-switch]');
const R = await createRoom(canvas, 'night');
let on = false;
let touched = false;
let since = 0;
const to = [1, 0, 0, 0];
const mine = [0.75, 0.62, 0.84, 1.5]; // how bright each light is set
const most = [1.5, 1, 1, 2];
R.w = [0.2, 0, 0, 0];
const pin = sec.querySelector('.night__pin') ?? sec;
sec.querySelectorAll('[data-dim-at]').forEach((r) => {
const k = Number(r.dataset.dimAt);
const show = () => r.style.setProperty('--v', `${r.value}%`);
show();
r.addEventListener('input', () => {
mine[k] = (r.value / 100) * most[k];
show();
touched = true;
if (!on) set(true);
since = 9999;
if (reduced) still();
});
});
const place = () => {
const tall = R.size.w < R.size.h;
R.view[0] = tall ? 0.66 : 0.5;
R.view[1] = tall ? 0.5 : 0.52;
};
const set = (v) => {
on = v;
since = 0;
sw.setAttribute('aria-pressed', v);
sec.classList.toggle('is-lit', v);
};
sw.addEventListener('click', () => {
touched = true;
set(!on);
if (reduced) still();
});
function still() {
place();
R.w = on ? [...mine] : [1.35, 0, 0, 0];
R.view[2] = 1;
R.draw(0);
}
sec.classList.add('wall-ready');
if (reduced) {
set(true);
still();
new ResizeObserver(still).observe(pin);
return;
}
const zoom = { x: 1.1, v: 0 };
const lamp = R.w.map((x) => ({ x, v: 0 }));
const warm = [1000, 620, 1250, 520];
let lit = '';
R.run(sec, (dt, top, h) => {
if (!on && !touched && top < page.h * 0.22 && top + h > page.h * 0.6) set(true);
since += dt;
to[0] = on ? mine[0] : 1.35;
to[3] = on && since > 120 ? mine[3] : 0;
to[1] = on && since > 620 ? mine[1] : 0;
to[2] = on && since > 1250 ? mine[2] : 0;
for (let i = 0; i < 4; i++) R.w[i] = follow(lamp[i], to[i], dt, since > 4000 && on ? 160 : on ? warm[i] : warm[i] * 0.7);
place();
R.view[2] = follow(zoom, 1.1 - Math.min(1, Math.max(0, 1 - top / page.h)) * 0.07, dt, 480);
const k = R.w[2].toFixed(2);
if (k !== lit) sec.style.setProperty('--lit', (lit = k));
});
}


import { page, follow } from './frame.js?v=c5329617';
import { programs, picture, texture, sized } from './gl.js?v=da570bfd';
const VS = `#version 300 es
layout(location=0) in vec2 a; out vec2 q; void main(){ q = a; gl_Position = vec4(a * 2. - 1., 0., 1.); }`;
const FS = `#version 300 es
precision highp float;
in vec2 q; out vec4 o;
uniform sampler2D uBare, uFull, uMap, uBare2, uFull2, uMap2;
uniform vec4 uBox;   // what is seen of the picture: left, top, width, height (0 to 1)
uniform vec2 uWall;  // metres wide, metres high
uniform float uGrow, uMix, uT;
const float F = 14.4, CY = 2.6, FOOT = .16;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float plantAt(vec4 m, vec2 here){
vec2 r = vec2(m.r * 12. - 6., m.g * 5.);                      // where this plant is rooted
float t = m.b;
float far = max(abs(r.x) - uWall.x * .5, r.y - uWall.y);
float spot = max(abs(here.x) - uWall.x * .5 + .10, here.y - uWall.y + .06);
far = min(far, spot * 1.6 + .02);
far += smoothstep(.10, .26, spot) * .4;
float n = hash(floor(r * 9.) + .5);
float g = smoothstep(.03, -.05, far) * smoothstep(0., 1., uGrow * 2.2 - n * .5 - length(r / vec2(6., 5.)) * .7);
return smoothstep(-.02, .06, g * 1.08 - t * .98);
}
vec4 one(sampler2D bare, sampler2D full, sampler2D map, vec2 uv){
vec3 b = texture(bare, uv).rgb, f = texture(full, uv).rgb;
vec2 n = vec2(textureSize(map, 0)); vec2 st = uv * n - .5; ivec2 i = ivec2(floor(st)); vec2 w = fract(st);
float m = 0., own = 0.;
vec2 p = vec2((uv.x - .5) * F, CY + (.5 - uv.y) * F - FOOT);
for (int y = 0; y < 2; y++) for (int x = 0; x < 2; x++) {
vec4 c = texelFetch(map, clamp(i + ivec2(x, y), ivec2(0), ivec2(n) - 1), 0);
float k = (x == 0 ? 1. - w.x : w.x) * (y == 0 ? 1. - w.y : w.y), is = step(.015, c.b);
own += k * is; m += k * is * plantAt(c, p);
}
float side = abs(p.x) - uWall.x * .5;
float near = 1. - smoothstep(-.25, .5, side);
float share = clamp(uWall.x * uWall.y / 60., 0., 1.);
float refl = p.y < 0. ? near * smoothstep(.2, 1., uWall.y / 3.2 * smoothstep(0., -1.4, p.y) + .35) : 0.;
float shade = exp(-length(max(vec2(abs(p.x - .16) - uWall.x * .5 + .04, p.y - uWall.y + .16), 0.)) * 8.) * .5;
vec3 room = mix(b, f, clamp(max(refl, share * .55), 0., 1.) * uGrow);
vec3 wall = b * (1. - shade * uGrow);
return vec4(mix(room, mix(wall, f, m / max(own, .001)), own), 1.);
}
void main(){
vec2 uv = uBox.xy + vec2(q.x, 1. - q.y) * uBox.zw;
vec4 c = uMix >= 1. ? vec4(0.) : one(uBare, uFull, uMap, uv);
if (uMix > 0.) {
float n = smoothstep(0., 1., uMix);                          // one place dissolves into the next, light first
vec4 e = one(uBare2, uFull2, uMap2, uv);
c = uMix >= 1. ? e : mix(c, e, smoothstep(0., 1., clamp(n * 1.5 - .5 + dot(e.rgb, vec3(.33)) * .5 * (1. - n) * n * 2., 0., 1.)));
}
o = vec4(c.rgb + (hash(gl_FragCoord.xy) - .5) / 200., 1.);
}`;
export async function createAtelier(canvas) {
const gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
if (!gl) throw new Error('no webgl2');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const making = programs(gl, [[VS, FS]], 'atelier');
making.catch(() => {});
const small = canvas.clientWidth * Math.min(2, devicePixelRatio || 1) < 1100;
const at = (f) => new URL(`../img/room/${f}`, import.meta.url).href;
const places = {};
const load = (k) => (places[k] ??= (async () => {
const s = small ? '-s' : '';
const [b, f, m] = await Promise.all([picture(at(`${k}-0${s}.avif`)), picture(at(`${k}-1${s}.avif`)), picture(at(`${k}-map.webp`), true)]);
const t = [];
for (const [img, how] of [[b, { mip: true }], [f, { mip: true }], [m, { near: true }]]) {
t.push(await texture(gl, img, how));
img.close();
}
return t;
})());
let here = await load('in');
const [{ p: prog, u }] = await making;
gl.useProgram(prog);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
let next = null;
let mix = 0;
let wanted = 'in';
let raf = 0;
let then = 0;
const want = { w: 3, h: 2.5, grow: 1 };
const now = { w: { x: 3, v: 0 }, h: { x: 2.5, v: 0 }, vw: { x: 0, v: 0 }, x: { x: 0, v: 0 }, y: { x: 0, v: 0 }, grow: 0 };
const drift = { x: 0, v: 0, tx: 0 };
const size = sized(canvas, 1.75, () => go());
function frame(asp) {
let vw = Math.max(want.w + 2.4, (want.h + 2.7) * asp, 5.4 * Math.min(1, asp + 0.15));
vw = Math.min(vw, 14.3, 14.3 * asp);
const vh = vw / asp;
const y = Math.min(9.75 - vh, Math.max(-4.55, -vh * 0.25));
const x = Math.min(7.15 - vw, Math.max(-7.15, -vw / 2));
return { vw, vh, x, y };
}
function draw(dt) {
if (!size.fit()) return false;
const { cw: w, ch: h } = size;
const f = frame(w / h);
const first = reduced || !now.vw.x;
let move = 0;
for (const [n, v] of [['w', want.w], ['h', want.h], ['vw', f.vw], ['x', f.x], ['y', f.y]]) {
move += Math.abs(v - now[n].x) + Math.abs(now[n].v) * 100;
if (first) now[n].x = v;
else follow(now[n], v, dt, 460);
}
const g = reduced ? 1 : 1 - Math.exp(-dt / 1100);
now.grow += (want.grow - now.grow) * g;
move += Math.abs(want.grow - now.grow);
move += Math.abs(drift.tx - drift.x);
follow(drift, drift.tx, dt, 520);
if (next) {
mix = reduced ? 1 : Math.min(1, mix + dt / 1500);
move += 1;
if (mix >= 1) {
here = next;
next = null;
mix = 0;
}
}
const vw = now.vw.x;
const vh = vw / (w / h);
const x = Math.min(7.15 - vw, Math.max(-7.15, now.x.x + drift.x * vw * 0.02));
gl.viewport(0, 0, w, h);
gl.uniform4f(u.uBox, x / 14.4 + 0.5, 0.5 - (now.y.x + vh - 2.6) / 14.4, vw / 14.4, vh / 14.4);
gl.uniform2f(u.uWall, now.w.x, now.h.x);
gl.uniform1f(u.uGrow, now.grow);
gl.uniform1f(u.uMix, next ? Math.max(mix, 0.0001) : 0);
[...here, ...(next ?? here)].forEach((t, i) => {
gl.activeTexture(gl.TEXTURE0 + i);
gl.bindTexture(gl.TEXTURE_2D, t);
gl.uniform1i(u[['uBare', 'uFull', 'uMap', 'uBare2', 'uFull2', 'uMap2'][i]], i);
});
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
return move > 0.003;
}
const loop = (t) => {
const dt = Math.min(60, t - then || 16);
then = t;
raf = draw(dt) ? requestAnimationFrame(loop) : 0;
};
function go() {
if (raf) return;
then = 0;
raf = requestAnimationFrame(loop);
}
canvas.addEventListener('webglcontextlost', () => canvas.closest('[data-commission]')?.classList.add('no-webgl'));
if (!reduced) {
addEventListener('pointermove', (e) => {
if (e.pointerType !== 'mouse') return;
drift.tx = e.clientX / page.w - 0.5;
go();
}, { passive: true });
}
go();
return {
size(w, h) {
want.w = w;
want.h = h;
go();
},
async place(k) {
if (k === wanted) return;
wanted = k;
const t = await load(k);
if (k !== wanted) return;
if (next) here = next;
next = t;
mix = 0;
go();
},
warm(k) {
load(k).catch(() => {});
},
};
}

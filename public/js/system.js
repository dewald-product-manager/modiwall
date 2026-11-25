
import { page, scene as onScreen, follow, clamp, smooth, span } from './frame.js?v=c5329617';
import { programs, picture, texture, sized, slot } from './gl.js?v=da570bfd';
const COLS = 5;
const ROWS = 4;
const PI = Math.PI;
const ease = (v) => 1 - (1 - v) ** 3;
let seed = 11;
const rnd = (a = 0, b = 1) => {
seed = (seed * 1664525 + 1013904223) >>> 0;
return a + (seed / 4294967296) * (b - a);
};
class Mesh {
constructor() {
this.v = [];
this.i = [];
}
vert(x, y, z, nx, ny, nz, u = 0, w = 0) {
this.v.push(x, y, z, nx, ny, nz, u, w);
return this.v.length / 8 - 1;
}
quad(a, b, c, d) { this.i.push(a, b, c, a, c, d); }
box(cx, cy, cz, sx, sy, sz, r = 0.02) {
const h = [sx / 2, sy / 2, sz / 2];
const b = Math.min(r, ...h.map((x) => x * 0.9));
const at = (s, ax) => {
const p = s.map((k, n) => k * (n === ax ? h[n] : h[n] - b));
const n = [0, 0, 0];
n[ax] = s[ax];
return this.vert(cx + p[0], cy + p[1], cz + p[2], ...n);
};
const id = {};
for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) for (let ax = 0; ax < 3; ax++) id[`${x}${y}${z}${ax}`] = at([x, y, z], ax);
const g = (x, y, z, ax) => id[`${x}${y}${z}${ax}`];
for (const s of [-1, 1]) {
this.quad(g(s, -1, -1, 0), g(s, 1, -1, 0), g(s, 1, 1, 0), g(s, -1, 1, 0));
this.quad(g(-1, s, -1, 1), g(1, s, -1, 1), g(1, s, 1, 1), g(-1, s, 1, 1));
this.quad(g(-1, -1, s, 2), g(1, -1, s, 2), g(1, 1, s, 2), g(-1, 1, s, 2));
for (const t of [-1, 1]) {
this.quad(g(s, t, -1, 0), g(s, t, 1, 0), g(s, t, 1, 1), g(s, t, -1, 1));
this.quad(g(s, -1, t, 0), g(s, 1, t, 0), g(s, 1, t, 2), g(s, -1, t, 2));
this.quad(g(-1, s, t, 1), g(1, s, t, 1), g(1, s, t, 2), g(-1, s, t, 2));
for (const w of [-1, 1]) this.i.push(g(s, t, w, 0), g(s, t, w, 1), g(s, t, w, 2));
}
}
return this;
}
tube(axis, a, b, p, q, r, a0 = 0, a1 = 2 * PI, n = 20) {
const base = this.v.length / 8;
for (const [e, t] of [[0, a], [1, b]]) for (let k = 0; k <= n; k++) {
const th = a0 + ((a1 - a0) * k) / n;
const c = Math.cos(th);
const s = Math.sin(th);
if (axis === 'y') this.vert(p + c * r, t, q + s * r, c, 0, s, k / n, e * Math.abs(b - a));
else this.vert(t, p + c * r, q + s * r, 0, c, s, k / n, e * Math.abs(b - a));
}
for (let k = 0; k < n; k++) this.quad(base + k, base + k + 1, base + n + 2 + k, base + n + 1 + k);
return this;
}
disc(axis, t, p, q, r, n = 18) {
const c0 = axis === 'y' ? this.vert(p, t, q, 0, 1, 0) : axis === 'x' ? this.vert(t, p, q, 1, 0, 0) : this.vert(p, q, t, 0, 0, 1);
for (let k = 0; k <= n; k++) {
const c = Math.cos((k / n) * 2 * PI) * r;
const s = Math.sin((k / n) * 2 * PI) * r;
if (axis === 'y') this.vert(p + c, t, q + s, 0, 1, 0);
else if (axis === 'x') this.vert(t, p + c, q + s, 1, 0, 0);
else this.vert(p + c, q + s, t, 0, 0, 1);
if (k) this.i.push(c0, c0 + k, c0 + k + 1);
}
return this;
}
}
function panelMesh() {
const m = new Mesh();
m.box(0, 0, 0.03, 4.86, 4.86, 0.06, 0.02);
for (let i = 0; i < 24; i++) m.box(-2.26 + i * 0.1965, 0, 0.15, 0.028, 4.5, 0.2, 0.01); // ribs: the water channels
for (const s of [-1, 1]) {
m.box(s * 2.36, 0, 0.15, 0.1, 4.82, 0.28, 0.025);
m.box(0, s * 2.36, 0.15, 4.82, 0.1, 0.28, 0.025);
}
m.tube('x', -2.3, 2.3, 2.56, 0.1, 0.18, 0.85, 2 * PI - 0.85, 24);
m.tube('y', -2.35, 2.35, -2.56, 0.1, 0.18, -PI + 0.85, PI - 0.85, 24);
m.tube('y', -2.42, 2.42, 2.57, 0.1, 0.145, 0, 2 * PI, 22).disc('y', 2.42, 2.57, 0.1, 0.145).disc('y', -2.42, 2.57, 0.1, 0.145);
m.tube('x', -2.36, 2.36, -2.56, 0.1, 0.125, 0, 2 * PI, 20).disc('x', 2.36, -2.56, 0.1, 0.125).disc('x', -2.36, -2.56, 0.1, 0.125);
for (let i = 0; i < 24; i++) m.tube('x', -2.28 + i * 0.1965, -2.255 + i * 0.1965, -2.56, 0.1, 0.17, 0, 2 * PI, 16).disc('x', -2.28 + i * 0.1965, -2.56, 0.1, 0.17, 16).disc('x', -2.255 + i * 0.1965, -2.56, 0.1, 0.17, 16);
return m;
}
const slotAt = (c, r) => [3, 7, 11, 15].includes(r) && c % 3 === (r % 2 ? 1 : 2);
function gridMesh() {
const m = new Mesh();
const W = 4.9;
const N = 16;
const R = 18;
for (let c = 0; c <= N; c++) m.box(-W / 2 + (c * W) / N, 0, 0, c % N ? 0.085 : 0.12, W, 0.075, 0.016);
for (let r = 0; r <= R; r++) m.box(0, W / 2 - (r * W) / R, 0, W, r % R ? 0.085 : 0.12, 0.07, 0.016);
for (let c = 0; c < N; c++) for (let r = 0; r < R; r++) if (!slotAt(c, r)) m.box(-W / 2 + ((c + 0.5) * W) / N, W / 2 - ((r + 0.5) * W) / R, -0.018, 0.25, 0.22, 0.03, 0.012);
return m;
}
function screwsMesh() {
const m = new Mesh();
for (const x of [-2.36, 2.36]) for (const y of [-2.36, 2.36]) {
m.box(x, y, 0.045, 0.02, 0.1, 0.02, 0.004).box(x, y, 0.045, 0.1, 0.02, 0.02, 0.004);
m.disc('z', 0.042, x, y, 0.085, 18);
}
return m;
}
const RIM = [];
for (let k = 0; k < 40; k++) {
const th = (k / 40) * 2 * PI;
const d = [Math.cos(th), Math.sin(th)];
let best = [0, 0];
let bd = -9;
for (const c of [[-0.34, 0.13], [0.34, 0.13], [0, -0.2]]) {
const dot = c[0] * d[0] + c[1] * d[1];
if (dot > bd) {
bd = dot;
best = c;
}
}
const x = best[0] + d[0] * 0.14;
RIM.push([x, best[1] + d[1] * 0.14 + (d[1] > 0.2 ? 0.07 * (1 - (x / 0.48) ** 2) : 0), d[0], d[1]]);
}
const waist = (t) => 1 - 0.37 * smooth(clamp((t - 0.04) / 0.78)) - 0.03 * t;
function vesselMesh(step = 1, rings = 11) {
const m = new Mesh();
const pts = RIM.filter((_, k) => k % step === 0);
const n = pts.length;
const wall = (k0, t0, t1, count, inset, flip) => {
const base = m.v.length / 8;
for (let j = 0; j <= count; j++) {
const t = t0 + ((t1 - t0) * j) / count;
const w = waist(t) * k0;
for (let k = 0; k <= n; k++) {
const [x, z, nx, nz] = pts[k % n];
m.vert(x * w, -t * 1.16, z * w * (1 - t * 0.12), nx * flip, 0.3 * flip * (1 - t), nz * flip, x / 0.96 + 0.5, t + inset);
}
}
for (let j = 0; j < count; j++) for (let k = 0; k < n; k++) m.quad(base + j * (n + 1) + k, base + j * (n + 1) + k + 1, base + (j + 1) * (n + 1) + k + 1, base + (j + 1) * (n + 1) + k);
};
wall(1, 0, 1, rings, 0, 1);
wall(0.935, 0, 0.2, 2, 5, -1);
const b = m.v.length / 8;
for (let k = 0; k <= n; k++) {
const [x, z] = pts[k % n];
m.vert(x, 0, z, x * 0.6, 0.8, z * 0.6, 0, 5);
m.vert(x * 0.935, 0.004, z * 0.935, -x * 0.4, 0.9, -z * 0.4, 0, 5);
}
for (let k = 0; k < n; k++) m.quad(b + k * 2, b + k * 2 + 1, b + k * 2 + 3, b + k * 2 + 2);
if (step === 1) m.box(0, -0.84, -0.2, 0.16, 0.05, 0.2, 0.02).box(0, -0.74, -0.3, 0.16, 0.22, 0.045, 0.02);
return m;
}
function soilMesh() {
const m = new Mesh();
const c = m.vert(0, -0.1, 0, 0, 1, 0, 0.5, 0.5);
RIM.forEach(([x, z], k) => {
m.vert(x * 0.9, -0.15, z * 0.9, 0, 1, 0, x * 2, z * 2);
m.i.push(c, c + 1 + k, c + 1 + ((k + 1) % RIM.length));
});
return m;
}
function plumbing() {
const m = new Mesh();
m.tube('y', -2.75, 2.86, -2.98, 0, 0.09).tube('y', -2.75, 2.86, 2.98, 0, 0.09).tube('x', -2.98, 2.98, 2.94, 0, 0.09);
for (const x of [-2.98, 2.98]) m.box(x, 2.94, 0, 0.27, 0.27, 0.27, 0.11).box(x, 0, -0.04, 0.3, 0.1, 0.22, 0.03).box(x, -2.72, 0, 0.26, 0.12, 0.26, 0.05);
for (let i = -2; i <= 2; i++) m.tube('y', 2.66, 2.9, i * 1.05, 0.02, 0.045, 0, 2 * PI, 12);
m.box(0, -3.16, 0.16, 6.5, 0.74, 0.92, 0.05).box(0, -2.78, 0.16, 6.62, 0.07, 1.02, 0.03);
m.box(3.95, -1.55, -0.16, 0.66, 0.94, 0.3, 0.07).tube('y', -2.9, -2.02, 3.95, -0.16, 0.035, 0, 2 * PI, 10);
return m;
}
const flat = (x0, y0, x1, y1, z, m = new Mesh()) => {
const a = m.vert(x0, y0, z, 0, 0, 1, 0, 0);
m.vert(x1, y0, z, 0, 0, 1, 1, 0);
m.vert(x1, y1, z, 0, 0, 1, 1, 1);
m.vert(x0, y1, z, 0, 0, 1, 0, 1);
m.quad(a, a + 1, a + 2, a + 3);
return m;
};
function streams() {
const m = new Mesh();
for (let i = 0; i < 23; i++) flat(-2.24 + i * 0.1965, -2.3, -2.085 + i * 0.1965, 2.3, 0.09, m);
return m;
}
function surface(m, nu, nv, f) {
const base = m.v.length / 8;
const at = (u, v) => f(u * 2 - 1, v);
for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
const u = i / nu;
const v = j / nv;
const p = at(u, v);
const e = 0.01;
const a = at(Math.min(1, u + e), v);
const b = at(Math.max(0, u - e), v);
const c = at(u, Math.min(1, v + e));
const d = at(u, Math.max(0, v - e));
const U = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const V = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
const n = [U[1] * V[2] - U[2] * V[1], U[2] * V[0] - U[0] * V[2], U[0] * V[1] - U[1] * V[0]];
const l = Math.hypot(...n) || 1;
m.vert(p[0], p[1], p[2], n[0] / l, n[1] / l, Math.abs(n[2] / l) < 1e-4 && l === 1 ? 1 : n[2] / l, u, v);
}
for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) m.quad(base + j * (nu + 1) + i, base + j * (nu + 1) + i + 1, base + (j + 1) * (nu + 1) + i + 1, base + (j + 1) * (nu + 1) + i);
return m;
}
const stalk = (m, len, w) => surface(m, 2, 4, (u, v) => [u * w, 0.02 - v * len * 0.25 + 0.06 * Math.sin(v * 3), -v * len - 0.01 - Math.abs(u) * w]);
function heartLeaf(far) {
const m = new Mesh();
surface(m, far ? 4 : 8, far ? 4 : 9, (u, v) => {
const w = 0.5 * Math.sin(PI * Math.min(1, v * 0.93 + 0.07) ** 0.58) ** 0.75 * (1 - 0.18 * v);
const x = u * w;
const back = 0.17 * (1 - v) ** 4 * Math.min(1, Math.abs(u) * 2.2);
return [x, v * 1.08 - back, 0.2 * Math.abs(x) - 0.3 * v * v + 0.02 * Math.sin(v * 9 + u * 3) * Math.abs(u) - 0.18 * x * x];
});
return far ? m : stalk(m, 0.75, 0.018);
}
function monsteraLeaf(far) {
const m = new Mesh();
surface(m, far ? 6 : 12, far ? 6 : 12, (u, v) => {
const w = 0.56 * Math.sin(PI * Math.min(1, v * 0.9 + 0.1) ** 0.62) ** 0.62;
const x = u * w;
const back = 0.2 * (1 - v) ** 3 * Math.min(1, Math.abs(u) * 2);
return [x, v * 1.05 - back, 0.16 * Math.abs(x) - 0.26 * v * v - 0.3 * x * x + 0.015 * Math.sin(v * 20) * Math.abs(u)];
});
return stalk(m, 0.8, 0.02);
}
function frond(far) {
const m = new Mesh();
const spine = (v) => [0, Math.sin(v * 1.5) * 0.74, -0.62 * v ** 2.1];
surface(m, 1, far ? 4 : 8, (u, v) => { const s = spine(v); return [u * 0.008 * (1.2 - v), s[1], s[2] + 0.002]; });
const N = far ? 13 : 24;
for (let i = 1; i <= N; i++) {
const v = i / (N + 1);
const [, y, z] = spine(v);
const len = 0.135 * Math.sin(PI * v ** 0.72) ** 0.6 + 0.012;
const dip = -0.05 - rnd(0, 0.03);
for (const s of [-1, 1]) surface(m, 1, far ? 1 : 2, (a, b) => {
const w = (far ? 0.046 : 0.023) * Math.sin(PI * (0.14 + b * 0.86)) ** 0.6;
return [s * b * len, y + b * len * 0.3 + a * w, z + dip * b * b * 2 + Math.abs(a) * 0.004];
});
}
return m;
}
function ribbon(far) {
const m = new Mesh();
return surface(m, far ? 2 : 4, far ? 6 : 12, (u, v) => {
const w = 0.04 * Math.sin(PI * (0.2 + v * 0.8)) ** 0.5;
return [u * w, Math.sin(v * 1.75) * 0.68, -0.72 * v ** 2.2 + Math.abs(u) * w * 0.5];
});
}
const VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec2 aUv;
layout(location=3) in vec4 iA; layout(location=4) in vec4 iQ; layout(location=5) in vec4 iX;
uniform mat4 uVP, uM, uL; uniform float uT, uGrow, uKind, uDrop; uniform vec2 uGust;
out vec3 vP, vN; out vec2 vUv; out vec4 vX; out vec4 vS; out float vOcc;
vec3 turn(vec4 q, vec3 v){ return v + 2. * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
void main(){
vec3 p = aP, n = aN; float g = 1.;
vOcc = 1.;
if (uKind > 9.5) {                         // a leaf: opens from the base, moves a little in the air
g = smoothstep(0., 1., uGrow * 1.7 - iX.x * .7);
float curl = (1. - g) * 2.2; p.z += p.y * p.y * curl * .4; p.x *= mix(.25, 1., g);
float sw = sin(uT * (1.1 + iX.y * .5) + iX.y * 40.) * .022 + uGust.x * .05 * sin(uT * 2.3 + iX.y * 9.);
p.z += sw * p.y * 1.6; p.x += sw * .6 * p.y;
p *= iA.w * g;
vOcc = iX.w;
} else if (uKind > 3.5 && uKind < 5.5) {   // vessels arrive one by one and hook on
float k = clamp(uDrop * 1.55 - iX.x * .55, 0., 1.); k = 1. - pow(1. - k, 3.);
g = step(.001, k); p *= g;
float a = (1. - k) * -.7; p = vec3(p.x, p.y * cos(a) - p.z * sin(a), p.y * sin(a) + p.z * cos(a)); n = vec3(n.x, n.y * cos(a) - n.z * sin(a), n.y * sin(a) + n.z * cos(a));
p += vec3(0., 1.1, 2.6) * (1. - k);
}
p = turn(iQ, p) + iA.xyz; n = turn(iQ, n);
vec4 w = uM * vec4(p, 1.);
vP = w.xyz; vN = mat3(uM) * n; vUv = aUv; vX = iX;
vS = uL * vec4(vP + normalize(vN) * .05, 1.);
gl_Position = uVP * w;
}`;
const FS = `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 vP, vN; in vec2 vUv; in vec4 vX; in vec4 vS; in float vOcc;
uniform vec3 uEye, uSun; uniform float uKind, uT, uWet, uFade, uPx; uniform sampler2DShadow uSh; uniform sampler2D uTx, uLeaf, uLeafN;
out vec4 o;
vec2 cell(float k){ return k < 10.5 ? vec2(0., 0.) : k < 11.5 ? vec2(.5, 0.) : k < 13.5 ? vec2(0., .5) : vec2(.5, .5); }
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float panel(vec3 d, vec3 c, vec3 ux, vec2 size, float soft){
float t = dot(d, c); if (t < .02) return 0.;
vec3 uy = cross(c, ux); vec2 q = abs(vec2(dot(d, ux), dot(d, uy)) / t) - size;
return smoothstep(soft, -soft, max(q.x, q.y));
}
vec3 studio(vec3 d, float r){
float s = .05 + r * 1.1;
vec3 c = mix(vec3(.02, .035, .03), vec3(.2, .235, .225), smoothstep(-.6, 1., d.y));
c += vec3(1., .97, .92) * 4.6 * panel(d, normalize(vec3(-.62, .6, .62)), normalize(vec3(.7, 0., .7)), vec2(.62, .5), s);
c += vec3(.9, 1., .96) * 2.5 * panel(d, normalize(vec3(.93, .12, .34)), normalize(vec3(-.34, 0., .93)), vec2(.1, .9), s * .7);
c += vec3(1.) * 1.3 * panel(d, normalize(vec3(.1, .97, .2)), vec3(1., 0., 0.), vec2(.9, .24), s);
return c;
}
float shade(){
vec3 q = vS.xyz / vS.w * .5 + .5; if (q.z > 1. || max(abs(q.x - .5), abs(q.y - .5)) > .5) return 1.;
float a = hash(gl_FragCoord.xy) * 6.283, s = 0.; mat2 m = mat2(cos(a), sin(a), -sin(a), cos(a));
for (int i = 0; i < 6; i++) { float k = float(i); vec2 j = m * vec2(cos(k * 2.4), sin(k * 2.4)) * sqrt((k + .5) / 6.) * 2.6 * uPx; s += texture(uSh, vec3(q.xy + j, q.z - .0011)); }
return s / 6.;
}
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
void main(){
vec3 V = normalize(uEye - vP), N = normalize(vN); if (!gl_FrontFacing) N = -N;
if (dot(N, V) < 0. && uKind > 9.5) N = -N;
vec3 alb = vec3(.016); float rough = .44, f0 = .045, trans = 0., occ = 1.; vec3 tcol = vec3(0.), emit = vec3(0.);
#ifdef HARD
if (uKind < .5) {                                   // limewashed wall
float t = noise(vP.xy * 1.1 + noise(vP.xy * .5) * 2.) * .6 + noise(vP.xy * 5.) * .25 + noise(vP.xy * 31.) * .1;
alb = mix(vec3(.019, .05, .04), vec3(.034, .078, .062), t); rough = .95; f0 = .02;
N = normalize(N + vec3(noise(vP.xy * 9.) - .5, noise(vP.xy * 9. + 7.) - .5, 0.) * .12);
} else if (uKind < 1.5) {                           // moulded polypropylene, a fine spark-eroded texture
float gr = smoothstep(26., 9., distance(uEye, vP)); vec3 g = vP * 85.; N = normalize(N + (vec3(noise(g.xy), noise(g.yz + 3.), noise(g.zx + 9.)) - .5) * .035 * gr);
alb = vec3(.013, .0145, .014);
} else if (uKind < 2.5) { alb = vec3(.5, .52, .51); rough = .3; f0 = .6; } // steel
else if (uKind < 3.5) {                             // water in the channels
float s = noise(vec2(vUv.x * 5., vUv.y * 16. + uT * 3.4)) * .6 + noise(vec2(vUv.x * 9. + 4., vUv.y * 38. + uT * 6.)) * .4;
float head = smoothstep(0., .08, uWet * 1.25 - (1. - vUv.y));
N = normalize(vec3((s - .5) * 1.5, (noise(vec2(vUv.x * 4., vUv.y * 26. + uT * 4.6)) - .5) * .7, 1.));
vec3 R = reflect(-V, N); float fr = .04 + .96 * pow(1. - max(dot(N, V), 0.), 5.);
vec3 c = studio(R, .06) * (fr + .1) + vec3(.1, .22, .2) * .16 * s;
float a = head * smoothstep(.34, .6, s) * .85 * smoothstep(0., .16, vUv.x) * smoothstep(1., .84, vUv.x);
o = vec4(pow(aces(c * 1.1), vec3(.4545)) * a, a * .65); return;
} else if (uKind < 4.5) {                           // vessel, with the mark pressed into its face
float gr = smoothstep(26., 9., distance(uEye, vP)); vec3 g = vP * 85.; N = normalize(N + (vec3(noise(g.xy), noise(g.yz + 3.), noise(g.zx + 9.)) - .5) * .03 * gr);
alb = vec3(.013, .0145, .014); rough = .36;
if (vUv.y < 1.01 && vUv.x > .27 && vUv.x < .73 && vUv.y > .2 && vUv.y < .5 && N.z > 0.) {
vec2 t = vec2((vUv.x - .27) / .46 * .5, (vUv.y - .2) / .3), e = vec2(.005, .01); float lb = .6;
vec2 dg = vec2(texture(uTx, t + vec2(e.x, 0.), lb).r - texture(uTx, t - vec2(e.x, 0.), lb).r, texture(uTx, t + vec2(0., e.y), lb).r - texture(uTx, t - vec2(0., e.y), lb).r);
N = normalize(N + vec3(-dg.x, dg.y, 0.) * .5 * smoothstep(34., 12., distance(uEye, vP)));
}
if (vUv.y > 4.9) occ = smoothstep(5.22, 4.98, vUv.y) * .9 + .1;
} else if (uKind < 5.5) {                           // growing medium
float t = noise(vP.xz * 24.) * .5 + noise(vP.xz * 70.) * .5; alb = mix(vec3(.02, .013, .008), vec3(.085, .056, .036), t * t); rough = .95; occ = .7;
N = normalize(N + (vec3(noise(vP.xz * 40.), 0., noise(vP.zx * 44.)) - .5) * .9);
} else if (uKind < 6.5) {                           // timer display
float lcd = texture(uTx, vec2(.5 + vUv.x * .5, 1. - vUv.y)).r;
alb = vec3(.02); emit = mix(vec3(.34, .72, .012), vec3(.02, .07, .02), lcd) * .9; rough = .2;
} else if (uKind < 7.5) {                           // pipes, with the water passing inside
alb = vec3(.013, .0145, .014); rough = .34;
float f = fract(vUv.y * .9 - uT * .75); emit = vec3(.34, .74, .015) * smoothstep(.5, .0, abs(f - .5) * 2.4) * pow(max(dot(N, V), 0.), 3.) * uWet * .34 * smoothstep(-2.6, -2.3, vP.y);
}
#else
{
float u = vUv.x * 2. - 1., v = vUv.y, au = abs(u), s = vX.y;
float back = gl_FrontFacing ? 0. : 1.;
trans = .42; rough = .34; f0 = .045;
if (uKind > 11.5 && uKind < 12.5) {               // sword fern
alb = mix(vec3(.05, .125, .022), vec3(.115, .215, .036), s * .6 + noise(vP.xy * 6.) * .4) * (.82 + .3 * noise(vUv * vec2(3., 26.))); tcol = vec3(.22, .4, .05); rough = .52;
N = normalize(N + vec3(0., (noise(vUv * vec2(2., 30.)) - .5) * .3, 0.));
} else {                                          // a real leaf: colour and veins from the same scans the rendered walls use
vec2 t = cell(uKind) + clamp(vec2(vUv.x, v), .004, .996) * .5;
vec4 c = texture(uLeaf, t, -.4);
#ifdef HOLE
if (c.a < .5) discard;
#endif
alb = pow(c.rgb, vec3(2.2));
alb *= (.82 + .4 * s) * (uKind > 10.5 && uKind < 11.5 ? .62 : 1.); alb = mix(alb, alb * vec3(1.32, 1.12, .75), smoothstep(.62, 1., fract(s * 37.)) * .7);
vec3 nt = texture(uLeafN, t, -.2).xyz * 2. - 1.;
vec3 dp1 = dFdx(vP), dp2 = dFdy(vP); vec2 d1 = dFdx(vUv), d2 = dFdy(vUv);
vec3 a1 = cross(dp2, N), a2 = cross(N, dp1); vec3 tg = a1 * d1.x + a2 * d2.x, bt = a1 * d1.y + a2 * d2.y; float im = inversesqrt(max(max(dot(tg, tg), dot(bt, bt)), 1e-12));
N = normalize(tg * im * nt.x * 1.1 + bt * im * nt.y * 1.1 + N * max(nt.z, .35));
if (dot(N, V) < 0.) N = normalize(N - V * (dot(N, V) - .02));
tcol = uKind < 10.5 ? vec3(.15, .30, .03) : uKind < 11.5 ? vec3(.24, .32, .03) : uKind < 13.5 ? vec3(.34, .5, .12) : vec3(.10, .24, .04);
rough = uKind > 13.5 ? .27 : uKind > 12.5 ? .38 : .30;
}
alb = mix(alb, alb * 1.25 + .012, back); rough += back * .22;
occ = mix(.16, 1., vOcc);
}
#endif
float sh = shade();
float ndl = dot(N, uSun), ndv = max(dot(N, V), .02);
vec3 sun = vec3(1., .95, .86) * 3.3;
vec2 pool = (vP.xy - vec2(.2, .3)) / vec2(6.2, 5.4); float spot = exp(-dot(pool, pool) * uFade);
vec3 H = normalize(uSun + V); float a2 = rough * rough * rough * rough, nh = max(dot(N, H), 0.);
float D = a2 / (3.14159 * pow(nh * nh * (a2 - 1.) + 1., 2.)); float k = (rough + 1.) * (rough + 1.) / 8.;
float G = 1. / ((max(ndl, .0) * (1. - k) + k) * (ndv * (1. - k) + k));
float F = f0 + (1. - f0) * pow(1. - max(dot(H, V), 0.), 5.);
if (uKind > 9.5) { float dz = smoothstep(.5, 2.1, vP.z); occ *= mix(.5, 1., dz); }
vec3 c = alb / 3.14159 * max(ndl, 0.) * sun * sh * spot + sun * D * G * F * (uKind > 9.5 ? .2 : .25) * max(ndl, 0.) * sh * spot;
c += trans * alb * .0 + trans * tcol * (pow(max(dot(-N, uSun), 0.), 1.2) * .34 + pow(max(dot(-V, uSun), 0.), 4.) * .2) * sun * (.25 + .75 * sh) * spot / 3.14159;
vec3 amb = mix(vec3(.05, .09, .075), vec3(.46, .52, .5), N.y * .5 + .5) + vec3(.2, .2, .18) * max(dot(N, normalize(vec3(-.5, .4, .7))), 0.);
c += alb * amb * occ * (.35 + .65 * spot);
vec3 R = reflect(-V, N); vec4 q = rough * vec4(-1., -.0275, -.572, .022) + vec4(1., .0425, 1.04, -.04);
float x = min(q.x * q.x, exp2(-9.28 * ndv)) * q.x + q.y; vec2 ab = vec2(-1.04, 1.04) * x + q.zw;
c += studio(R, rough) * (f0 * ab.x + ab.y) * occ * (.3 + .7 * sh) * (.25 + .75 * spot) * (uKind < .5 ? .25 : 1.) * (uKind > 13.5 ? .19 : uKind > 9.5 ? .27 : 1.25);
c += emit;
c = aces(c * 1.28);
o = vec4(pow(c, vec3(.4545)) + (hash(gl_FragCoord.xy + 3.) - .5) / 200., 1.);
}`;
const SFS = `#version 300 es
precision highp float; in vec2 vUv; in vec4 vX; uniform float uKind; uniform sampler2D uLeaf;
#ifdef HOLE
void main(){ if (texture(uLeaf, vec2(.5) + clamp(vUv, .004, .996) * .5).a < .5) discard; }
#else
void main(){}
#endif
`;
const only = (src, what) => src.replace('#version 300 es', `#version 300 es\n#define ${what}`);
const mul = (a, b) => {
const o = new Float32Array(16);
for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
return o;
};
const move = (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const look = (eye, at) => {
const z = norm([eye[0] - at[0], eye[1] - at[1], eye[2] - at[2]]);
const x = norm(cross([0, 1, 0], z));
const y = cross(z, x);
return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
};
const persp = (fov, asp, n, f, sx, sy) => {
const k = 1 / Math.tan(fov / 2);
return new Float32Array([k / asp, 0, 0, 0, 0, k, 0, 0, -sx, -sy, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]);
};
const ortho = (s, n, f) => new Float32Array([1 / s, 0, 0, 0, 0, 1 / s, 0, 0, 0, 0, -2 / (f - n), 0, 0, 0, -(f + n) / (f - n), 1]);
const aim = (d, up) => {
const y = norm(d);
const k = dot(up, y);
const z = norm(up.map((v, i) => v - y[i] * k));
const x = cross(y, z);
const t = x[0] + y[1] + z[2];
if (t > 0) {
const s = Math.sqrt(t + 1) * 2;
return [(y[2] - z[1]) / s, (z[0] - x[2]) / s, (x[1] - y[0]) / s, s / 4];
}
if (x[0] > y[1] && x[0] > z[2]) {
const s = Math.sqrt(1 + x[0] - y[1] - z[2]) * 2;
return [s / 4, (y[0] + x[1]) / s, (z[0] + x[2]) / s, (y[2] - z[1]) / s];
}
if (y[1] > z[2]) {
const s = Math.sqrt(1 + y[1] - x[0] - z[2]) * 2;
return [(y[0] + x[1]) / s, s / 4, (z[1] + y[2]) / s, (z[0] - x[2]) / s];
}
const s = Math.sqrt(1 + z[2] - x[0] - y[1]) * 2;
return [(z[0] + x[2]) / s, (z[1] + y[2]) / s, s / 4, (x[1] - y[0]) / s];
};
const potAt = (i) => [-1.95 + (i % COLS) * 0.975, 2.02 - Math.floor(i / COLS) * 1.18];
const kindFor = (x, y) => {
const f = Math.sin(x * 0.62 + y * 0.45) + Math.sin(x * 0.31 - y * 0.83 + 2) * 0.9;
if (Math.sin(x * 1.7 + y * 2.9) > 0.965 && Math.sin(x * 0.9 - y) > -0.2) return 14;
return f > 0.8 ? 11 : f > -0.15 ? 10 : f > -0.65 ? 13 : 12;
};
function plant(out, kind, x, y, z, order, full = 1) {
const add = (k, p, s, d, up, occ) => (out[k] ??= []).push(...p, s, ...aim(d, up), clamp(order + rnd(-0.03, 0.06)), rnd(), 0, occ);
if (kind === 10 || kind === 11) {
for (let n = 0; n < 22 * full; n++) {
const a = rnd(-1.5, 1.5);
const h = rnd(-1.02, 0.5);
const r = rnd(0.3, 0.9) * (1 - Math.abs(h) * 0.2);
const p = [x + Math.sin(a) * r * 0.78, y + h, z + 0.12 + Math.cos(a) * r * 0.62];
add(kind, p, rnd(0.46, 0.84), [Math.sin(a) * 0.55 + rnd(-0.35, 0.35), -0.95 + rnd(-0.1, 0.45), 0.36 + rnd(-0.1, 0.35)], [Math.sin(a) * 0.5 + rnd(-0.35, 0.35), 0.5 + rnd(-0.2, 0.2), 0.85], clamp(0.25 + r * 0.85));
}
} else if (kind === 14) {
for (let n = 0; n < 4; n++) {
const a = -0.95 + n * 0.62 + rnd(-0.15, 0.15);
add(14, [x + Math.sin(a) * 0.7, y + 0.35 + rnd(-0.5, 0.4), z + 0.75 + rnd(0, 0.4)], rnd(1.35, 1.85), [Math.sin(a) * 0.75, -0.75 + rnd(-0.1, 0.3), 0.42], [Math.sin(a) * 0.4, 0.55, 0.85], rnd(0.75, 1));
}
for (let n = 0; n < 8; n++) add(10, [x + rnd(-0.5, 0.5), y + rnd(-0.6, 0.4), z + rnd(0.1, 0.4)], rnd(0.5, 0.75), [rnd(-0.5, 0.5), -0.9, 0.35], [rnd(-0.3, 0.3), 0.5, 0.85], 0.35);
} else {
const fern = kind === 12;
for (let n = 0; n < 9; n++) add(10, [x + rnd(-0.46, 0.46), y + rnd(-1.05, 0.2), z + rnd(0, 0.28)], rnd(0.5, 0.74), [rnd(-0.5, 0.5), -0.9, 0.3], [rnd(-0.35, 0.35), 0.5, 0.85], rnd(0.2, 0.45));
for (let n = 0; n < (fern ? 24 : 36) * full; n++) {
const a = rnd(-1.75, 1.75);
const lift = rnd(-0.65, 0.95);
add(kind, [x + rnd(-0.16, 0.16), y - 0.06 + rnd(-0.06, 0.06), z + rnd(-0.1, 0.12)], fern ? rnd(1.25, 1.95) : rnd(1.2, 2.05), [Math.sin(a) * 0.85, 0.15 + lift * 0.9, 0.35 + Math.cos(a) * 0.65], [0, 1, 0.12], clamp(0.55 + lift * 0.4 + rnd(-0.12, 0.2)));
}
}
}
export async function initSystem(sec) {
const host = sec.querySelector('.rig');
const pin = sec.querySelector('.sys__pin');
const steps = [...sec.querySelectorAll('[data-steps] li')];
const tech = sec.hasAttribute('data-detail');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const AT = [0, 0.18, 0.36, 0.58, 0.8, 1.001];
const canvas = document.createElement('canvas');
canvas.className = 'sys__canvas';
canvas.dataset.cursor = 'Turn';
canvas.setAttribute('aria-hidden', 'true');
const gl = canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'high-performance' });
const told = [];
const progress = (p) => steps.forEach((li, i) => {
const on = p >= AT[i] && p < AT[i + 1];
if (li.classList.contains('on') !== on) li.classList.toggle('on', on);
const k = clamp((p - AT[i]) / (Math.min(1, AT[i + 1]) - AT[i])).toFixed(3);
if (told[i] !== k) li.style.setProperty('--p', (told[i] = k));
});
if (!gl) {
sec.classList.add('no-webgl');
steps.forEach((li) => li.classList.add('on'));
return;
}
pin.before(canvas);
pin.parentElement.style.setProperty('--live', 1);
const making = programs(gl, [[VS, only(FS, 'HARD')], [VS, only(FS, 'SOFT')], [VS, only(FS, 'HOLE')], [VS, SFS], [VS, only(SFS, 'HOLE')]], 'system');
making.catch(() => {});
await slot();
const ONE = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0.5, 0, 1]);
const upload = (mesh, inst = ONE) => {
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.v), gl.STATIC_DRAW);
[[0, 3, 0], [1, 3, 12], [2, 2, 24]].forEach(([l, n, o]) => {
gl.enableVertexAttribArray(l);
gl.vertexAttribPointer(l, n, gl.FLOAT, false, 32, o);
});
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(mesh.i), gl.STATIC_DRAW);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
const d = new Float32Array(inst);
gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW);
[3, 4, 5].forEach((l, n) => {
gl.enableVertexAttribArray(l);
gl.vertexAttribPointer(l, 4, gl.FLOAT, false, 48, n * 16);
gl.vertexAttribDivisor(l, 1);
});
gl.bindVertexArray(null);
return { vao, n: mesh.i.length, count: d.length / 12 };
};
const tilt = 0.24;
const pots = [...Array(COLS * ROWS).keys()];
const order = pots.map((i) => ((i % COLS) * 0.05 + Math.floor(i / COLS) * 0.22) / 0.9);
const q = [Math.sin(tilt / 2), 0, 0, Math.cos(tilt / 2)];
const potInst = new Float32Array(pots.flatMap((i) => [potAt(i)[0], potAt(i)[1], 0.82, 1, ...q, order[i], 0.5, 0, 1]));
const wallMesh = flat(-40, -30, 40, 30, -0.42);
const parts = {
wall: upload(wallMesh), panel: upload(panelMesh()), grid: upload(gridMesh()), screws: upload(screwsMesh()), vessel: upload(vesselMesh(), potInst), vesselFar: upload(vesselMesh(2, 4), potInst), soil: upload(soilMesh(), potInst),
pipes: upload(plumbing()), lcd: upload(flat(3.72, -1.5, 4.18, -1.22, 0.005)), streams: upload(streams()),
};
await slot();
const make = (far) => {
const h = heartLeaf(far);
return { 10: h, 11: h, 12: frond(far), 13: ribbon(far), 14: monsteraLeaf(far) };
};
const near = make(false);
await slot();
const away = make(true);
const full = innerWidth < 800 ? 0.62 : 0.76;
const around = [];
for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) around.push({ r, c, far: !!(r || c) });
for (const [n, a] of around.entries()) {
await slot();
const out = {};
for (const i of pots) {
const [x, y] = potAt(i);
plant(out, kindFor(x + a.c * 5.15, y - a.r * 5.15), x, y, 0.9, a.far ? rnd(0, 0.4) : order[i], a.far ? full : 1);
}
a.plants = Object.entries(out).map(([k, d]) => ({ kind: Number(k), ...upload((a.far ? away : near)[k], d) }));
a.delay = n * 0.06;
}
await slot();
const sheet = document.createElement('canvas');
sheet.width = 1024;
sheet.height = 512;
const x2 = sheet.getContext('2d');
x2.fillRect(0, 0, 1024, 512);
x2.save();
x2.filter = 'blur(3px)';
x2.translate(48, 40);
x2.scale(0.262, 0.335);
x2.translate(-235, -100);
x2.strokeStyle = x2.fillStyle = '#fff';
document.querySelectorAll('.foot__mark path').forEach((p) => {
const path = new Path2D(p.getAttribute('d'));
if (p.getAttribute('stroke-width')) {
x2.lineWidth = p.getAttribute('stroke-width');
x2.lineCap = 'round';
x2.stroke(path);
} else x2.fill(path);
});
x2.restore();
x2.fillStyle = '#fff';
x2.font = '600 184px monospace';
x2.textAlign = 'center';
x2.fillText('02:45', 768, 320);
gl.activeTexture(gl.TEXTURE1);
gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sheet);
gl.generateMipmap(gl.TEXTURE_2D);
const leafTex = [[58, 92, 48, 255], [128, 128, 255, 255]].map((c) => {
const t = gl.createTexture();
gl.activeTexture(gl.TEXTURE2);
gl.bindTexture(gl.TEXTURE_2D, t);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(c));
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
return t;
});
['leaf', 'leaf-n'].forEach(async (f, i) => {
try {
leafTex[i] = await texture(gl, await picture(new URL(`../img/room/${f}.avif`, import.meta.url).href), { mip: true, sharp: 4 });
} catch { /* plain leaves */ }
});
const SIZE = innerWidth < 800 ? 1024 : 2048;
gl.activeTexture(gl.TEXTURE0);
const depth = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, depth);
gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SIZE, SIZE);
for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
const fbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0);
gl.drawBuffers([gl.NONE]);
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
const notes = [];
if (tech) {
const box = document.createElement('div');
box.className = 'sys__notes';
for (const [text, at, dx, dy, a, b] of [
['500 mm', [-0.6, 2.8, 0.2], 0, -54, 0.05, 0.17], ['Water channels', [0.6, 0.4, 0.3], -150, 60, 0.06, 0.17], ['Male rail, slides into the next', [2.72, 1.2, 0.2], 96, -30, 0.07, 0.17], ['Foot tube, feeds the panel below', [0.9, -2.66, 0.3], 120, 64, 0.08, 0.17],
['Fixed at four corners', [2.36, 2.36, 0.5], 96, -34, 0.24, 0.35], ['Slots for the vessels', [-1.4, 1.1, 0.5], -130, -50, 0.25, 0.35],
['Hooks on by hand', [0, -0.3, 1.2], 190, 40, 0.48, 0.57], ['Almost one litre', [-1.95, 1.4, 1.4], -110, 30, 0.49, 0.57],
['Ring main', [-2.98, 1.2, 0.1], -90, -30, 0.61, 0.73], ['Feeds from the top', [0.5, 2.94, 0.1], 110, -50, 0.62, 0.73], ['Pump, in the reservoir', [0.8, -3.2, 0.6], 130, 56, 0.63, 0.73], ['Digital timer', [4.1, -1.3, 0.1], 60, -70, 0.64, 0.73],
]) {
const n = document.createElement('div');
const i = document.createElement('i');
const t = document.createElement('span');
t.textContent = text;
n.append(i, t);
box.append(n);
notes.push({ n, i, t, at, dx, dy, a, b });
}
pin.before(box);
}
const SUN = norm([-0.52, 0.66, 0.78]);
const keys = [[0, -0.66, 0.34, 15.5, 0], [0.1, -0.5, 0.24, 14.4, 0], [0.18, -0.4, 0.2, 14.2, 0], [0.27, -0.62, 0.16, 15, 0], [0.36, -0.34, 0.1, 13.4, 0.1], [0.5, -0.5, 0.24, 13.2, 0.1], [0.58, -0.3, 0.12, 14.6, -0.2], [0.645, -0.86, 0.16, 16.4, -0.2], [0.72, -0.8, 0.12, 16.2, -0.2], [0.8, -0.3, 0.07, 15.2, 0], [0.93, -0.26, 0.03, 34, 0], [1, -0.12, 0.02, 35, 0]];
const cam = (p) => {
let i = 0;
while (i < keys.length - 2 && p > keys[i + 1][0]) i++;
const k = smooth(clamp((p - keys[i][0]) / (keys[i + 1][0] - keys[i][0])));
return keys[i].map((v, n) => v + (keys[i + 1][n] - v) * k);
};
let progs;
const size = sized(canvas, innerWidth < 800 ? 1.6 : 1.75);
const turn = { x: 0, y: 0, tx: 0, ty: 0, gust: 0, sx: { x: 0, v: 0 }, sy: { x: 0, v: 0 } };
const I = move(0, 0, 0);
function paint(p, sun) {
let on = null;
const draw = (part, kind, m = I, grow = 1, drop = 1) => {
const P = progs[sun ? (kind > 13.5 ? 4 : 3) : kind > 13.5 ? 2 : kind > 9.5 ? 1 : 0];
if (P !== on) {
gl.useProgram(P.p);
on = P;
}
const { u } = P;
gl.uniform1f(u.uKind, kind);
gl.uniformMatrix4fv(u.uM, false, m);
gl.uniform1f(u.uGrow, grow);
gl.uniform1f(u.uDrop, drop);
gl.bindVertexArray(part.vao);
gl.drawElementsInstanced(gl.TRIANGLES, part.n, gl.UNSIGNED_INT, 0, part.count);
};
const a = span(p, 0.0, 0.1);
const b = span(p, 0.17, 0.32);
const vess = clamp((p - 0.36) / 0.19);
const part = span(p, 0.58, 0.645) * (1 - span(p, 0.7, 0.79)); // opened, to show the water
const grow = clamp((p - 0.68) / 0.13);
const visit = span(p, 0.05, 0.13) * (1 - span(p, 0.16, 0.22));
const end = clamp((p - 0.79) / 0.15);
const off = move(0, 0, part * 1.9);
const base = move(0, 0, (1 - a) * 2.4);
if (grow > 0) for (const pl of around[4].plants) draw(pl, pl.kind, off, grow);
const beside = [];
if (end > 0) around.forEach((n) => {
if (!n.far) return;
const k = ease(clamp(end * 1.6 - n.delay));
if (k <= 0.002) return;
const m = move(n.c * 5.13 + n.c * (1 - k) * 5, -n.r * 5.13 - n.r * (1 - k) * 5, (1 - k) * 3);
beside.push(m);
for (const pl of n.plants) draw(pl, pl.kind, m, clamp(k * 1.25 - 0.1));
});
if (vess > 0) {
draw(parts.vessel, 4, off, 1, vess);
draw(parts.soil, 5, off, 1, vess);
}
if (!sun) for (const m of beside) draw(parts.vesselFar, 4, m);
const gz = 0.34 + (1 - b) * 5 + part * 1.9;
if (b > 0.005) {
const g = move(0, (1 - b) * 0.6, gz);
draw(parts.grid, 1, g);
draw(parts.screws, 2, g);
}
const pipes = span(p, 0.555, 0.62);
if (pipes > 0.005 && p < 0.97) {
const pm = move(0, (1 - pipes) * -5 - span(p, 0.9, 0.97) * 1.6, 0);
draw(parts.pipes, 7, pm);
if (!sun) draw(parts.lcd, 6, pm);
}
draw(parts.panel, 1, base);
if (visit > 0.01) {
draw(parts.panel, 1, move(5.13 + (1 - visit) * 4, 0, (1 - a) * 2.4));
draw(parts.panel, 1, move(0, 5.13 + (1 - visit) * 4, (1 - a) * 2.4));
}
for (const m of beside) draw(parts.panel, 1, m);
if (!sun) draw(parts.wall, 0);
const wet = span(p, 0.61, 0.69) * (1 - span(p, 0.78, 0.82));
if (!sun && wet > 0.01) {
gl.enable(gl.BLEND);
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
gl.depthMask(false);
draw(parts.streams, 3);
gl.depthMask(true);
gl.disable(gl.BLEND);
}
}
let VP = I;
let shadeAt = -1e9;
let drawnAt = -1;
let lightM = I;
function render(p, t) {
if (!size.fit()) return;
const { cw: w, ch: h } = size;
const asp = w / h;
const tall = asp < 0.95;
const [, yaw, pitch, d0, ty] = cam(p);
const dist = d0 * (tall ? Math.max(1.2, 0.95 / asp) : Math.max(1, 1.5 / asp));
const ya = yaw + turn.x;
const pi = Math.max(-0.5, Math.min(0.9, pitch + turn.y));
const eye = [Math.sin(ya) * Math.cos(pi) * dist, ty + Math.sin(pi) * dist, Math.cos(ya) * Math.cos(pi) * dist + 0.4];
VP = mul(persp(0.49, asp, 1, 120, tall ? 0 : 0.36, tall ? -0.3 : -0.02), look(eye, [0, ty, 0.4]));
const wide = 4.6 + span(p, 0.79, 0.9) * 6.4;
const L = mul(ortho(wide, 1, 60), look(SUN.map((v) => v * 26), [0.6, -0.3, 0]));
gl.enable(gl.DEPTH_TEST);
gl.disable(gl.BLEND);
const all = (from, to, vp) => {
for (let i = from; i < to; i++) {
const { p: prog, u } = progs[i];
gl.useProgram(prog);
gl.uniformMatrix4fv(u.uVP, false, vp);
gl.uniform1f(u.uT, t);
gl.uniform2f(u.uGust, turn.gust, 0);
if (u.uLeaf) gl.uniform1i(u.uLeaf, 2);
}
};
const bind = (i, tex) => {
gl.activeTexture(gl.TEXTURE0 + i);
gl.bindTexture(gl.TEXTURE_2D, tex);
};
bind(2, leafTex[0]);
bind(3, leafTex[1]);
if (t - shadeAt > (Math.abs(p - drawnAt) > 0.0002 ? 0.0145 : 0.031)) {
shadeAt = t;
drawnAt = p;
lightM = L;
gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
gl.viewport(0, 0, SIZE, SIZE);
gl.clear(gl.DEPTH_BUFFER_BIT);
gl.enable(gl.POLYGON_OFFSET_FILL);
gl.polygonOffset(2.2, 5);
all(3, 5, L);
bind(0, null); // the texture being written must not also be bound for reading
paint(p, true);
gl.disable(gl.POLYGON_OFFSET_FILL);
}
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
gl.viewport(0, 0, w, h);
gl.clearColor(0.02, 0.1, 0.075, 1);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
bind(0, depth);
all(0, 3, VP);
for (const { p: prog, u } of progs.slice(0, 3)) {
gl.useProgram(prog);
gl.uniformMatrix4fv(u.uL, false, lightM);
gl.uniform3fv(u.uEye, eye);
gl.uniform3fv(u.uSun, SUN);
gl.uniform1i(u.uSh, 0);
gl.uniform1i(u.uTx, 1);
gl.uniform1i(u.uLeafN, 3);
gl.uniform1f(u.uPx, 1 / SIZE);
gl.uniform1f(u.uFade, 1 - span(p, 0.79, 0.92) * 0.82);
gl.uniform1f(u.uWet, span(p, 0.61, 0.69) * (1 - span(p, 0.78, 0.82)));
}
paint(p, false);
for (const o of notes) {
const k = smooth(clamp((p - o.a) / 0.03)) * (1 - smooth(clamp((p - o.b) / 0.02)));
if (k < 0.01) {
if (o.n.style.visibility !== 'hidden') o.n.style.visibility = 'hidden';
continue;
}
const c = [0, 1, 3].map((r) => VP[r] * o.at[0] + VP[4 + r] * o.at[1] + VP[8 + r] * o.at[2] + VP[12 + r]);
const x = ((c[0] / c[2]) * 0.5 + 0.5) * size.w;
const y = (0.5 - (c[1] / c[2]) * 0.5) * size.h;
o.n.style.visibility = 'visible';
o.n.style.opacity = k.toFixed(2);
o.n.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
if (!o.set) {
o.set = true;
o.i.style.width = `${Math.hypot(o.dx, o.dy)}px`;
o.i.style.rotate = `${Math.atan2(o.dy, o.dx)}rad`;
o.t.style.translate = `${o.dx < 0 ? 'calc(-100% + ' + (o.dx - 8) + 'px)' : `${o.dx + 8}px`} calc(-50% + ${o.dy}px)`;
}
}
}
let from = null;
canvas.addEventListener('pointerdown', (e) => {
from = { x: e.clientX, y: e.clientY, tx: turn.tx, ty: turn.ty };
canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
if (!from) return;
turn.tx = Math.max(-1.1, Math.min(1.5, from.tx - (e.clientX - from.x) / 260));
turn.ty = e.pointerType === 'mouse' ? Math.max(-0.4, Math.min(0.6, from.ty + (e.clientY - from.y) / 340)) : 0;
turn.gust = 1;
});
for (const ev of ['pointerup', 'pointercancel']) canvas.addEventListener(ev, () => { from = null; });
let lost = false;
const cur = { x: -1, v: 0 };
let was = 0;
const t0 = performance.now();
try {
progs = await making;
} catch (e) {
sec.classList.add('no-webgl');
canvas.remove();
steps.forEach((li) => li.classList.add('on'));
console.warn(e.message);
return;
}
sec.classList.add('is-real');
if (reduced) {
const still = () => {
shadeAt = -1e9;
render(0.82, 4);
};
still();
new ResizeObserver(still).observe(canvas);
steps.forEach((li) => li.classList.add('on'));
return;
}
await slot();
size.fit();
gl.viewport(0, 0, 4, 4);
for (const [i, part] of [[0, parts.panel], [0, parts.vessel], [0, parts.wall], [1, around[4].plants[0]], [2, around[4].plants[0]], [3, parts.panel], [4, around[4].plants[0]]]) {
await slot();
gl.bindFramebuffer(gl.FRAMEBUFFER, i > 2 ? fbo : null);
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, i > 2 ? null : depth);
gl.useProgram(progs[i].p);
if (i < 3) {
gl.uniform1i(progs[i].u.uTx, 1);
gl.uniform1i(progs[i].u.uLeaf, 2);
gl.uniform1i(progs[i].u.uLeafN, 3);
}
gl.bindVertexArray(part.vao);
gl.drawElementsInstanced(gl.TRIANGLES, 3, gl.UNSIGNED_INT, 0, 1);
}
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
onScreen(sec, (dt, now, top, h) => {
if (lost) return;
const p = clamp(-top / Math.max(1, h - page.h));
if (cur.x < 0) cur.x = p;
if (!from && Math.abs(p - was) > 0.0005) {
const k = Math.exp(-dt / 260);
turn.tx *= k;
turn.ty *= k;
}
was = p;
turn.x = follow(turn.sx, turn.tx, dt, 190);
turn.y = follow(turn.sy, turn.ty, dt, 190);
turn.gust *= Math.exp(-dt / 1100);
follow(cur, p, dt, 170);
progress(cur.x);
render(cur.x, (now - t0) / 1000);
});
canvas.addEventListener('webglcontextlost', () => {
lost = true;
canvas.remove();
sec.classList.add('no-webgl');
});
}

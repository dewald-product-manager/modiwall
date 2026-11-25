
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
const PITCH = 5.2; // one panel to the next, when the rails are home
async function moulded() {
const res = await fetch(new URL('../img/system/parts.bin', import.meta.url).href);
if (!res.ok) throw new Error('parts');
const buf = await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
let at = 0;
const column = (T, n) => {
const a = new T(buf, at, n);
at += (n * T.BYTES_PER_ELEMENT + 3) & ~3;
for (let k = 1; k < n; k++) a[k] += a[k - 1];
return a;
};
const part = () => {
const [n, ni] = new Uint32Array(buf, at, 2);
at += 8;
const p = [column(Int16Array, n), column(Int16Array, n), column(Int16Array, n)];
const o = [column(Int8Array, n), column(Int8Array, n)];
const c = column(Uint8Array, n);
const i = new Uint32Array(column(Uint16Array, ni));
const v = new Float32Array(n * 8);
for (let k = 0; k < n; k++) {
let x = o[0][k] / 127;
let y = o[1][k] / 127;
const z = 1 - Math.abs(x) - Math.abs(y);
if (z < 0) [x, y] = [(1 - Math.abs(y)) * (x < 0 ? -1 : 1), (1 - Math.abs(x)) * (y < 0 ? -1 : 1)];
const l = Math.hypot(x, y, z);
v.set([p[0][k] / 5000, p[1][k] / 5000, p[2][k] / 5000, x / l, y / l, z / l, c[k] / 255, 0], k * 8);
}
return { v, i };
};
const [panel, grid, vessel] = [part(), part(), part()];
const rim = new Float32Array(buf, at + 4, new Uint32Array(buf, at, 1)[0] * 2);
return { panel, grid, vessel, rim: Array.from({ length: rim.length / 2 }, (_, k) => [rim[k * 2], rim[k * 2 + 1]]) };
}
function panelFar() {
const m = new Mesh();
m.box(-0.15, 0.15, 0.22, 5.04, 5.04, 0.4, 0.03).box(0, 0, 0.48, 4.6, 4.6, 0.04, 0.02);
return m.tube('y', -2.36, 2.36, 2.62, 0.25, 0.17, 0, 2 * PI, 12).tube('x', -2.36, 2.36, -2.62, 0.25, 0.17, 0, 2 * PI, 12);
}
function vesselFar(rim) {
const m = new Mesh();
const pts = rim.filter((_, k) => k % 2 === 0);
const n = pts.length;
for (let j = 0; j < 2; j++) for (let k = 0; k <= n; k++) {
const [x, z] = pts[k % n];
const l = Math.hypot(x, z - 0.24);
m.vert(x * 1.04 * (1 - 0.51 * j), -0.9 * j, z * 1.04 * (1 - 0.33 * j), x / l, -0.25, (z - 0.24) / l, 0.7, 0);
}
for (let k = 0; k < n; k++) m.quad(k, k + 1, n + 2 + k, n + 1 + k);
return m;
}
function screwsMesh() {
const m = new Mesh();
for (const x of [-2.2175, 2.2175]) for (const y of [-2.2175, 2.2175]) {
const a = m.v.length / 8;
for (const [d, z, nz] of [[0.072, 0.1, 0.2], [0.07, 0.114, 0.5], [0.056, 0.124, 0.9]]) for (let k = 0; k <= 28; k++) {
const t = (k / 28) * 2 * PI;
const s = Math.sqrt(1 - nz * nz);
m.vert(x + Math.cos(t) * d, y + Math.sin(t) * d, z, Math.cos(t) * s, Math.sin(t) * s, nz);
}
for (let j = 0; j < 2; j++) for (let k = 0; k < 28; k++) m.quad(a + j * 29 + k, a + j * 29 + k + 1, a + (j + 1) * 29 + k + 1, a + (j + 1) * 29 + k);
m.disc('z', 0.124, x, y, 0.056, 28);
}
return m;
}
function driveMesh() { // the recess in each screw head
const m = new Mesh();
for (const x of [-2.2175, 2.2175]) for (const y of [-2.2175, 2.2175]) m.box(x, y, 0.1235, 0.014, 0.07, 0.004, 0.001).box(x, y, 0.1235, 0.07, 0.014, 0.004, 0.001);
return m;
}
function soilMesh(rim) {
const m = new Mesh();
const c = m.vert(0, -0.035, 0.26, 0, 1, 0, 0.5, 0.5);
rim.forEach(([x, z], k) => {
m.vert(x, -0.06, z, 0, 1, 0, x * 2, z * 2);
m.i.push(c, c + 1 + k, c + 1 + ((k + 1) % rim.length));
});
return m;
}
function plumbing() {
const m = new Mesh();
const Z = 0.25;
m.tube('y', -2.9, 2.92, -3.02, Z, 0.09).tube('y', -2.9, 2.92, 3.02, Z, 0.09).tube('x', -3.02, 3.02, 3.0, Z, 0.09);
for (const x of [-3.02, 3.02]) m.box(x, 3.0, Z, 0.27, 0.27, 0.27, 0.11).box(x, 0, Z - 0.16, 0.3, 0.1, 0.4, 0.03).box(x, -2.9, Z, 0.26, 0.12, 0.26, 0.05);
for (let i = -5; i <= 5; i++) m.tube('y', 2.6, 2.95, i * 0.39 - 0.0, Z, 0.034, 0, 2 * PI, 12);
return m;
}
const lit = (m, from = 0, u = 1) => { for (let k = from + 6; k < m.v.length; k += 8) m.v[k] = u; return m; };
function tank() {
return lit(new Mesh().box(-0.15, -3.68, 0.22, 6.9, 1.36, 1.2, 0.05).box(-0.15, -2.97, 0.22, 7.02, 0.07, 1.3, 0.03));
}
function pool() {
const m = new Mesh();
const a = m.v.length / 8;
for (const [x, z, u, v] of [[-3.56, 0.78, 0, 0], [3.26, 0.78, 6, 0], [3.26, -0.34, 6, 1], [-3.56, -0.34, 0, 1]]) m.vert(x, -3.3, z, 0, 1, 0, u, v);
m.quad(a, a + 1, a + 2, a + 3);
return m;
}
const PUMP = [-3.02, -4.32, 0.25];
function pump() {
const m = new Mesh();
const half = [[0, 0.075], [0.16, 0.075], [0.222, 0.083], [0.252, 0.118], [0.29, 0.19], [0.299, 0.25], [0.299, 0.46], [0.288, 0.56], [0.252, 0.71], [0.226, 0.785], [0.178, 0.838], [0.115, 0.858], [0, 0.862]];
const o = [...half.map(([z, y]) => [z, y]), ...half.slice(1, -1).reverse().map(([z, y]) => [-z, y])];
const cut = (x, g, dy = 0) => o.map(([z, y]) => [x, 0.47 + (y - 0.47) * g + dy, z * g]);
skin(m, [cut(-0.36, 0.02), cut(-0.36, 0.8), cut(-0.352, 0.87), cut(-0.33, 0.93), cut(-0.29, 0.972), cut(-0.22, 0.995), cut(0.03, 1), cut(0.037, 0.988), cut(0.044, 1), cut(0.4, 0.985), cut(0.52, 0.955), cut(0.575, 0.9), cut(0.6, 0.82), cut(0.606, 0.02)]);
const b = m.v.length;
m.tube('x', -0.385, -0.35, 0.477, 0, 0.235, 0, 2 * PI, 40).disc('x', -0.385, 0.477, 0, 0.235, 40).tube('x', -0.405, -0.38, 0.477, 0, 0.188, 0, 2 * PI, 40).disc('x', -0.405, 0.477, 0, 0.188, 40);
m.box(-0.425, 0.477, 0, 0.06, 0.3, 0.062, 0.022);
m.tube('y', 0.78, 0.89, 0, 0, 0.094, 0, 2 * PI, 28).disc('y', 0.89, 0, 0, 0.094, 28);
m.tube('y', 0.89, 0.945, 0, 0, 0.102, 0, 2 * PI, 6).disc('y', 0.945, 0, 0, 0.102, 6);
m.tube('y', 0.945, 1.0, 0, 0, 0.07, 0, 2 * PI, 24).disc('y', 1.0, 0, 0, 0.07, 24);
for (let k = 0; k < 3; k++) m.tube('y', 1.0 + k * 0.045, 1.035 + k * 0.045, 0, 0, 0.058 - k * 0.004, 0, 2 * PI, 24).disc('y', 1.035 + k * 0.045, 0, 0, 0.058 - k * 0.004, 24);
m.box(0.17, 0.92, 0, 0.05, 0.16, 0.12, 0.02).box(0.47, 0.91, 0, 0.05, 0.16, 0.12, 0.02).box(0.32, 0.99, 0, 0.35, 0.04, 0.12, 0.018);
for (const z of [-0.34, 0.34]) {
m.box(0.16, 0.14, z * 0.9, 0.5, 0.2, 0.05, 0.015).box(0.16, 0.06, z, 0.62, 0.045, 0.16, 0.015);
for (const x of [-0.1, 0.42]) m.tube('y', 0, 0.02, x, z * 1.12, 0.1, 0, 2 * PI, 28).disc('y', 0.02, x, z * 1.12, 0.1, 28).tube('y', 0.02, 0.06, x, z * 1.12, 0.04, 0, 2 * PI, 16);
}
m.tube('y', 1.0, 1.36, 0, 0, 0.078, 0, 2 * PI, 24);
lit(m, b);
for (let k = 0; k < 6; k++) {
const y = 0.56 - k * 0.057;
const l = 0.07 + k * 0.026;
const w = y > 0.46 ? 0.288 + (0.56 - y) * 0.11 : y > 0.25 ? 0.299 : 0.295;
for (const d of [-1, 1]) m.box(-0.24 + l / 2, y, d * w, l + 0.08, 0.022, 0.012, 0.004).box(-0.357, y, d * (0.262 - l * 0.22), 0.012, 0.022, l * 0.55, 0.004);
}
return m;
}
const TIMER = [-3.95, -0.8, -0.35];
const MM = 0.00181; // one pixel of the front view
const tx = (x) => (x - 401) * MM;
const ty = (y) => (400 - y) * MM;
const face = (y) => 0.352 - y * 0.0466; // the front leans back a little
function skin(m, rings, u = 1) {
const n = rings[0].length;
const N = rings.map((ring) => ring.map(() => [0, 0, 0]));
const add = (j, k, f) => f.forEach((c, i) => { N[j][k % n][i] += c; });
for (let j = 0; j + 1 < rings.length; j++) for (let k = 0; k < n; k++) {
const [a, b, c] = [rings[j][k], rings[j][(k + 1) % n], rings[j + 1][k]];
const f = cross(b.map((v, i) => v - a[i]), c.map((v, i) => v - a[i]));
for (const [jj, kk] of [[j, k], [j, k + 1], [j + 1, k], [j + 1, k + 1]]) add(jj, kk, f);
}
const base = m.v.length / 8;
rings.forEach((ring, j) => { for (let k = 0; k <= n; k++) m.vert(...ring[k % n], ...norm(N[j][k % n]), u, 0); });
for (let j = 0; j + 1 < rings.length; j++) for (let k = 0; k < n; k++) m.quad(base + j * (n + 1) + k, base + j * (n + 1) + k + 1, base + (j + 1) * (n + 1) + k + 1, base + (j + 1) * (n + 1) + k);
const last = rings[rings.length - 1];
const mid = [0, 1, 2].map((i) => last.reduce((t, v) => t + v[i], 0) / n);
let e = [0, 0, 0];
for (let k = 0; k < n; k++) e = e.map((v, i) => v + cross(last[k].map((q, j) => q - mid[j]), last[(k + 1) % n].map((q, j) => q - mid[j]))[i]);
e = norm(e);
const c = m.vert(...mid, ...e, u, 0);
last.forEach((v) => m.vert(...v, ...e, u, 0));
for (let k = 0; k < n; k++) m.i.push(c, c + 1 + k, c + 1 + ((k + 1) % n));
return m;
}
function timerOutline() {
const o = [];
for (let k = 0; k <= 30; k++) { // the round foot
const t = PI + (k / 30) * PI;
o.push([Math.cos(t) * 161 * MM, ty(614) + Math.sin(t) * 161 * MM]);
}
o.push([tx(562), ty(420)], [tx(562), ty(300)], [tx(556), ty(250)], [tx(556), ty(120)]);
const corner = (cx, a0) => { for (let k = 0; k <= 6; k++) { const t = a0 + (k / 6) * (PI / 2); o.push([tx(cx) + Math.cos(t) * 26 * MM, ty(58) + Math.sin(t) * 26 * MM]); } };
corner(530, 0);
for (let k = 1; k < 6; k++) o.push([tx(530 - (258 * k) / 6), ty(32 - 6 * Math.sin((k / 6) * PI))]);
corner(272, PI / 2);
o.push([tx(246), ty(120)], [tx(246), ty(250)], [tx(240), ty(300)], [tx(240), ty(420)]);
return o;
}
function timerBody() {
const m = new Mesh();
const o = timerOutline();
const ring = (grow, z) => o.map(([x, y]) => {
const l = Math.hypot(x, y * 0.6) || 1;
return [x + (x / l) * grow, y + ((y * 0.6) / l) * grow, z(y)];
});
const seam = (y) => face(y) * 0.6 - 0.008;
return skin(m, [
ring(-0.07, () => 0), ring(-0.02, () => 0.045), ring(0, () => 0.075), ring(0, (y) => seam(y) - 0.005), ring(-0.007, seam), ring(-0.001, (y) => seam(y) + 0.005),
ring(-0.004, (y) => face(y) - 0.036), ring(-0.012, (y) => face(y) - 0.014), ring(-0.024, (y) => face(y) - 0.003), ring(-0.038, face),
]);
}
function timerKeys() {
const m = new Mesh();
for (const y of [322, 387]) for (let k = 0; k < 4; k++) m.box(tx(286 + k * 76), ty(y), face(ty(y)) + 0.008, 73 * MM, 39 * MM, 0.03, 0.008);
return m;
}
function timerPlate() {
return new Mesh().box(0, -0.33, -0.035, 0.76, 1.2, 0.07, 0.03);
}
function timerLead() {
const m = new Mesh();
const cy = ty(602);
const z0 = face(cy);
const o = [...Array(40).keys()].map((k) => {
const t = (k / 40) * 2 * PI;
const f = (v) => Math.sign(v) * Math.abs(v) ** 0.62;
return [f(Math.cos(t)) * 0.225, f(Math.sin(t)) * 0.215];
});
const ring = (g, z) => o.map(([x, y]) => [x * g, cy + y * g, z0 + z]);
skin(m, [ring(0.98, 0), ring(1, 0.02), ring(1, 0.13), ring(0.95, 0.2), ring(0.82, 0.25), ring(0.7, 0.262)]);
const P = [[0, cy - 0.16, z0 + 0.11], [0, cy - 0.5, z0 + 0.16], [-0.04, cy - 1.2, z0 + 0.02], [-0.06, -2.3, 0.4], [-0.04, -2.78, 0.5], [0.1, -2.95, 0.55], [0.22, -2.7, 0.56], [0.3, -2.42, 0.56], [0.36, -2.4, 0.56], [0.6, -2.42, 0.5], [1.2, -2.5, 0.25], [1.62, -2.9, 0.2], [1.72, -3.3, 0.35], [1.5, -3.36, 0.55]];
const at = (t) => {
const f = Math.min(t * (P.length - 1), P.length - 1.0001);
const i = Math.floor(f);
const k = f - i;
const q = [P[Math.max(0, i - 1)], P[i], P[i + 1], P[Math.min(P.length - 1, i + 2)]];
return [0, 1, 2].map((c) => 0.5 * (2 * q[1][c] + (q[2][c] - q[0][c]) * k + (2 * q[0][c] - 5 * q[1][c] + 4 * q[2][c] - q[3][c]) * k * k + (3 * q[1][c] - q[0][c] - 3 * q[2][c] + q[3][c]) * k ** 3));
};
const rings = [];
for (let j = 0; j <= 130; j++) {
const t = j / 130;
const c = at(t);
const d = norm(at(Math.min(1, t + 0.004)).map((v, i) => v - at(Math.max(0, t - 0.004))[i]));
const a = norm(cross(d, [0, 0, 1]));
const b = cross(d, a);
const w = j < 5 ? 0.05 - j * 0.003 : 0.034; // the sleeve where it leaves the plug
rings.push([...Array(12).keys()].map((k) => { const h = (-k / 12) * 2 * PI; return c.map((v, i) => v + (a[i] * Math.cos(h) + b[i] * Math.sin(h)) * w); }));
}
skin(m, rings);
return lit(m.tube('x', 0.3, 0.4, -2.4, 0.56, 0.06, 0, 2 * PI, 18));
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
for (let i = 0; i < 23; i++) flat(-2.2175 + i * 0.195, -2.28, -2.0725 + i * 0.195, 2.28, 0.062, m);
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
out vec3 vP, vN, vO; out vec2 vUv; out vec4 vX; out vec4 vS; out float vOcc;
vec3 turn(vec4 q, vec3 v){ return v + 2. * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
void main(){
vec3 p = aP, n = aN; float g = 1.;
vOcc = 1.; vO = aP;
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
float away = 1. - k, a = smoothstep(.05, 1., away) * -.7; p = vec3(p.x, p.y * cos(a) - p.z * sin(a), p.y * sin(a) + p.z * cos(a)); n = vec3(n.x, n.y * cos(a) - n.z * sin(a), n.y * sin(a) + n.z * cos(a));
p += vec3(0., .075 * smoothstep(0., .06, away) + 1.05 * away * smoothstep(.06, 1., away), 2.6 * away); // in through the grid, then down on to it
}
p = turn(iQ, p) + iA.xyz; n = turn(iQ, n);
vec4 w = uM * vec4(p, 1.);
vP = w.xyz; vN = mat3(uM) * n; vUv = aUv; vX = iX;
vS = uL * vec4(vP + normalize(vN) * .05, 1.);
gl_Position = uVP * w;
}`;
const FS = `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 vP, vN, vO; in vec2 vUv; in vec4 vX; in vec4 vS; in float vOcc;
uniform vec3 uEye, uSun; uniform float uKind, uT, uWet, uFade, uPx; uniform sampler2DShadow uSh; uniform float uOn, uSee; uniform sampler2D uTx, uLcd, uLeaf, uLeafN;
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
alb = vec3(.021, .023, .022); rough = .39; occ = vUv.x * vUv.x * .6 + vUv.x * .4;
} else if (uKind < 2.5) { alb = vec3(.06); rough = .34; f0 = .3; } // blackened steel
else if (uKind > 3.1 && uKind < 3.5) {              // water lying in the reservoir
vec2 w = vP.xz * 3.; float t1 = noise(w + uT * .5), t2 = noise(w * 1.9 - uT * .7 + 5.);
float ring = length(vP.xz - vec2(-3.02, .25)); float rp = sin(ring * 22. - uT * 7.) * exp(-ring * 1.6) * uOn;
N = normalize(vec3((t1 - .5) * .22 + rp * .12, 1., (t2 - .5) * .22));
vec3 R = reflect(-V, N); float fr = .03 + .97 * pow(1. - max(dot(N, V), 0.), 5.);
o = vec4(pow(aces((studio(R, .08) * fr + vec3(.02, .10, .085)) * 1.2), vec3(.4545)) * .85, .6) * uSee; return;
}
else if (uKind < 3.5) {                             // water in the channels
float s = noise(vec2(vUv.x * 5., vUv.y * 16. + uT * 3.4)) * .6 + noise(vec2(vUv.x * 9. + 4., vUv.y * 38. + uT * 6.)) * .4;
float head = smoothstep(0., .08, uWet * 1.25 - (1. - vUv.y));
N = normalize(vec3((s - .5) * 1.5, (noise(vec2(vUv.x * 4., vUv.y * 26. + uT * 4.6)) - .5) * .7, 1.));
vec3 R = reflect(-V, N); float fr = .04 + .96 * pow(1. - max(dot(N, V), 0.), 5.);
vec3 c = studio(R, .06) * (fr + .1) + vec3(.1, .22, .2) * .16 * s;
float a = head * smoothstep(.34, .6, s) * .85 * smoothstep(0., .16, vUv.x) * smoothstep(1., .84, vUv.x);
o = vec4(pow(aces(c * 1.1), vec3(.4545)) * a, a * .65); return;
} else if (uKind < 4.5) {                           // vessel
float gr = smoothstep(26., 9., distance(uEye, vP)); vec3 g = vP * 85.; N = normalize(N + (vec3(noise(g.xy), noise(g.yz + 3.), noise(g.zx + 9.)) - .5) * .03 * gr);
alb = vec3(.021, .023, .022); rough = .33;
occ = vUv.x * vUv.x * .6 + vUv.x * .4;
} else if (uKind < 5.5) {                           // growing medium
float t = noise(vP.xz * 24.) * .5 + noise(vP.xz * 70.) * .5; alb = mix(vec3(.02, .013, .008), vec3(.085, .056, .036), t * t); rough = .95; occ = .7;
N = normalize(N + (vec3(noise(vP.xz * 40.), 0., noise(vP.zx * 44.)) - .5) * .9);
} else if (uKind < 6.5) {                           // the timer
alb = vec3(.50, .51, .50); rough = .42; f0 = .04;
vec2 t = vec2((vO.x / .00181 + 155.) / 310., (366. - vO.y / .00181) / 736.);   // where this falls on the printed face
if (vO.z > .352 - vO.y * .0466 - .012) {
vec4 ink = texture(uTx, t, -.6); alb = mix(alb, pow(ink.rgb / max(ink.a, .01), vec3(2.2)) * .7, ink.a);
if (ink.a > .9 && ink.r < .3) rough = .16;
vec2 q = (t - vec2(.0742, .0611)) / vec2(.8484, .2337);                      // the display, behind its window
if (max(abs(q.x - .5), abs(q.y - .5)) < .5) { float on = smoothstep(.1, .62, texture(uLcd, q, -.7).r); alb = mix(vec3(.20, .255, .20), vec3(.006, .009, .007), on); emit = alb * .12; rough = .2; }
vec2 l = (t - vec2(.1323, .5652)) * vec2(310., 736.); emit += vec3(1.8, .05, .03) * uOn * smoothstep(10., 5., length(l));
}
} else if (uKind < 7.5) {                           // pipes, with the water passing inside
alb = vec3(.013, .0145, .014); rough = .34;
float f = fract(vUv.y * .9 - uT * .75); emit = vec3(.34, .74, .015) * smoothstep(.5, .0, abs(f - .5) * 2.4) * pow(max(dot(N, V), 0.), 3.) * uWet * .34 * smoothstep(-2.6, -2.3, vP.y);
} else if (uKind < 8.5) { alb = vec3(.56, .57, .56); rough = .42; f0 = .04; }   // the timer's white casing
else { alb = vec3(.115, .118, .12); rough = .5; }                               // its keys
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
#ifdef HARD
vec3 nx = dFdx(vN), ny = dFdy(vN); rough = sqrt(min(1., rough * rough + min((dot(nx, nx) + dot(ny, ny)) * .5, .5))); // an edge finer than a pixel must not sparkle
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
#ifdef HARD
if (uSee < .995) { float edge = pow(1. - abs(dot(N, V)), 3.); o *= uSee + (1. - uSee) * edge * .5; }
#endif
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
const potAt = (i) => [-1.95 + (i % COLS) * 0.975, 2.1275 - Math.floor(i / COLS) * 1.16];
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
const cad = moulded();
cad.catch(() => {});
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
let cast;
try {
cast = await cad;
} catch {
sec.classList.add('no-webgl');
canvas.remove();
steps.forEach((li) => li.classList.add('on'));
return;
}
await slot();
const pots = [...Array(COLS * ROWS).keys()];
const order = pots.map((i) => ((i % COLS) * 0.05 + Math.floor(i / COLS) * 0.22) / 0.9);
const potInst = new Float32Array(pots.flatMap((i) => [potAt(i)[0], potAt(i)[1], 0.5, 1, 0, 0, 0, 1, order[i], 0.5, 0, 1]));
const wallMesh = flat(-40, -30, 40, 30, -0.42);
const parts = {
wall: upload(wallMesh), panel: upload(cast.panel), panelFar: upload(panelFar()), grid: upload(cast.grid), screws: upload(screwsMesh()), drive: upload(driveMesh()), vessel: upload(cast.vessel, potInst), vesselFar: upload(vesselFar(cast.rim), potInst), soil: upload(soilMesh(cast.rim), potInst),
pipes: upload(plumbing()), timer: upload(timerBody()), tank: upload(tank()), pool: upload(pool()), pump: upload(pump()), timerKeys: upload(timerKeys()), timerPlate: upload(timerPlate()), timerLead: upload(timerLead()), streams: upload(streams()),
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
plant(out, kindFor(x + a.c * PITCH, y - a.r * PITCH), x * 1.06, 0.39 + (y - 0.39) * 1.12, 0.86, a.far ? rnd(0, 0.4) : order[i], a.far ? full : 1);
}
a.plants = Object.entries(out).map(([k, d]) => ({ kind: Number(k), ...upload((a.far ? away : near)[k], d) }));
a.delay = n * 0.06;
}
await slot();
const ink = document.createElement('canvas');
ink.width = 620;
ink.height = 1472;
const x2 = ink.getContext('2d');
x2.scale(2, 2);
x2.translate(-246, -34);
const plate = (x, y, w, h, rad, fill) => {
x2.fillStyle = fill;
x2.beginPath();
x2.roundRect(x, y, w, h, rad);
x2.fill();
};
plate(248, 40, 305, 250, 14, '#101211');
plate(266, 76, 269, 178, 8, '#2a2e2b');
x2.textAlign = 'center';
x2.fillStyle = '#e9ebea';
x2.font = '700 12px Arial, sans-serif';
x2.fillText('PROGRAMMABLE TIMER', 400, 278);
x2.fillStyle = '#26292a';
x2.font = '400 14px Arial, sans-serif';
[['WEEK', 281, 360], ['HOUR', 358, 360], ['MINUTE', 435, 360], ['SECOND', 513, 360], ['CLOCK', 281, 424], ['TIMER', 358, 424], ['ON/AUTO/', 435, 424], ['OFF', 435, 439], ['RANDOM', 517, 424]].forEach(([w, x, y]) => x2.fillText(w, x, y));
x2.font = '400 9px Arial, sans-serif';
x2.fillText('RESET', 521, 459);
x2.beginPath();
x2.arc(517, 437, 5, 0, 7);
x2.fill();
x2.fillStyle = '#5c4a48';
x2.beginPath();
x2.arc(287, 450, 8, 0, 7);
x2.fill();
x2.strokeStyle = 'rgba(120,126,124,.55)';
x2.lineWidth = 1.6;
x2.beginPath();
x2.arc(401, 612, 134, 0, 7);
x2.stroke();
gl.activeTexture(gl.TEXTURE1);
gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ink);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.generateMipmap(gl.TEXTURE_2D);
const lcd = document.createElement('canvas');
lcd.width = 384;
lcd.height = 256;
const x3 = lcd.getContext('2d', { willReadFrequently: true });
const lcdTex = gl.createTexture();
gl.activeTexture(gl.TEXTURE4);
gl.bindTexture(gl.TEXTURE_2D, lcdTex);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
const SEG = [0x77, 0x24, 0x5d, 0x6d, 0x2e, 0x6b, 0x7b, 0x25, 0x7f, 0x6f];
const digit = (d, x, y, w, h) => {
const t = w * 0.27;
const bar = (x0, y0, x1, y1) => {
const ang = Math.atan2(y1 - y0, x1 - x0);
const l = Math.hypot(x1 - x0, y1 - y0);
x3.save();
x3.translate(x0, y0);
x3.transform(1, 0, 0, 1, 0, 0);
x3.rotate(ang);
x3.beginPath();
x3.moveTo(t * 0.12, 0);
x3.lineTo(t * 0.6, -t / 2);
x3.lineTo(l - t * 0.6, -t / 2);
x3.lineTo(l - t * 0.12, 0);
x3.lineTo(l - t * 0.6, t / 2);
x3.lineTo(t * 0.6, t / 2);
x3.fill();
x3.restore();
};
const k = -h * 0.07; // the numerals lean a little
const P = (i, j) => [x + i * w - (j * k) / 2 + (1 - j) * -k * 0.0 + (2 - j) * -k * 0.5, y + (j * h) / 2];
[[0, 0, 1, 0], [0, 0, 0, 1], [1, 0, 1, 1], [0, 1, 1, 1], [0, 1, 0, 2], [1, 1, 1, 2], [0, 2, 1, 2]].forEach(([a0, b0, a1, b1], i) => {
if (SEG[d] & (1 << i)) bar(...P(a0, b0), ...P(a1, b1));
});
};
let shown = '';
const tell = (seconds, on) => {
const t = 21600 + seconds;
const key = `${t}${on}`;
if (key === shown) return;
shown = key;
x3.fillStyle = '#000';
x3.fillRect(0, 0, 384, 256);
x3.fillStyle = '#fff';
x3.font = '700 34px Arial, sans-serif';
x3.fillText('MO', 70, 52);
const two = (v) => [Math.floor(v / 10) % 10, v % 10];
const [h, mi, se] = [two(Math.floor(t / 3600)), two(Math.floor(t / 60) % 60), two(t % 60)];
digit(h[0], 22, 82, 48, 100);
digit(h[1], 90, 82, 48, 100);
x3.fillRect(160, 112, 11, 11);
x3.fillRect(157, 144, 11, 11);
digit(mi[0], 184, 82, 48, 100);
digit(mi[1], 252, 82, 48, 100);
digit(se[0], 318, 134, 19, 48);
digit(se[1], 349, 134, 19, 48);
x3.font = '700 32px Arial, sans-serif';
if (on) x3.fillText('ON', 112, 232);
x3.fillText('AUTO', 182, 232);
if (!on) x3.fillText('OFF', 296, 232);
gl.activeTexture(gl.TEXTURE4);
gl.bindTexture(gl.TEXTURE_2D, lcdTex);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, lcd);
gl.generateMipmap(gl.TEXTURE_2D);
};
let began = -1;
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
['500 mm', [-0.6, 2.68, 0.5], 0, -54, 0.05, 0.17], ['Water channels', [0.6, 0.4, 0.4], -150, 60, 0.06, 0.17], ['Male rail, slides into the next', [2.72, 1.2, 0.4], -120, -64, 0.07, 0.17], ['Foot tube, feeds the panel below', [0.2, -2.66, 0.42], 60, 66, 0.08, 0.17],
['Fixed at four corners', [2.22, 2.22, 0.52], -110, -70, 0.24, 0.35], ['Slots for the vessels', [-1.4, 1.1, 0.5], -130, -50, 0.25, 0.35],
['Hooks on by hand', [0, -0.3, 1.2], 150, 60, 0.48, 0.57], ['Drinks along its hook', [-1.95, 2.0, 0.5], -110, -40, 0.49, 0.57],
['Ring main', [-3.02, 2.3, 0.3], -80, -40, 0.61, 0.73], ['Feeds from the top', [0.5, 3.0, 0.3], 110, -50, 0.62, 0.73], ['Pump, under the water', [-2.75, -3.75, 0.5], 170, 34, 0.63, 0.73], ['Digital timer', [-3.95, -0.16, 0], -40, -46, 0.64, 0.73],
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
const keys = [[0, -0.66, 0.34, 15.5, 0], [0.1, -0.5, 0.24, 14.4, 0], [0.18, -0.4, 0.2, 14.2, 0], [0.27, -0.62, 0.16, 15, 0], [0.36, -0.34, 0.1, 13.4, 0.1], [0.5, -0.5, 0.24, 13.2, 0.1], [0.58, -0.3, 0.12, 14.6, -0.2], [0.645, -0.86, 0.15, 19, -0.72], [0.72, -0.8, 0.12, 18.6, -0.72], [0.8, -0.3, 0.07, 16, -0.2], [0.93, -0.26, 0.03, 34, 0], [1, -0.12, 0.02, 35, 0]];
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
const draw = (part, kind, m = I, grow = 1, drop = 1, see = 1) => {
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
if (u.uSee) gl.uniform1f(u.uSee, see);
gl.bindVertexArray(part.vao);
gl.drawElementsInstanced(gl.TRIANGLES, part.n, gl.UNSIGNED_INT, 0, part.count);
};
const a = span(p, 0.0, 0.1);
const b = span(p, 0.17, 0.32);
const vess = clamp((p - 0.36) / 0.19);
const part = span(p, 0.58, 0.645) * (1 - span(p, 0.7, 0.79)); // opened, to show the water
const grow = clamp((p - 0.68) / 0.13);
const visit = span(p, 0.04, 0.14) * (1 - span(p, 0.16, 0.23));
const end = clamp((p - 0.79) / 0.15);
const off = move(0, 0, part * 1.9);
const base = move(0, 0, (1 - a) * 2.4);
if (grow > 0) for (const pl of around[4].plants) draw(pl, pl.kind, off, grow);
const beside = [];
if (end > 0) around.forEach((n) => {
if (!n.far) return;
const k = ease(clamp(end * 1.6 - n.delay));
if (k <= 0.002) return;
const m = move(n.c * PITCH + n.c * (1 - k) * 5, -n.r * PITCH - n.r * (1 - k) * 5, (1 - k) * 3);
beside.push(m);
for (const pl of n.plants) draw(pl, pl.kind, m, clamp(k * 1.25 - 0.1));
});
if (vess > 0) {
draw(sun ? parts.vesselFar : parts.vessel, 4, off, 1, vess);
draw(parts.soil, 5, off, 1, vess);
}
if (!sun) for (const m of beside) draw(parts.vesselFar, 4, m);
const gz = 0.4 + (1 - b) * 5 + part * 1.9;
if (b > 0.005) {
const g = move(0, (1 - b) * 0.6, gz);
draw(parts.grid, 1, g);
draw(parts.screws, 2, g);
if (!sun) draw(parts.drive, 1, g);
}
const pipes = span(p, 0.555, 0.62);
const xray = span(p, 0.595, 0.64) * (1 - span(p, 0.725, 0.785)); // the reservoir clears, to show what lies in it
const pumpAt = (m) => move(PUMP[0], m[13] + PUMP[1], PUMP[2]);
const down = move(0, (1 - pipes) * -5 - span(p, 0.9, 0.97) * 2.4, 0);
if (pipes > 0.005 && p < 0.97) {
const pm = down;
draw(parts.pipes, 7, pm);
const tm = move(TIMER[0], TIMER[1] + down[13], TIMER[2]);
draw(parts.timer, 6, tm);
draw(parts.timerPlate, 8, tm);
draw(parts.timerLead, 1, tm);
if (xray > 0.01) draw(parts.pump, 1, pumpAt(pm));
if (xray < 0.01 || (sun && xray < 0.5)) draw(parts.tank, 1, pm);
if (!sun) {
draw(parts.timerKeys, 9, tm);
}
}
draw(parts.panel, 1, base);
if (visit > 0.01) {
draw(parts.panel, 1, move(PITCH, (1 - smooth(clamp(visit * 1.8))) * 6.5, (1 - a) * 2.4));
draw(parts.panel, 1, move((1 - smooth(clamp(visit * 1.8 - 0.8))) * 8, PITCH, (1 - a) * 2.4));
}
for (const m of beside) draw(parts.panelFar, 1, m);
if (!sun) draw(parts.wall, 0);
const wet = span(p, 0.61, 0.69) * (1 - span(p, 0.78, 0.82));
if (!sun && (wet > 0.01 || xray > 0.01)) {
gl.enable(gl.BLEND);
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
gl.depthMask(false);
if (wet > 0.01) draw(parts.streams, 3);
if (xray > 0.01) {
draw(parts.pool, 3.3, down, 1, 1, xray);
draw(parts.tank, 1, down, 1, 1, 1 - 0.8 * xray);
}
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
const running = p > 0.612 && p < 0.8;
if (!running) began = -1;
else if (began < 0) began = t;
tell(running ? Math.floor(t - began) : p >= 0.8 ? 900 : Math.min(-1, Math.floor((p - 0.612) * 300)), running);
bind(4, lcdTex);
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
gl.uniform1i(u.uLcd, 4);
gl.uniform1f(u.uOn, running ? 1 : 0);
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
const cur = { x: -1, v: 0 };
let from = null;
const held = (e) => {
const r = canvas.getBoundingClientRect();
const px = ((e.clientX - r.left) / r.width) * 2 - 1;
const py = 1 - ((e.clientY - r.top) / r.height) * 2;
const far = cur.x > 0.86 ? 7.6 : 2.75;
const pts = [];
for (const x of [-far, far]) for (const y of [-far, far]) for (const z of [0, 1.3]) {
const c = [0, 1, 3].map((k) => VP[k] * x + VP[4 + k] * y + VP[8 + k] * z + VP[12 + k]);
pts.push([c[0] / c[2], c[1] / c[2]]);
}
const a = pts.map(([x, y]) => Math.atan2(y - py, x - px)).sort((m, n) => m - n);
let gap = a[0] + Math.PI * 2 - a[a.length - 1];
for (let i = 1; i < a.length; i++) gap = Math.max(gap, a[i] - a[i - 1]);
return gap < Math.PI;
};
canvas.addEventListener('pointerdown', (e) => {
if (!held(e)) return;
from = { x: e.clientX, y: e.clientY, tx: turn.tx, ty: turn.ty };
canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
if (!from) {
if (e.pointerType === 'mouse') {
if (held(e)) canvas.dataset.cursor = 'Turn';
else delete canvas.dataset.cursor;
}
return;
}
turn.tx = Math.max(-1.1, Math.min(1.5, from.tx - (e.clientX - from.x) / 260));
turn.ty = e.pointerType === 'mouse' ? Math.max(-0.4, Math.min(0.6, from.ty + (e.clientY - from.y) / 340)) : 0;
turn.gust = 1;
});
for (const ev of ['pointerup', 'pointercancel']) canvas.addEventListener(ev, () => { from = null; });
let lost = false;
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
gl.uniform1i(progs[i].u.uLcd, 4);
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

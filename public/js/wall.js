
const MAX_CELLS = 200;
const PLANTS = 3; // plants across and down each panel, as they look once grown in
const SEGMENTS = 4;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const LEAF_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aQ;
layout(location=1) in vec4 aA; // x, y (modules), angle, length (modules)
layout(location=2) in vec4 aB; // sprite, cell, phase, delay
layout(location=3) in vec4 aC; // shade, width, mirror, bend
uniform vec2 uRes, uOrigin, uShift;
uniform float uM, uT, uGust, uTilt;
uniform vec3 uPtr;
uniform vec3 uRip[4];
uniform vec2 uCell[${MAX_CELLS}];
out vec2 vUv; out float vShade, vGlow;
void main(){
vec2 c = uCell[int(aB.y + .5)];
float g = c.x < 0. ? 0. : clamp((uT - c.x - aB.w) / 1.7, 0., 1.);
float k = 1. - g;
g = g <= 0. ? 0. : 1. - k*k*k*k*(1. - 1.15*g);
if (c.y > 0.) g *= 1. - smoothstep(0., .5, uT - c.y);
float y = aQ.y;
float wind = sin(uT*.9 + aB.z) * .022
+ sin(uT*.45 - aA.x*1.1 + aA.y*.5) * .04 * (.6 + .4*sin(uT*.21 + aA.x*.3));
wind = wind * (1. + uGust) + uGust * .03 * sin(uT * 2.4 + aB.z * 2. + aA.y) + uTilt;
float ang = aA.z * mix(.5, 1., g) + wind;
float bend = aC.w + wind * 1.4;
float a1 = ang + bend * y * .5;
float a2 = ang + bend * y;
float len = aA.w * uM * g;
vec2 p = uOrigin + aA.xy * uM + vec2(sin(a1), -cos(a1)) * len * y;
p += vec2(cos(a2), sin(a2)) * aQ.x * len * aC.y;
vec2 d = p - uPtr.xy;
float f = exp(-dot(d, d) / (uM * uM * .7)) * uPtr.z;
p += normalize(d + .001) * f * len * y * .3;
float glow = exp(-dot(d, d) / (uM * uM * 3.4)) * uPtr.z * .3;
for (int i = 0; i < 4; i++) {
float age = uT - uRip[i].z;
if (uRip[i].z > 0. && age < 2.6) {
vec2 q = p - uRip[i].xy;
float w = (length(q) - age * uM * 2.4) / (uM * .6);
w = exp(-w * w) * (1. - age / 2.6);
p += normalize(q + .001) * w * len * y * .28;
glow += w * .22;
}
}
float beam = (p.x * .62 + p.y * .78 - mod(uT * uM * .42, uRes.x + uRes.y + uM * 8.) + uM * 4.) / (uM * 2.6);
glow += exp(-beam * beam) * .24;
p += uShift;
vGlow = glow;
vShade = aC.x;
vec2 cell = vec2(mod(aB.x, 4.), floor(aB.x / 4.));
vUv = (cell + vec2(.5 + aQ.x * aC.z * .99, 1. - y * .985 - .008)) / 4.;
gl_Position = vec4(p.x / uRes.x * 2. - 1., 1. - p.y / uRes.y * 2., 0., 1.);
}`;
const LEAF_FS = `#version 300 es
precision mediump float;
in vec2 vUv; in float vShade, vGlow;
uniform sampler2D uTex; uniform float uShadow; uniform vec3 uTint; uniform float uGrade;
out vec4 o;
void main(){
vec4 t = texture(uTex, vUv, -.35);
if (t.a < .04) discard;
if (uShadow > 0.) { o = vec4(.02, .07, .05, 1.) * (t.a * uShadow); return; }
vec3 col = t.rgb / t.a;
float l = dot(col, vec3(.3, .59, .11));
vec3 ramp = mix(vec3(.02, .09, .07), vec3(.10, .34, .23), smoothstep(0., .34, l));
ramp = mix(ramp, vec3(.42, .66, .20), smoothstep(.28, .62, l));
ramp = mix(ramp, vec3(.70, .86, .40), smoothstep(.6, 1., l));
col = mix(col, ramp, uGrade);
col = mix(col * col * 1.15, col, .55);
col *= vShade * (1. + vGlow * 1.5);
col += vec3(.05, .06, .0) * vGlow * vShade;
o = vec4(col * uTint, 1.) * t.a;
}`;
const PANEL_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aQ;
layout(location=1) in vec3 aP; // col, row, cell
uniform vec2 uRes, uOrigin; uniform float uM, uT;
uniform vec2 uCell[${MAX_CELLS}];
out vec2 vUv; out float vA;
void main(){
vec2 c = uCell[int(aP.z + .5)];
float g = c.x < 0. ? 0. : clamp((uT - c.x) / .9, 0., 1.);
float e = 1. - pow(1. - g, 5.);
float away = c.y > 0. ? smoothstep(.15, .55, uT - c.y) : 0.;
vA = min(g * 2.4, 1.) * (1. - away);
vec2 p = uOrigin + (aP.xy + vec2((1. - e) * .5, 0.) + (aQ * 1.2 - .1)) * uM;
vUv = aQ;
gl_Position = vec4(p.x / uRes.x * 2. - 1., 1. - p.y / uRes.y * 2., 0., 1.);
}`;
const PANEL_FS = `#version 300 es
precision mediump float;
in vec2 vUv; in float vA; uniform sampler2D uTex; out vec4 o;
void main(){ o = texture(uTex, vUv) * vA; }`;
const SP = {
monstera: { s: 0, len: 0.92 }, scindapsus: { s: 1, len: 0.84 }, ivy: { s: 2, len: 0.8 }, fern: { s: 3, len: 0.86 },
delmon: { s: 4, len: 0.86 }, diff: { s: 5, len: 0.82 }, grass: { s: 6, len: 0.94 }, laurel: { s: 7, len: 0.82 },
fittonia: { s: 8, len: 0.74 }, trad: { s: 9, len: 0.78 },
hfern: { s: 10, len: 0.96, h: 1 }, hivy: { s: 11, len: 0.9, h: 1 }, htrad: { s: 12, len: 0.86, h: 1 },
haspar: { s: 13, len: 0.98, h: 1 }, hdelmon: { s: 14, len: 0.82, h: 1 }, hbox: { s: 15, len: 0.8, h: 1 },
};
const STYLES = [
[['scindapsus', 'scindapsus', 'trad'], ['trad', 'htrad', 'scindapsus'], ['fern', 'hfern', 'haspar'], ['ivy', 'hivy', 'laurel'], ['monstera', 'delmon', 'monstera'], ['diff', 'laurel', 'diff'], ['grass', 'hfern', 'grass']],
[['fern', 'hfern'], ['haspar', 'fern', 'hfern'], ['hfern', 'haspar', 'ivy'], ['fern', 'hivy', 'grass'], ['haspar', 'fern'], ['grass', 'hfern'], ['fern', 'haspar', 'grass']],
[['monstera', 'delmon'], ['scindapsus', 'monstera'], ['delmon', 'diff'], ['monstera', 'laurel'], ['diff', 'scindapsus'], ['delmon', 'fittonia'], ['monstera', 'diff']],
];
function rng(seed) {
let a = seed >>> 0;
return () => {
a = (a + 0x6d2b79f5) >>> 0;
let t = Math.imul(a ^ (a >>> 15), 1 | a);
t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
}
function speciesAt(u, v, r, style) {
const n = Math.sin(u * 0.72 - v * 1.25 + Math.sin(u * 0.7 + v * 0.35) * 1.15 + 0.4) * 1.75 + Math.sin(u * 0.4 + v * 0.5) * 0.3 + (r() - 0.5) * 0.4;
const at = n > 1.4 ? 0 : n > 0.9 ? 1 : n > 0.25 ? 2 : n > -0.35 ? 3 : n > -1.05 ? 4 : n > -1.5 ? 5 : 6;
const set = STYLES[style][at];
return SP[set[Math.floor(r() * set.length)]];
}
function buildPlants(cols, rows, style) {
const wide = cols * PLANTS;
const tall = rows * PLANTS;
const step = wide % 7 ? 7 : 11; // coprime with the width, so every place is visited once
const data = new Float32Array(wide * tall * 3 * 12);
let o = 0;
let back = 0;
for (let layer = 0; layer < 3; layer++) {
for (let py = tall - 1; py >= 0; py--) {
for (let k = 0; k < wide; k++) {
const px = (k * step + py * 3) % wide;
const r = rng((py * wide + px) * 331 + layer * 7919 + 5);
const off = layer === 1 ? 0.5 : 0;
const x0 = (px + 0.5 + off + (r() - 0.5) * 0.7) / PLANTS;
const y0 = (py + 0.62 + off * 0.5 + (r() - 0.5) * 0.6) / PLANTS;
const sp = speciesAt(x0, y0, r, style);
const a = (r() * 2 - 1) * (layer === 2 ? 0.62 : 0.95);
data[o++] = layer ? Math.min(cols - 0.04, x0) : Math.min(cols - 0.16, Math.max(0.16, x0));
data[o++] = sp.h ? y0 - 0.34 : y0 + 0.12;
data[o++] = sp.h ? Math.PI + a * 0.35 : a;
data[o++] = sp.len * (0.74 + r() * 0.4) * (layer ? 1 : 1.12);
data[o++] = sp.s;
data[o++] = Math.floor(py / PLANTS) * cols + Math.floor(px / PLANTS);
data[o++] = r() * 6.28;
data[o++] = 0.35 + r() * 0.9;
data[o++] = (layer === 0 ? 0.46 : layer === 1 ? 0.68 : 1.06) + (r() - 0.5) * 0.18;
data[o++] = 0.92 + r() * 0.2;
data[o++] = r() < 0.5 ? -1 : 1;
data[o++] = (r() - 0.5) * 0.3;
}
}
if (!layer) back = o / 12;
}
return { data, count: o / 12, back };
}
function drawPanel() {
const S = 256;
const pad = S * (0.1 / 1.2);
const W = S - pad * 2;
const cv = document.createElement('canvas');
cv.width = cv.height = S;
const x = cv.getContext('2d');
x.save();
x.shadowColor = 'rgba(8,40,31,.3)';
x.shadowBlur = 12;
x.shadowOffsetX = 4;
x.shadowOffsetY = 7;
x.fillStyle = '#131c19';
x.fillRect(pad, pad, W, W);
x.restore();
const cw = W / 5;
const ch = W / 4;
for (let r = 0; r < 4; r++) {
for (let k = 0; k < 5; k++) {
const px = pad + (k + 0.5) * cw;
const py = pad + (r + 0.24) * ch;
const pw = cw * 0.46;
const g = x.createLinearGradient(px - pw, 0, px + pw, 0);
g.addColorStop(0, '#0a0f0d');
g.addColorStop(0.32, '#38423f');
g.addColorStop(1, '#080c0b');
x.fillStyle = g;
x.beginPath();
x.moveTo(px - pw, py);
x.lineTo(px - pw * 0.62, py + ch * 0.62);
x.lineTo(px + pw * 0.62, py + ch * 0.62);
x.lineTo(px + pw, py);
x.fill();
}
}
return cv;
}
function compile(gl, vs, fs) {
const p = gl.createProgram();
for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
const sh = gl.createShader(type);
gl.shaderSource(sh, src);
gl.compileShader(sh);
gl.attachShader(p, sh);
}
gl.linkProgram(p);
return p;
}
function finish(gl, p) {
if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('wall shader');
const u = {};
const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
for (let i = 0; i < n; i++) {
const a = gl.getActiveUniform(p, i);
u[a.name.replace('[0]', '')] = gl.getUniformLocation(p, a.name);
}
return { p, u };
}
const breathe = () => new Promise((r) => { setTimeout(r, 0); });
let atlasPromise;
export const foliage = () => (atlasPromise ??= (async () => {
const img = new Image();
img.src = '/img/foliage.webp';
await img.decode();
return img;
})());
export async function createWall(canvas, { grade = 0.5 } = {}) {
const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, powerPreference: 'high-performance' });
if (!gl) throw new Error('no webgl2');
const raw = [compile(gl, LEAF_VS, LEAF_FS), compile(gl, PANEL_VS, PANEL_FS)];
const ext = gl.getExtension('KHR_parallel_shader_compile');
const bitmap = await createImageBitmap(await foliage(), { premultiplyAlpha: 'premultiply' });
const texture = (src) => {
const t = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, t);
gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
gl.generateMipmap(gl.TEXTURE_2D);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 5); // cells never bleed into each other
return t;
};
const atlas = texture(bitmap);
await breathe();
const panelTex = texture(drawPanel());
while (ext && raw.some((p) => !gl.getProgramParameter(p, ext.COMPLETION_STATUS_KHR))) await breathe();
const [leafP, panelP] = raw.map((p) => finish(gl, p));
const strip = [];
for (let i = 0; i <= SEGMENTS; i++) strip.push(-0.5, i / SEGMENTS, 0.5, i / SEGMENTS);
const buffer = (data) => {
const b = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, b);
if (data) gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
return b;
};
const attr = (loc, n, stride = 0, off = 0, div = 0) => {
gl.enableVertexAttribArray(loc);
gl.vertexAttribPointer(loc, n, gl.FLOAT, false, stride, off);
gl.vertexAttribDivisor(loc, div);
};
const leafVao = gl.createVertexArray();
gl.bindVertexArray(leafVao);
buffer(strip);
attr(0, 2);
const leafBuf = buffer();
for (let i = 0; i < 3; i++) attr(i + 1, 4, 48, i * 16, 1);
const panelVao = gl.createVertexArray();
gl.bindVertexArray(panelVao);
buffer([0, 0, 1, 0, 0, 1, 1, 1]);
attr(0, 2);
const panelBuf = buffer();
attr(1, 3, 0, 0, 1);
gl.bindVertexArray(null);
const cells = new Float32Array(MAX_CELLS * 2).fill(-1); // [planted at, removed at]
const rip = new Float32Array(12);
let ripAt = 0;
let maxDpr = 2;
let built = '';
const t0 = performance.now();
const W = {
L: { w: 1, h: 1, cols: 0, rows: 0, m: 100, ox: 0, oy: 0, count: 0, back: 0 },
ptr: { x: -9999, y: -9999, s: 0, target: 0 },
gust: 0,
tilt: 0,
tint: [1, 1, 1],
planted: [],
now: () => (performance.now() - t0) / 1000,
place(next, style = 0) {
Object.assign(W.L, next);
const { cols, rows } = W.L;
const key = `${cols}x${rows}x${style}`;
if (key === built) return false;
built = key;
const b = buildPlants(cols, rows, style);
W.L.count = b.count;
W.L.back = b.back;
gl.bindBuffer(gl.ARRAY_BUFFER, leafBuf);
gl.bufferData(gl.ARRAY_BUFFER, b.data, gl.STATIC_DRAW);
const pd = [];
for (let i = 0; i < cols * rows; i++) pd.push(i % cols, Math.floor(i / cols), i);
gl.bindBuffer(gl.ARRAY_BUFFER, panelBuf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pd), gl.STATIC_DRAW);
cells.fill(-1);
W.planted = new Array(cols * rows).fill(false);
return true;
},
plant(i, on = true, delay = 0) {
if (W.planted[i] === on) return;
W.planted[i] = on;
if (on) {
cells[i * 2] = reduced ? 0 : W.now() + delay;
cells[i * 2 + 1] = 0;
} else cells[i * 2 + 1] = reduced ? 0.01 : W.now();
},
ripple(x, y) {
rip.set([x, y, W.now()], ripAt * 3);
ripAt = (ripAt + 1) % 4;
},
draw() {
const { L } = W;
const dpr = Math.min(devicePixelRatio || 1, maxDpr);
const cw = Math.round(L.w * dpr);
const ch = Math.round(L.h * dpr);
if (canvas.width !== cw || canvas.height !== ch) {
canvas.width = cw;
canvas.height = ch;
}
const use = (prog, tex, vao) => {
gl.useProgram(prog.p);
gl.uniform2f(prog.u.uRes, L.w, L.h);
gl.uniform2f(prog.u.uOrigin, L.ox, L.oy);
gl.uniform1f(prog.u.uM, L.m);
gl.uniform1f(prog.u.uT, reduced ? 60 : W.now());
gl.uniform2fv(prog.u.uCell, cells);
gl.bindTexture(gl.TEXTURE_2D, tex);
gl.bindVertexArray(vao);
};
gl.viewport(0, 0, cw, ch);
gl.clearColor(0, 0, 0, 0);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.enable(gl.BLEND);
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
const verts = strip.length / 2;
const leaves = (shadow, sx, sy, n) => {
use(leafP, atlas, leafVao);
gl.uniform3f(leafP.u.uPtr, W.ptr.x, W.ptr.y, W.ptr.s);
gl.uniform3fv(leafP.u.uRip, rip);
gl.uniform3fv(leafP.u.uTint, W.tint);
gl.uniform1f(leafP.u.uGrade, grade);
gl.uniform1f(leafP.u.uGust, W.gust);
gl.uniform1f(leafP.u.uTilt, W.tilt);
gl.uniform1f(leafP.u.uShadow, shadow);
gl.uniform2f(leafP.u.uShift, sx, sy);
gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, verts, n);
};
leaves(0.09, L.m * 0.06, L.m * 0.12, L.back);
use(panelP, panelTex, panelVao);
gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, L.cols * L.rows);
leaves(0, 0, 0, L.count);
},
run(watch, each) {
let raf = 0;
let visible = true;
let last = 0;
let avg = 12;
let frames = 0;
const frame = (t) => {
raf = 0;
const dt = Math.min(100, t - last);
last = t;
if (++frames > 40 && dt < 100) {
avg = avg * 0.95 + dt * 0.05;
if (avg > 22 && maxDpr > 1) {
maxDpr = Math.max(1, maxDpr - 0.5);
avg = 12;
frames = 0;
}
}
W.ptr.s += (W.ptr.target - W.ptr.s) * (1 - Math.exp(-dt / 200));
each?.(dt);
W.draw();
go();
};
const go = () => {
if (!raf && visible && !document.hidden && !reduced) raf = requestAnimationFrame(frame);
};
new IntersectionObserver(([e]) => {
visible = e.isIntersecting;
go();
}).observe(watch);
document.addEventListener('visibilitychange', go);
if (reduced) W.draw();
go();
},
lost(fn) {
canvas.addEventListener('webglcontextlost', fn);
},
};
return W;
}
function pointer(W, area, box) {
const at = (e) => {
const r = box.getBoundingClientRect();
W.ptr.x = e.clientX - r.left;
W.ptr.y = e.clientY - r.top;
};
area.addEventListener('pointermove', (e) => {
at(e);
W.ptr.target = 1;
}, { passive: true });
area.addEventListener('pointerleave', () => { W.ptr.target = 0; });
area.addEventListener('pointercancel', () => { W.ptr.target = 0; });
area.addEventListener('pointerdown', (e) => {
at(e);
W.ripple(W.ptr.x, W.ptr.y);
if (e.pointerType !== 'mouse') {
W.ptr.target = 1;
setTimeout(() => { W.ptr.target = 0; }, 900);
}
}, { passive: true });
}
function tilt(W) {
if (reduced || !matchMedia('(pointer: coarse)').matches || typeof DeviceOrientationEvent === 'undefined' || DeviceOrientationEvent.requestPermission) return;
addEventListener('deviceorientation', (e) => {
W.tiltTo = Math.max(-0.22, Math.min(0.22, (e.gamma || 0) / 130));
}, { passive: true });
}
export async function heroWall(hero) {
const canvas = hero.querySelector('[data-wall]');
const stage = hero.querySelector('[data-stage]');
const pin = hero.closest('[data-pin]');
let W;
try {
W = await createWall(canvas);
} catch {
hero.classList.add('no-webgl');
return;
}
let spread = [];
let grown = -1;
let shownP = -1;
const auto = new Set(); // planted by scrolling, so scrolling back removes them
function layout() {
const hr = hero.getBoundingClientRect();
const sr = stage.getBoundingClientRect();
const small = hr.width < 700;
const inRows = Math.max(3, Math.round(sr.height / (small ? 108 : 158)));
const m = sr.height / inRows;
const bottom = sr.bottom - hr.top;
const rows = Math.ceil(bottom / m - 0.02);
const cols = Math.min(Math.floor(MAX_CELLS / rows), Math.ceil(hr.width / m - 0.02));
const fresh = W.place({ w: hr.width, h: hr.height, cols, rows, m, ox: hr.width - cols * m, oy: bottom - rows * m });
shownP = -1;
if (!fresh) return;
const c0 = cols - Math.round(sr.width / m);
const r0 = rows - inRows;
const col = (i) => i % cols;
const row = (i) => Math.floor(i / cols);
const cost = (i) => cols - 1 - col(i) + (rows - 1 - row(i)) * 0.8 + Math.sin((col(i) - c0) * 2.1 + (row(i) - r0) * 1.7) * 0.35;
const all = [...Array(cols * rows).keys()].sort((a, b) => cost(a) - cost(b));
const inside = all.filter((i) => col(i) >= c0 && row(i) >= r0);
const first = new Set(inside.slice(0, Math.round(inside.length * (small ? 0.82 : 0.74))));
auto.clear();
grown = -1;
spread = all.filter((i) => !first.has(i));
[...first].forEach((i, k) => W.plant(i, true, 0.1 + k * 0.07));
}
function grow() {
if (reduced) return;
const box = pin.getBoundingClientRect();
const p = Math.min(1, Math.max(0, -box.top / Math.max(1, box.height - innerHeight)));
if (p === shownP) return;
shownP = p;
const goal = Math.round(Math.min(1, p / 0.62) * spread.length);
if (goal !== grown) {
grown = goal;
spread.forEach((i, k) => {
if (k < goal && !W.planted[i]) {
auto.add(i);
W.plant(i, true);
} else if (k >= goal && auto.has(i)) {
auto.delete(i);
W.plant(i, false);
}
});
}
hero.style.setProperty('--p', p.toFixed(3));
hero.classList.toggle('is-grown', p > 0.2);
}
W.lost(() => hero.classList.add('no-webgl'));
pointer(W, hero, hero);
tilt(W);
hero.querySelector('[data-copy]').addEventListener('focusin', () => {
if (hero.classList.contains('is-grown')) scrollTo({ top: pin.offsetTop, behavior: 'instant' });
});
layout();
let timer;
let seenW = innerWidth;
new ResizeObserver(() => {
clearTimeout(timer);
timer = setTimeout(() => {
if (innerWidth !== seenW || !matchMedia('(pointer: coarse)').matches) layout();
seenW = innerWidth;
if (reduced) W.draw();
}, 120);
}).observe(stage);
let lastY = scrollY;
W.run(hero, (dt) => {
const k = 1 - Math.exp(-dt / 180);
W.gust += (Math.min(1.8, (Math.abs(scrollY - lastY) / Math.max(dt, 4)) * 0.5) - W.gust) * k;
W.tilt += ((W.tiltTo ?? 0) - W.tilt) * k;
lastY = scrollY;
grow();
});
hero.classList.add('wall-ready');
}
export async function stripWall(host) {
const stage = host.querySelector('[data-stage]');
const W = await createWall(host.querySelector('[data-wall]'));
const layout = () => {
const hr = host.getBoundingClientRect();
const m = stage.getBoundingClientRect().height;
const cols = Math.min(MAX_CELLS, Math.ceil(hr.width / m));
if (W.place({ w: hr.width, h: hr.height, cols, rows: 1, m, ox: (hr.width - cols * m) / 2, oy: hr.height - m })) {
[...Array(cols).keys()].sort((a, b) => Math.abs(a - cols / 2) - Math.abs(b - cols / 2)).forEach((i, k) => W.plant(i, true, k * 0.09));
}
};
pointer(W, host.parentElement, host);
layout();
new ResizeObserver(layout).observe(host);
W.run(host);
}
export async function frameWall(canvas, watch) {
const W = await createWall(canvas, { grade: 0.42 });
W.run(watch);
return {
W,
set({ cols, rows, m, pad, style }) {
const fresh = W.place({ w: cols * m + pad * 2, h: rows * m + pad * 2, cols, rows, m, ox: pad, oy: pad }, style);
if (fresh) for (let i = 0; i < cols * rows; i++) W.plant(i, true, ((i % cols) + (rows - 1 - Math.floor(i / cols))) * 0.1);
if (reduced) W.draw();
},
};
}

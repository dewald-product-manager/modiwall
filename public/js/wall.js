
import { page, scene, box, follow, clamp, smooth } from './frame.js?v=c5329617';
import { programs, picture, texture } from './gl.js?v=da570bfd';
const MAX_CELLS = 900;
const CELL = 0.25; // metres to one growing cell
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const STYLE_NAMES = ['in-midday', 'in-morning', 'in-evening', 'ex-morning', 'ex-midday', 'ex-evening'];
const SIZE = { 'in-midday': [3.6, 2.4, 2304] }; // metres across, metres high, pixels the leaf table is written in
const sizeOf = (name) => SIZE[name] ?? [2.4, 1.6, 1536];
const COMMON = `#version 300 es
precision highp float; precision highp int;
uniform vec2 uRes, uOrigin, uGrid, uPlate, uPar, uCentre;
uniform float uM, uCell, uS, uT, uGust, uTilt, uAmb, uKey, uZoom;
uniform vec3 uPtr, uTint;
uniform vec3 uRip[4];
uniform vec4 uLamp; uniform vec2 uWater;
uniform vec4 uTile;
uniform sampler2D uTex, uCells, uAux, uId, uLight;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
`;
const LEAF_VS = `${COMMON}
layout(location=0) in vec2 aG; layout(location=1) in vec4 aR; layout(location=2) in vec4 aB; layout(location=3) in vec4 aZ; layout(location=4) in vec2 aS;
uniform vec2 uShade; uniform float uN; uniform int uRips; uniform sampler2D uHull;
out vec2 vUv; out vec2 vPx; flat out float vId; out float vYoung; out float vFace; out float vZ; out float vT; flat out float vA; flat out float vSeed; out float vSun; out vec2 vRest; out float vOpen; out float vUnder;
void main(){
vec2 q = (aR.xy - uOrigin) / uCell;
float g = texture(uCells, q / uGrid).r;
float seed = aZ.y, zt = clamp(aZ.x / 320., 0., 1.);
float wait = seed * .30 + zt * .22;                          // leaves nearest the wall come first
float k = clamp((g * 1.62 - wait) / 1.04, 0., 1.);
float gl = mix(k * k * (3. - 2. * k), 1. - (1. - k) * (1. - k) * (1. - k), smoothstep(0., .6, k)); // leaves the stem gently, settles slowly
float unroll = smoothstep(.02, .85, k);
vA = smoothstep(.02, .24, k);
vec2 hull = texelFetch(uHull, ivec2(int(aG.y * 4. + .5), int(aZ.z) - 1), 0).rg;       // only as wide as the leaf is here
vec2 b = mix(aB.xy, aB.zw, vec2(mix(hull.x, hull.y, aG.x), aG.y));
vUv = (aR.zw + b) / uPlate;
vec2 c = (aB.xy + aB.zw) * .5;
vec2 dir = normalize(c + vec2(.001, .01));
vec2 ac = vec2(-dir.y, dir.x);
float reach = max(dot(abs(c), abs(dir)) + dot((aB.zw - aB.xy) * .5, abs(dir)), 1.);
float along = dot(b, dir), across = dot(b, ac), t = clamp(along / reach, 0., 1.);
float curl = (1. - unroll) * (1.15 + .6 * seed) * (.35 + .65 * t);
float spring = sin(k * 9.) * exp(-k * 4.6) * .09 * smoothstep(0., .2, k);
float ca = cos(curl + spring);
float sc = abs(aS.x);
vec2 p = (dir * along * ca + ac * across * mix(.46, 1., unroll)) * gl * sc;
p.x *= sign(aS.x); float cr = cos(aS.y), sr = sin(aS.y); p = vec2(p.x * cr + p.y * sr, p.y * cr - p.x * sr);
vec2 at0 = b * sc; at0.x *= sign(aS.x); at0 = vec2(at0.x * cr + at0.y * sr, at0.y * cr - at0.x * sr);
vRest = (aR.xy + at0 - uTile.xy) / uTile.zw;                  // where this point lies in the finished wall
float z = (aZ.x * uM / 500.) * mix(.25, 1., gl) + sin(curl) * along * gl * sc;
vec2 px = aR.xy + p;
float sw = sin(uT*.62 - px.x*.0052 + px.y*.0034) * (.6 + .4*sin(uT*.23 + px.x*.002));
float tr = sin(uT*(1.1 + seed*.9) + seed*40.);
float len = reach * sc;
float rot = (sw * .020 + tr * (.011 + uGust*.030) + uTilt * .5 + uGust * .03 * sin(uT*3.1 + px.y*.012)) * t;
vec2 pd = px - uPtr.xy; float d2 = dot(pd, pd);
float pf = exp(-d2 / (uM * uM * .55)) * uPtr.z * t;
vec2 push = normalize(pd + .01) * pf * min(16., len * .22);
for (int i = 0; i < uRips; i++) {
float age = uT - uRip[i].z;
if (uRip[i].z > 0. && age < 2.8) { vec2 r = px - uRip[i].xy; float w = (length(r) - age * uM * 1.7) / (uM * .42); push += normalize(r + .01) * exp(-w*w) * (1. - age / 2.8) * t * min(14., len * .2); }
}
float wet = exp(-pow((px.y - uWater.x) / (uM * .42), 2.)) * uWater.y;
push += vec2(sin(seed * 60. + uT * 5.) * .35, 1.) * wet * t * min(10., len * .12);
p += vec2(-p.y, p.x) * rot + push;
z -= pf * len * .25;
px = aR.xy + p;
px += z * uShade;
px += uPar * z * .34;                                         // perspective: nearer leaves move further
px = uCentre + (px - uCentre) * (1. + z / 3400.) * uZoom;
vec2 w = px / uM;
float tree = .5 + .25 * sin(w.x * 1.7 + uT * .21 + sin(w.y * 1.3 - uT * .13) * 1.6) + .25 * sin(w.y * 2.3 - uT * .17 + sin(w.x * 2.1 + uT * .11) * 1.4);
float beam = (w.x*.62 + w.y*.78 - mod(uT * .30, (uRes.x + uRes.y) / uM + 8.) + 4.) / 1.9;
vSun = mix(.6, 1.2, smoothstep(.3, .7, tree)) + exp(-beam*beam) * .34;
vPx = px; vId = aZ.z; vYoung = 1. - smoothstep(.35, 1., k); vFace = ca; vZ = zt; vT = t; vSeed = seed;
vec2 ua = q + vec2(-.35, -1.1), ub = q + vec2(-.9, -.35);
float over = min(texture(uCells, ua / uGrid).r * step(0., ua.y), texture(uCells, ub / uGrid).r * step(0., ub.x));
vOpen = 1. - over * over;
vec2 ud = q + vec2(0., .62); vUnder = 1. - (ud.y < uGrid.y ? texture(uCells, ud / uGrid).r : 0.);
vec2 cl = px / uRes * 2. - 1.;
gl_Position = k <= .001 || vA <= .001 ? vec4(2., 2., 2., 1.) : vec4(cl.x, -cl.y, .98 - clamp((aZ.x + 120.) / 760., 0., 1.) * 1.94 + (float(gl_InstanceID) + 1.) / uN * 2e-4, 1.);   // true depth, leaf by leaf
}`;
const LEAF_FS = `${COMMON}
uniform float uMask;
in vec2 vUv; in vec2 vPx; flat in float vId; in float vYoung; in float vFace; in float vZ; in float vT; flat in float vA; flat in float vSeed; in float vSun; in vec2 vRest; in float vOpen; in float vUnder; out vec4 o;
float at(vec2 uv){ ivec2 n = textureSize(uId, 0); ivec2 p = ivec2(floor(uv * vec2(n))); p = ((p % n) + n) % n; vec4 c = texelFetch(uId, p, 0); return floor(c.r * 255. + .5) + floor(c.g * 255. + .5) * 256. == vId ? .25 : 0.; }
float cover(){ vec2 n = vec2(textureSize(uId, 0)), a = dFdx(vUv), b = dFdy(vUv); a *= max(1., .95 / max(length(a * n), .01)); b *= max(1., .95 / max(length(b * n), .01)); return at(vUv + a * .125 + b * .375) + at(vUv - a * .125 - b * .375) + at(vUv + a * .375 - b * .125) + at(vUv - a * .375 + b * .125); }
void main(){
float al = cover();
if (uMask > .5) { if (al < .01) discard; o = vec4(min(1., al)); return; }
al = min(1., al * 1.5) * vA;
if (al < .06) discard;
vec3 col = texture(uTex, vUv, -.5).rgb;
vec3 x = texture(uAux, vUv).rgb; vec2 n = x.yz * 2. - 1.;
vec2 w = vPx / uM;
col *= 1. - x.r + x.r * mix(1., vSun, uKey);                  // only the direct part of the light moves
vec2 pd = vPx - uPtr.xy; col *= 1. + exp(-dot(pd, pd) / (uM * uM * 2.2)) * uPtr.z * (.22 + .4 * x.r);
col = mix(col, pow(col, vec3(.72)) * vec3(1.16, 1.12, .62), vYoung * .62);
col *= mix(.62, 1., clamp(vFace, 0., 1.));
float wetf = uWater.y * exp(-pow((vPx.y - uWater.x) / (uM * .5), 2.)), trail = uWater.y * smoothstep(uWater.x + uM * .2, uWater.x - uM * .4, vPx.y) * smoothstep(uWater.x - uM * 3.2, uWater.x - uM * .4, vPx.y);
float glint = pow(clamp(1. - abs(n.x * .7 + n.y * .5 - .34 + .12 * sin(vPx.x * .09 + vPx.y * .21 - uT * 6.)) * 2.4, 0., 1.), 5.);
col = col * (1. - .16 * max(wetf, trail)) + vec3(.75, .86, .9) * glint * (wetf * .55 + trail * .26) * smoothstep(.1, .5, vZ + .25);
vec2 ld = vPx - uLamp.xy; float fall = uLamp.w / (1. + dot(ld, ld) / (uLamp.z * uLamp.z) * 1.35);
vec2 ln = normalize(ld + .01); float lf = clamp(.82 - dot(n, vec2(ln.x, -ln.y)) * .75 + vZ * .25, .25, 1.4);
col *= vec3(uAmb) * mix(vec3(.55, .78, 1.15), vec3(1.), uAmb) + vec3(1.5, 1.2, .8) * fall * lf;
col = col / (1. + max(col - .78, 0.) * .9);
vec3 L = texture(uLight, vRest).rgb; L *= L * 2.;
L = mix(L, max(L, vec3(.50 + .42 * vZ)) , vOpen * .85);
L *= 1. - vUnder * .42 * (1. - vZ * .75) * smoothstep(.0, .8, vT * .6 + .4);   // it turns under at its foot
L = mix(L, vec3(1.), vYoung * .5);
col *= L;
o = vec4(clamp(col * uTint, 0., 1.), al);
}`;
const QUAD_VS = `#version 300 es
layout(location=0) in vec2 aQ; out vec2 vQ; void main(){ vQ = aQ; gl_Position = vec4(aQ * 2. - 1., 0., 1.); }`;
const BASE_FS = `${COMMON}
uniform sampler2D uShadow; uniform float uShadowOn;
in vec2 vQ; out vec4 o;
void main(){
vec2 px = vec2(vQ.x, 1. - vQ.y) * uRes;
vec2 wp = uCentre + (px - uCentre) / uZoom;
vec2 q = (wp - uOrigin) / uCell;
vec2 f = smoothstep(vec2(-.02), vec2(.16), q) * smoothstep(vec2(-.02), vec2(.16), uGrid - q);
float g = texture(uCells, q / uGrid).r * f.x * f.y;
float sh = uShadowOn > .5 ? texture(uShadow, vQ).r : 0.;
float rag = noise(wp / uM * 11.) * .6 + noise(wp / uM * 27.) * .4;
vec3 c = mix(vec3(.010, .020, .012), vec3(.028, .052, .026), rag) * uAmb;
float a = smoothstep(.7, .8, g - rag * .2);
o = vec4(c * uTint * a, a) + vec4(0., 0., 0., sh * .46 * uAmb) * (1. - a);
}`;
const SOLID_VS = `#version 300 es
layout(location=0) in vec2 aQ; void main(){ gl_Position = vec4(aQ * 2. - 1., .998, 1.); }`;
const SOLID_FS = `#version 300 es
precision lowp float; out vec4 o; void main(){ o = vec4(1.); }`;
const BLUR_FS = `#version 300 es
precision mediump float; uniform sampler2D uTex; uniform vec2 uStep; in vec2 vQ; out vec4 o;
void main(){ float s = texture(uTex, vQ).r * .2; for (int i = 1; i < 6; i++) { float w = exp(-float(i*i) / 11.) * .2; s += (texture(uTex, vQ + uStep * float(i)).r + texture(uTex, vQ - uStep * float(i)).r) * w; } o = vec4(min(s * .72, 1.)); }`;
const url = (f) => new URL(`../img/wall/${f}`, import.meta.url).href;
const plates = {};
let plants;
const OWN = 600; // pixels to a metre in the plants drawn on their own
async function plate(name) {
const get = (f) => fetch(url(f)).then((r) => r.arrayBuffer());
const [bin, lit, light, own] = await Promise.all([get(`${name}.bin`), get(`${name}-lit.bin`), picture(url(`${name}-light.avif`)), (plants ??= Promise.all([picture(url('plants.avif')), picture(url('plants-aux.avif')), picture(url('plants-id.webp'), true), get('plants.bin'), get('plants-hull.bin')]))]);
const t = new Int16Array(bin);
const [n, np] = t;
const b = new Int16Array(own[3]);
const [ns, , aw, ah] = b;
return {
own: own.slice(0, 3),
hull: new Uint8Array(own[4]),
light,
lit: new Uint8Array(lit), // every leaf's light, then whether it is ever seen
plants: t.subarray(2 + n * 8, 2 + n * 8 + np * 6), // what stands where
kinds: b.subarray(4, 4 + ns * 4),
leaves: b.subarray(4 + ns * 4),
aw,
ah,
w: sizeOf(name)[2],
h: (sizeOf(name)[2] * sizeOf(name)[1]) / sizeOf(name)[0],
metres: sizeOf(name)[0],
};
}
export const loadPlate = (name) => (plates[name] ??= plate(name));
export async function createWall(canvas, { style = 0, shadow = false, anchor = [0, 0] } = {}) {
const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, depth: true, powerPreference: 'high-performance' });
if (!gl) throw new Error('no webgl2');
const making = programs(gl, [[LEAF_VS, LEAF_FS], [QUAD_VS, BASE_FS], [QUAD_VS, BLUR_FS], [SOLID_VS, SOLID_FS]], 'wall');
making.catch(() => {});
const faces = {};
let ownTex;
const upload = async (name) => {
if (faces[name]) return faces[name];
const p = await loadPlate(name);
const how = [{ mip: true }, {}, { near: true }];
const put = (list) => Promise.all(list.map((img, i) => texture(gl, img, { wrap: 'both', ...how[i] })));
faces[name] = { ...p, o: await (ownTex ??= put(p.own)), l: await texture(gl, p.light, { wrap: 'both', mip: true }) };
return faces[name];
};
let face = await upload(STYLE_NAMES[style]);
const [leafP, baseP, blurP, solidP] = await making;
const nx = 2;
const ny = 4;
const gridV = [];
const gridI = [];
for (let y = 0; y <= ny; y++) for (let x = 0; x <= nx; x++) gridV.push(x / nx, y / ny);
for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
const a = y * (nx + 1) + x;
gridI.push(a, a + 1, a + nx + 1, a + 1, a + nx + 2, a + nx + 1);
}
const buf = (target, data, use = gl.STATIC_DRAW) => {
const b = gl.createBuffer();
gl.bindBuffer(target, b);
gl.bufferData(target, data, use);
return b;
};
const set = () => {
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
buf(gl.ARRAY_BUFFER, new Float32Array(gridV));
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
buf(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(gridI));
const b = buf(gl.ARRAY_BUFFER, new Float32Array(14), gl.DYNAMIC_DRAW);
for (let k = 0; k < 4; k++) {
gl.enableVertexAttribArray(1 + k);
gl.vertexAttribPointer(1 + k, k < 3 ? 4 : 2, gl.FLOAT, false, 56, k * 16);
gl.vertexAttribDivisor(1 + k, 1);
}
gl.bindVertexArray(null);
return { vao, b, n: 0 };
};
const ownSet = set();
const edgeSet = shadow ? set() : null; // plants along an edge: the only ones whose shadow falls on the bare wall
const quadVao = gl.createVertexArray();
gl.bindVertexArray(quadVao);
buf(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]));
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.bindVertexArray(null);
const bind = (i, t) => {
gl.activeTexture(gl.TEXTURE0 + i);
gl.bindTexture(gl.TEXTURE_2D, t);
};
const cellTex = gl.createTexture();
bind(5, cellTex);
for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR);
for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
bind(7, gl.createTexture());
gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG8, 5, face.hull.length / 10, 0, gl.RG, gl.UNSIGNED_BYTE, face.hull);
for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST);
const shade = shadow ? [0, 1].map(() => ({ t: gl.createTexture(), f: gl.createFramebuffer() })) : null;
let shW = 0;
let shH = 0;
let at = []; // every plant that could stand on the grid, nearest first: its cell, and where its leaves are in the pool
let pool = new Float32Array(0);
let seen = pool; // the same, without the leaves no one can see
let pack = pool;
let pack2 = pool;
let restock = true;
const born = new Float32Array(MAX_CELLS).fill(-1);
const gone = new Float32Array(MAX_CELLS);
let cells = new Float32Array(2); // how far each cell has grown, how far it has become part of the lit wall
let shut = new Uint8Array(1);
let still = new Float32Array(1);
let settled = false;
const rip = new Float32Array(12);
let ripAt = 0;
let mapped = '';
let calm = 0;
let built = '';
const t0 = performance.now();
const W = {
L: { w: 1, h: 1, cols: 1, rows: 1, m: 100, ox: 0, oy: 0 },
ptr: { x: -9999, y: -9999, s: 0, target: 0, sx: { x: 0, v: 0 }, sy: { x: 0, v: 0 } },
gust: 0,
tilt: 0,
par: { x: 0, y: 0 },
px: { x: 0, v: 0 },
py: { x: 0, v: 0 },
lamp: { x: 0, y: 0, r: 1, on: 0 },
amb: 1,
water: { y: -9999, s: 0 },
key: 1,
zoom: 1,
tint: [1, 1, 1],
planted: [],
now: () => (performance.now() - t0) / 1000,
async style(i) {
face = await upload(STYLE_NAMES[i]);
spread();
},
place(next) {
Object.assign(W.L, next);
const { cols, rows } = W.L;
spread();
const key = `${cols}x${rows}`;
if (key === built) return false;
built = key;
cells = new Float32Array(cols * rows * 2);
shut = new Uint8Array(cols * rows);
still = new Float32Array(cols * rows);
restock = true;
bind(5, cellTex);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, cols, rows, 0, gl.RG, gl.FLOAT, cells);
born.fill(-1);
gone.fill(0);
W.planted = new Array(cols * rows).fill(false);
settled = false;
return true;
},
plant(i, on = true, delay = 0) {
if (W.planted[i] === on) return;
W.planted[i] = on;
settled = false;
restock = true;
if (on) {
const g = cells[i * 2];
born[i] = reduced ? -100 : W.now() + delay - (gone[i] ? (1 - (1 - g) ** (1 / 1.7)) * 4.2 : 0);
gone[i] = 0;
} else gone[i] = reduced ? 0.01 : W.now();
},
ripple(x, y) {
rip.set([x, y, W.now()], ripAt * 3);
ripAt = (ripAt + 1) % 4;
},
draw() {
const { L } = W;
const dpr = Math.min(devicePixelRatio || 1, 2) * page.sharp;
const cw = Math.round(L.w * dpr);
const ch = Math.round(L.h * dpr);
if (canvas.width !== cw || canvas.height !== ch) {
canvas.width = cw;
canvas.height = ch;
}
const now = reduced ? 60 : W.now();
if (!settled) {
settled = true;
const n = L.cols * L.rows;
for (let i = 0; i < n; i++) {
let g = 0;
if (born[i] !== -1) {
const k = Math.min(1, Math.max(0, (now - born[i]) / 4.2));
g = 1 - (1 - k) ** 1.7;
if (gone[i]) {
const out = Math.max(0, 1 - (now - gone[i]) / 1.5);
g *= out * out * (3 - 2 * out);
if (out > 0) settled = false;
else {
born[i] = -1; // folded away: nothing left to draw
gone[i] = 0;
restock = true;
}
} else if (k < 1) settled = false;
}
cells[i * 2] = g;
shut[i] = g > 0.995 && !gone[i] ? 1 : 0;
}
const open = (x, y) => {
if (x < 0) return L.ox > -L.m;
if (y < 0) return L.oy > -L.m;
if (x >= L.cols) return L.ox + L.cols * L.m < L.w + L.m;
if (y >= L.rows) return L.oy + L.rows * L.m < L.h + L.m;
return !shut[y * L.cols + x];
};
for (let y = 0; y < L.rows; y++) for (let x = 0; x < L.cols; x++) {
const i = y * L.cols + x;
let whole = shut[i];
for (let b = -2; b < 3 && whole; b++) for (let a = -2; a < 3 && whole; a++) if (open(x + a, y + b)) whole = 0;
if (still[i] !== whole) {
still[i] = whole;
restock = true;
}
}
bind(5, cellTex);
gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, L.cols, L.rows, gl.RG, gl.FLOAT, cells);
}
if (restock) stock();
const S = ((L.m / CELL) * face.metres) / face.w; // css px to one table px
const common = ({ p, u }) => {
gl.useProgram(p);
for (const [n, i] of [['uTex', 0], ['uAux', 1], ['uId', 2], ['uCells', 5], ['uShadow', 6], ['uHull', 7], ['uLight', 8]]) if (u[n]) gl.uniform1i(u[n], i);
gl.uniform2f(u.uRes, L.w, L.h);
gl.uniform2f(u.uOrigin, L.ox, L.oy);
gl.uniform2f(u.uGrid, L.cols, L.rows);
gl.uniform2f(u.uPlate, face.w, face.h);
gl.uniform2f(u.uCentre, L.w / 2, L.h / 2);
gl.uniform1f(u.uM, L.m * 0.5 / CELL);
gl.uniform1f(u.uCell, L.m);
gl.uniform1f(u.uS, S);
gl.uniform1f(u.uT, now);
gl.uniform1f(u.uAmb, W.amb);
gl.uniform1f(u.uZoom, W.zoom);
gl.uniform3fv(u.uTint, W.tint);
if (!u.uPtr) return;
gl.uniform1f(u.uGust, W.gust);
gl.uniform1f(u.uTilt, W.tilt);
gl.uniform1f(u.uKey, W.key);
gl.uniform2f(u.uPar, W.par.x, W.par.y);
gl.uniform3f(u.uPtr, W.ptr.x, W.ptr.y, W.ptr.s);
gl.uniform3fv(u.uRip, rip);
gl.uniform2f(u.uWater, W.water.y, W.water.s);
gl.uniform4f(u.uLamp, W.lamp.x, W.lamp.y, W.lamp.r, W.lamp.on);
};
bind(5, cellTex);
const ripples = W.now() - Math.max(rip[2], rip[5], rip[8], rip[11]) < 3 ? 4 : 0;
gl.disable(gl.DEPTH_TEST);
const leaves = (prog, mask) => {
const S0 = mask ? edgeSet : ownSet;
if (!S0.n) return;
face.o.forEach((t, i) => bind(i, t));
common(prog);
const { u } = prog;
bind(8, face.l);
bind(0, face.o[0]);
gl.uniform4f(u.uTile, L.ox + (anchor[0] * L.m) / CELL, L.oy + (anchor[1] * L.m) / CELL, face.w * S, face.h * S);
gl.uniform2f(u.uPlate, face.aw, face.ah);
if (u.uMask) gl.uniform1f(u.uMask, mask);
gl.uniform1f(u.uN, S0.n + 1);
gl.uniform1i(u.uRips, ripples);
gl.uniform2f(u.uShade, mask * 0.62, mask * 0.78);
gl.bindVertexArray(S0.vao);
gl.drawElementsInstanced(gl.TRIANGLES, gridI.length, gl.UNSIGNED_SHORT, 0, S0.n);
};
const shadows = shade && edgeSet.n > 0;
if (shadows) {
const sw = Math.max(2, Math.round(L.w / 5));
const sh = Math.max(2, Math.round(L.h / 5));
if (sw !== shW || sh !== shH) {
shW = sw;
shH = sh;
for (const x of shade) {
bind(6, x.t);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sw, sh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR);
for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
gl.bindFramebuffer(gl.FRAMEBUFFER, x.f);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, x.t, 0);
}
}
bind(6, null);
gl.viewport(0, 0, sw, sh);
gl.bindFramebuffer(gl.FRAMEBUFFER, shade[0].f);
gl.clearColor(0, 0, 0, 0);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.enable(gl.BLEND);
gl.blendEquation(gl.MAX);
gl.blendFunc(gl.ONE, gl.ONE);
leaves(leafP, 1);
gl.blendEquation(gl.FUNC_ADD);
gl.disable(gl.BLEND);
gl.useProgram(blurP.p);
gl.bindVertexArray(quadVao);
gl.uniform1i(blurP.u.uTex, 6);
for (const [from, to, dx, dy] of [[0, 1, 1.3, 0], [1, 0, 0, 1.3]]) {
bind(6, shade[from].t);
gl.bindFramebuffer(gl.FRAMEBUFFER, shade[to].f);
gl.uniform2f(blurP.u.uStep, dx / sw, dy / sh);
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
bind(6, shade[0].t);
}
gl.viewport(0, 0, cw, ch);
gl.disable(gl.BLEND);
common(baseP);
gl.uniform1f(baseP.u.uShadowOn, shadows ? 1 : 0);
gl.bindVertexArray(quadVao);
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
gl.enable(gl.DEPTH_TEST);
gl.depthMask(true);
gl.clear(gl.DEPTH_BUFFER_BIT);
gl.depthFunc(gl.LESS);
gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
gl.colorMask(true, true, true, false);
leaves(leafP, 0);
gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
gl.colorMask(false, false, false, true);
gl.depthFunc(gl.GREATER);
gl.depthMask(false);
gl.useProgram(solidP.p);
gl.bindVertexArray(quadVao);
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); // whatever a leaf covers is solid
gl.depthMask(true);
gl.colorMask(true, true, true, true);
gl.disable(gl.DEPTH_TEST);
},
run(watch, each) {
if (reduced) {
W.draw();
return;
}
const P = W.ptr;
scene(watch, (dt, t, top, h) => {
W.par.x = follow(W.px, W.parTo?.x ?? 0, dt, 360);
W.par.y = follow(W.py, W.parTo?.y ?? 0, dt, 360);
P.seek?.();
if (P.s < 0.02 && P.target) {
P.sx.x = P.tx;
P.sy.x = P.ty;
P.sx.v = P.sy.v = 0;
}
P.x = follow(P.sx, P.tx ?? -9999, dt, 110); // the leaves feel a hand, not a cursor
P.y = follow(P.sy, P.ty ?? -9999, dt, 110);
P.s += (P.target - P.s) * (1 - Math.exp(-dt / 320));
if (each?.(dt, top, h) === false) return;
const key = `${W.zoom.toFixed(4)} ${W.amb.toFixed(3)} ${page.sharp}`;
const busy = !settled || restock || P.s > 0.01 || Math.abs(W.gust) > 0.03 || W.water.s > 0.01 || W.lamp.on > 0.01 || Math.abs(W.px.v) + Math.abs(W.py.v) > 1e-5 || key !== mapped || W.now() - Math.max(rip[2], rip[5], rip[8], rip[11]) < 3;
mapped = key;
calm = busy ? 0 : calm + 1;
if (calm > 8 && page.hz > 100 && calm % 2) return;
W.draw();
});
},
snapshot() {
W.draw(); // the drawing buffer is only readable right after a draw
return createImageBitmap(canvas);
},
lost(fn) {
canvas.addEventListener('webglcontextlost', fn);
},
};
function spread() {
const { L } = W;
const S = ((L.m / CELL) * face.metres) / face.w;
const ax = L.ox + (anchor[0] * L.m) / CELL;
const ay = L.oy + (anchor[1] * L.m) / CELL;
const pw = face.w * S;
const ph = face.h * S;
const right = L.ox + L.cols * L.m;
const foot = L.oy + L.rows * L.m;
const tiles = [];
for (let j = Math.floor((L.oy - ay) / ph); j * ph + ay < foot; j++) for (let i = Math.floor((L.ox - ax) / pw); i * pw + ax < right; i++) tiles.push([ax + i * pw, ay + j * ph]);
let total = 0;
let thin = 0;
const inside = (x, y) => x >= L.ox && y >= L.oy && x <= right && y <= foot;
const rnd = (v) => {
const h = Math.sin(v) * 43758.5453;
return h - Math.floor(h);
};
const P = face.plants;
at = [];
const rows = [];
const starts = new Int32Array(P.length / 6); // each plant's first leaf in the light table
for (let k = 1; k < starts.length; k++) starts[k] = starts[k - 1] + face.kinds[P[(k - 1) * 6 + 2] * 4 + 1];
const known = face.lit.length / 2;
for (let k = P.length - 6; k >= 0; k -= 6) for (const [tx, ty] of tiles) {
const x = tx + P[k] * S;
const y = ty + P[k + 1] * S;
if (!inside(x, y) || x < -200 || y < -200 || x > L.w + 200 || y > L.h + 200) continue;
const cell = Math.min(L.rows - 1, Math.floor((y - L.oy) / L.m)) * L.cols + Math.min(L.cols - 1, Math.floor((x - L.ox) / L.m));
const n = face.kinds[P[k + 2] * 4 + 1];
let show = 0;
const first = starts[k / 6];
for (let m = 0; m < n; m++) show += face.lit[known + first + m];
at.push([cell, total, (total += n * 14), thin, (thin += show * 14)]);
rows.push(x, y, P[k + 2], P[k + 3] / 10000, P[k + 4] / 1000, P[k + 5], rnd(k * 7.13 + tx), first);
}
if (pool.length < total) {
pool = new Float32Array(total);
seen = new Float32Array(total);
pack = new Float32Array(total);
if (shadow) pack2 = new Float32Array(total);
}
const leaf = face.leaves;
let w = 0;
let v = 0;
for (let i = 0; i < rows.length; i += 8) {
const kind = rows[i + 2] * 4;
const first = face.kinds[kind];
const s = (rows[i + 4] * L.m) / CELL / OWN;
for (let k = face.kinds[kind + 1] - 1; k >= 0; k--) {
const o = (first + k) * 6;
pool[w++] = rows[i];
pool[w++] = rows[i + 1];
pool[w++] = face.kinds[kind + 2];
pool[w++] = face.kinds[kind + 3];
for (let m = 0; m < 4; m++) pool[w++] = leaf[o + m];
pool[w++] = rows[i + 5] + leaf[o + 4];
pool[w++] = rnd((first + k) * 12.9898 + rows[i + 6] * 70);
pool[w++] = first + k + 1;
pool[w++] = face.lit[rows[i + 7] + k] / 255;
pool[w++] = s;
pool[w++] = rows[i + 3];
if (face.lit[known + rows[i + 7] + k]) {
seen.set(pool.subarray(w - 14, w), v);
v += 14;
}
}
}
restock = true;
}
function stock() {
restock = false;
let n = 0;
let from = -1;
let to = -1;
let src = pool;
const take = () => {
if (from < 0) return;
pack.set(src.subarray(from, to), n);
n += to - from;
from = -1;
};
for (const [cell, a, b, c, d] of at) {
if (born[cell] === -1) {
take();
continue;
}
const want = still[cell] ? seen : pool;
if (want !== src) {
take();
src = want;
}
if (from < 0) from = still[cell] ? c : a;
to = still[cell] ? d : b;
}
take();
ownSet.n = n / 14;
if (edgeSet) {
let e = 0;
for (const [cell, a, b] of at) {
if (born[cell] === -1 || still[cell]) continue;
pack2.set(pool.subarray(a, b), e);
e += b - a;
}
edgeSet.n = e / 14;
if (e) {
gl.bindBuffer(gl.ARRAY_BUFFER, edgeSet.b);
gl.bufferData(gl.ARRAY_BUFFER, pack2, gl.DYNAMIC_DRAW, 0, e);
}
}
if (!n) return;
gl.bindBuffer(gl.ARRAY_BUFFER, ownSet.b);
gl.bufferData(gl.ARRAY_BUFFER, pack, gl.DYNAMIC_DRAW, 0, n);
}
return W;
}
function pointer(W, area, frame) {
const P = W.ptr;
let cx = null;
let cy = 0;
P.seek = () => {
if (cx === null) return;
const r = frame.getBoundingClientRect();
P.tx = cx - r.left;
P.ty = cy - r.top;
W.parTo = { x: 0.5 - P.tx / r.width, y: 0.5 - P.ty / r.height };
cx = null;
};
const at = (e) => {
cx = e.clientX;
cy = e.clientY;
};
area.addEventListener('pointermove', (e) => {
at(e);
P.target = 1;
}, { passive: true });
area.addEventListener('pointerleave', () => {
P.target = 0;
W.parTo = { x: 0, y: 0 };
});
area.addEventListener('pointercancel', () => { P.target = 0; });
area.addEventListener('pointerdown', (e) => {
at(e);
P.seek();
W.ripple(P.tx, P.ty);
if (e.pointerType !== 'mouse') {
P.target = 1;
setTimeout(() => { P.target = 0; }, 900);
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
const copy = hero.querySelector('[data-copy]');
const veil = hero.querySelector('.hero__veil');
const dusk = document.createElement('i');
veil.append(dusk);
const say = [...hero.querySelectorAll('.hero__say span')];
const at = { x: -1, v: 0 };
let W;
try {
W = await createWall(canvas, { shadow: true, anchor: [1.15, 1.05] });
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
const inRows = Math.max(5, Math.round(sr.height / (small ? 62 : 84)));
const m = sr.height / inRows;
const bottom = sr.bottom - hr.top;
const out = 2; // cells standing off screen, so no edge of the planting is ever seen cut
const rows = Math.ceil(bottom / m - 0.02) + out;
const cols = Math.min(Math.floor(MAX_CELLS / rows), Math.ceil(hr.width / m - 0.02) + out * 2);
const fresh = W.place({ w: hr.width, h: hr.height, cols, rows, m, ox: hr.width + out * m - cols * m, oy: bottom + out * m - rows * m });
shownP = -1;
if (!fresh) return;
const c0 = cols - out - Math.round(sr.width / m);
const r0 = rows - out - inRows;
const col = (i) => i % cols;
const row = (i) => Math.floor(i / cols);
const cost = (i) => cols - 1 - col(i) + (rows - 1 - row(i)) * 0.85 + Math.sin((col(i) - c0) * 1.05 + (row(i) - r0) * 0.8) * 0.9 + Math.sin(i * 12.9898) * 0.35;
const all = [...Array(cols * rows).keys()].sort((a, b) => cost(a) - cost(b));
const inside = all.filter((i) => col(i) >= c0 && row(i) >= r0);
const first = new Set(inside.slice(0, Math.round(inside.length * (small ? 0.9 : 0.87))));
auto.clear();
grown = -1;
spread = all.filter((i) => !first.has(i));
[...first].forEach((i, k) => W.plant(i, true, 0.1 + (k / first.size) * 1.9));
}
function grow(dt) {
const b = box(pin);
const to = clamp((page.y - b.top) / Math.max(1, b.height - page.h));
if (at.x < 0) at.x = to;
const p = follow(at, to, dt, 95);
if (p === shownP) return p;
shownP = p;
const goal = Math.round(clamp((p - 0.03) / 0.5) * spread.length);
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
const away = smooth(clamp((p - 0.012) / 0.12));
copy.style.opacity = 1 - away;
copy.style.transform = `translate3d(0,${(away * -2.4).toFixed(3)}rem,0)`;
veil.style.opacity = smooth(clamp((p - 0.48) / 0.4));
dusk.style.opacity = smooth(clamp((p - 0.85) / 0.14));
say.forEach((n, i) => {
const k = smooth(clamp((p - 0.58 - i * 0.07) / 0.19));
n.style.opacity = k;
n.style.transform = `translate3d(0,${((1 - k) * 0.34).toFixed(4)}em,0)`;
n.style.filter = k > 0 && k < 1 ? `blur(${((1 - k) * 12).toFixed(2)}px)` : '';
});
hero.classList.toggle('is-grown', p > 0.1);
W.zoom = 1 + 0.16 * Math.max(0, p - 0.3) ** 1.5;
W.amb = 1 - 0.3 * smooth(clamp((p - 0.45) / 0.5));
return p;
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
W.run(hero, (dt) => {
W.gust += (Math.min(1.6, Math.abs(page.v) * 0.45) - W.gust) * (1 - Math.exp(-dt / 220));
W.tilt += ((W.tiltTo ?? 0) - W.tilt) * (1 - Math.exp(-dt / 220));
return grow(dt) < 0.995; // behind the dark there is nothing to draw
});
hero.classList.add('wall-ready');
}
export async function stripWall(host) {
const stage = host.querySelector('[data-stage]');
const W = await createWall(host.querySelector('[data-wall]'), { anchor: [0.9, 0.5] });
const layout = () => {
const hr = host.getBoundingClientRect();
const sh = stage.getBoundingClientRect().height;
const rows = Math.max(2, Math.round(sh / (hr.width < 700 ? 62 : 84)));
const m = sh / rows;
const cols = Math.min(Math.floor(MAX_CELLS / (rows + 1)), Math.ceil(hr.width / m) + 1);
if (W.place({ w: hr.width, h: hr.height, cols, rows: rows + 1, m, ox: (hr.width - cols * m) / 2, oy: hr.height - sh })) {
for (let i = 0; i < cols * (rows + 1); i++) W.plant(i, true, Math.abs((i % cols) - cols / 2) * 0.07 + (rows - Math.floor(i / cols)) * 0.16 + (Math.sin(i * 12.9898) + 1) * 0.12);
}
};
pointer(W, host.parentElement, host);
W.L.w = host.clientWidth;
W.L.h = host.clientHeight;
W.draw();
const seen = new IntersectionObserver(([e]) => {
if (!e.isIntersecting) return;
seen.disconnect();
layout();
new ResizeObserver(layout).observe(host);
W.run(host);
}, { rootMargin: '0px 0px -6% 0px' });
seen.observe(host);
}
export async function frameWall(canvas, watch) {
const W = await createWall(canvas, { shadow: true });
let shown = 0;
W.run(watch);
return {
W,
async set({ cols, rows, m, pad, style }) {
const c = cols * 2;
const n = rows * 2;
const fresh = W.place({ w: cols * m + pad * 2, h: rows * m + pad * 2, cols: c, rows: n, m: m / 2, ox: pad, oy: pad });
if (style !== shown) {
shown = style;
await W.style(style);
}
if (fresh) for (let i = 0; i < c * n; i++) W.plant(i, true, ((i % c) + (n - 1 - Math.floor(i / c))) * 0.06);
if (reduced) W.draw();
},
};
}

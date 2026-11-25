
const MAX_CELLS = 900;
const CELL = 0.25; // metres to one growing cell
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const STYLE_NAMES = ['forest', 'fern', 'jungle'];
const SIZE = { forest: [3.6, 2.4, 2304], fern: [2.4, 1.6, 1536], jungle: [2.4, 1.6, 1536] }; // metres across, metres high, pixels the leaf table is written in
const COMMON = `#version 300 es
precision highp float; precision highp int;
uniform vec2 uRes, uOrigin, uGrid, uPlate, uPar, uCentre;
uniform float uM, uCell, uS, uT, uGust, uTilt, uAmb, uKey, uZoom;
uniform vec3 uPtr, uTint;
uniform vec3 uRip[4];
uniform vec4 uLamp;
uniform sampler2D uTex, uCells, uAux, uId;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
`;
const LEAF_VS = `${COMMON}
layout(location=0) in vec2 aG; layout(location=1) in vec4 aR; layout(location=2) in vec4 aB; layout(location=3) in vec4 aZ; layout(location=4) in vec2 aS;
uniform vec2 uShade; uniform float uKind; // 0 the lit wall as a whole, 1 a plant on its own
out vec2 vUv; out vec2 vPx; flat out float vId; out float vYoung; out float vFace; out float vZ; out float vT; flat out float vA; flat out float vSeed;
void main(){
vec2 q = (aR.xy - uOrigin) / uCell;
float settled = texelFetch(uCells, ivec2(clamp(floor(q), vec2(0.), uGrid - 1.)), 0).g;
float g = uKind < .5 ? 1. : texture(uCells, q / uGrid).r;
vA = uKind < .5 ? min(1., settled * 2.) : 1. - smoothstep(.5, 1., settled);
float seed = aZ.y, zt = clamp(aZ.x / 320., 0., 1.);
float wait = seed * .42 + zt * .16;                          // leaves nearest the wall come first
float k = clamp((g * 1.62 - wait) / 1.04, 0., 1.);
float gl = 1. - pow(1. - k, 2.6);                             // quick to leave the stem, slow to settle
float unroll = smoothstep(.12, 1., k);
vec2 b = mix(aB.xy, aB.zw, aG);
vUv = (aR.zw + b) / uPlate;
vec2 c = (aB.xy + aB.zw) * .5;
vec2 dir = normalize(c + vec2(.001, .01));
vec2 ac = vec2(-dir.y, dir.x);
float reach = max(dot(abs(c), abs(dir)) + dot((aB.zw - aB.xy) * .5, abs(dir)), 1.);
float along = dot(b, dir), across = dot(b, ac), t = clamp(along / reach, 0., 1.);
float curl = (1. - unroll) * (1.15 + .6 * seed) * (.35 + .65 * t);
float spring = sin(k * 9.) * exp(-k * 4.6) * .09 * step(.001, k);
float ca = cos(curl + spring);
float sc = abs(aS.x);
vec2 p = (dir * along * ca + ac * across * mix(.12, 1., unroll)) * gl * sc;
p.x *= sign(aS.x); float cr = cos(aS.y), sr = sin(aS.y); p = vec2(p.x * cr + p.y * sr, p.y * cr - p.x * sr);
float z = (aZ.x * uM / 500.) * mix(.25, 1., gl) + sin(curl) * along * gl * sc;
vec2 px = aR.xy + p;
float sw = sin(uT*.62 - px.x*.0052 + px.y*.0034) * (.6 + .4*sin(uT*.23 + px.x*.002));
float tr = sin(uT*(1.1 + seed*.9) + seed*40.);
float len = reach * sc;
float rot = (sw * .020 + tr * (.011 + uGust*.030) + uTilt * .5 + uGust * .03 * sin(uT*3.1 + px.y*.012)) * t;
vec2 pd = px - uPtr.xy; float d2 = dot(pd, pd);
float pf = exp(-d2 / (uM * uM * .55)) * uPtr.z * t;
vec2 push = normalize(pd + .01) * pf * min(16., len * .22);
for (int i = 0; i < 4; i++) {
float age = uT - uRip[i].z;
if (uRip[i].z > 0. && age < 2.8) { vec2 r = px - uRip[i].xy; float w = (length(r) - age * uM * 1.7) / (uM * .42); push += normalize(r + .01) * exp(-w*w) * (1. - age / 2.8) * t * min(14., len * .2); }
}
p += vec2(-p.y, p.x) * rot + push;
z -= pf * len * .25;
px = aR.xy + p;
px += z * uShade;
px += uPar * z * .34;                                         // perspective: nearer leaves move further
px = uCentre + (px - uCentre) * (1. + z / 3400.) * uZoom;
vPx = px; vId = aZ.z; vYoung = 1. - smoothstep(.35, 1., k); vFace = ca; vZ = zt; vT = t; vSeed = seed;
vec2 cl = px / uRes * 2. - 1.;
gl_Position = k <= .001 || vA <= .001 ? vec4(2., 2., 2., 1.) : vec4(cl.x, -cl.y, 0., 1.);
}`;
const LEAF_FS = `${COMMON}
uniform float uMask, uKind;
in vec2 vUv; in vec2 vPx; flat in float vId; in float vYoung; in float vFace; in float vZ; in float vT; flat in float vA; flat in float vSeed; out vec4 o;
float at(vec2 uv){ ivec2 n = textureSize(uId, 0); ivec2 p = ivec2(floor(uv * vec2(n))); p = ((p % n) + n) % n; vec4 c = texelFetch(uId, p, 0); return floor(c.r * 255. + .5) + floor(c.g * 255. + .5) * 256. == vId ? .25 : 0.; }
float cover(){ vec2 n = vec2(textureSize(uId, 0)), a = dFdx(vUv), b = dFdy(vUv); a *= max(1., .95 / max(length(a * n), .01)); b *= max(1., .95 / max(length(b * n), .01)); return at(vUv + a * .125 + b * .375) + at(vUv - a * .125 - b * .375) + at(vUv + a * .375 - b * .125) + at(vUv - a * .375 + b * .125); }
void main(){
float al = cover();
if (al < .01) discard;
al = mix(al, min(1., al * 1.5), 1. - uMask);
if (uMask > .5) { o = vec4(al); return; }
vec3 col = texture(uTex, vUv, -.5).rgb;
vec3 x = texture(uAux, vUv).rgb; vec2 n = x.yz * 2. - 1.;
vec2 w = vPx / uM;
float tree = noise(w * 1.25 + vec2(uT * .075, uT * -.04) + noise(w * .7 - uT * .05) * 1.3) * .62 + noise(w * 3.1 - vec2(uT * .11, uT * .02)) * .38;
float sun = mix(.6, 1.2, smoothstep(.3, .7, tree));
float beam = (w.x*.62 + w.y*.78 - mod(uT * .30, (uRes.x + uRes.y) / uM + 8.) + 4.) / 1.9;
sun += exp(-beam*beam) * .34;
col *= 1. - x.r + x.r * mix(1., sun, uKey);
vec2 pd = vPx - uPtr.xy; col *= 1. + exp(-dot(pd, pd) / (uM * uM * 2.2)) * uPtr.z * (.22 + .4 * x.r);
col = mix(col, pow(col, vec3(.72)) * vec3(1.16, 1.12, .62), vYoung * .62);
col *= mix(.62, 1., clamp(vFace, 0., 1.));
vec2 ld = vPx - uLamp.xy; float fall = uLamp.w / (1. + dot(ld, ld) / (uLamp.z * uLamp.z) * 1.35);
vec2 ln = normalize(ld + .01); float lf = clamp(.82 - dot(n, vec2(ln.x, -ln.y)) * .75 + vZ * .25, .25, 1.4);
col *= vec3(uAmb) * mix(vec3(.55, .78, 1.15), vec3(1.), uAmb) + vec3(1.5, 1.2, .8) * fall * lf;
col = col / (1. + max(col - .78, 0.) * .9);
if (uKind > .5) {
float own = fract(sin(vId * 12.9898 + floor(vSeed * 97.) ) * 43758.5);
float thrown = smoothstep(.42, .62, noise(w * 5.2 + own * 3.) * .7 + own * .42);      // a neighbour's shadow lies across some leaves
float sh = x.r * .58 * (1. - thrown) * (1. - smoothstep(.55, .95, vZ) * .7);
col *= (1. - sh) * mix(vec3(1.), vec3(1.07, 1.02, .84), sh * 1.5);
col *= mix(1., mix(.34, 1., smoothstep(0., .55, vT)) * mix(.52, 1., smoothstep(.05, .62, vZ)), 1. - vYoung * .7);
}
al *= vA;
o = vec4(clamp(col * uTint, 0., 1.) * al, al);
}`;
const QUAD_VS = `#version 300 es
layout(location=0) in vec2 aQ; out vec2 vQ; void main(){ vQ = aQ; gl_Position = vec4(aQ * 2. - 1., 0., 1.); }`;
const BASE_FS = `${COMMON}
uniform sampler2D uShadow; uniform float uShadowOn; uniform vec2 uAnchor;
in vec2 vQ; out vec4 o;
void main(){
vec2 px = vec2(vQ.x, 1. - vQ.y) * uRes;
vec2 wp = uCentre + (px - uCentre) / uZoom;
vec2 q = (wp - uOrigin) / uCell;
vec2 f = smoothstep(vec2(-.02), vec2(.16), q) * smoothstep(vec2(-.02), vec2(.16), uGrid - q);
vec2 cell = texture(uCells, q / uGrid).rg * f.x * f.y; float g = cell.r;
float sh = uShadowOn > .5 ? texture(uShadow, vQ).r : 0.;
vec2 uv = (wp - uAnchor) / uS / uPlate;
float whole = smoothstep(.9, .995, cell.g);
vec3 c = texture(uTex, uv).rgb * mix(.17, .96, whole) * uAmb;
float rag = noise(wp / uM * 11.) * .6 + noise(wp / uM * 27.) * .4;
float a = smoothstep(.7, .8, g - rag * .2);
a = max(a, whole);
o = vec4(c * uTint * a, a) + vec4(0., 0., 0., sh * .46 * uAmb) * (1. - a);
}`;
const BLUR_FS = `#version 300 es
precision mediump float; uniform sampler2D uTex; uniform vec2 uStep; in vec2 vQ; out vec4 o;
void main(){ float s = texture(uTex, vQ).r * .2; for (int i = 1; i < 6; i++) { float w = exp(-float(i*i) / 11.) * .2; s += (texture(uTex, vQ + uStep * float(i)).r + texture(uTex, vQ - uStep * float(i)).r) * w; } o = vec4(min(s * .72, 1.)); }`;
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
if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`wall shader ${[...gl.getAttachedShaders(p)].map((s) => gl.getShaderInfoLog(s)).join(' ')}`);
const u = {};
const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
for (let i = 0; i < n; i++) {
const a = gl.getActiveUniform(p, i);
u[a.name.replace('[0]', '')] = gl.getUniformLocation(p, a.name);
}
return { p, u };
}
const breathe = () => new Promise((r) => { setTimeout(r, 0); });
const url = (f) => new URL(`../img/wall/${f}`, import.meta.url).href;
const small = innerWidth * Math.min(2, devicePixelRatio || 1) < 1400;
const plates = {};
let plants;
const OWN = 600; // pixels to a metre in the plants drawn on their own
async function plate(name) {
const picture = async (f) => createImageBitmap(await (await fetch(url(f))).blob());
const exact = async (f) => createImageBitmap(await (await fetch(url(f))).blob(), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
const s = small ? '-s' : '';
const part = (n, v) => Promise.all([picture(`${n}${v}.avif`), picture(`${n}-aux${v}.avif`), exact(`${n}-id${v}.webp`), fetch(url(`${n}.bin`)).then((r) => r.arrayBuffer())]);
const [[tex, aux, id, bin], own] = await Promise.all([part(name, s), (plants ??= part('plants', ''))]);
const t = new Int16Array(bin);
const [n, np] = t;
const b = new Int16Array(own[3]);
const [ns, , aw, ah] = b;
return {
img: [tex, aux, id],
own: own.slice(0, 3),
table: t.subarray(2, 2 + n * 8), // the lit wall, leaf by leaf
plants: t.subarray(2 + n * 8, 2 + n * 8 + np * 6), // what stands where
kinds: b.subarray(4, 4 + ns * 4),
leaves: b.subarray(4 + ns * 4),
aw,
ah,
w: SIZE[name][2],
h: (SIZE[name][2] * SIZE[name][1]) / SIZE[name][0],
metres: SIZE[name][0],
};
}
export const loadPlate = (name) => (plates[name] ??= plate(name));
export async function createWall(canvas, { style = 0, shadow = false, anchor = [0, 0] } = {}) {
const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false, powerPreference: 'high-performance' });
if (!gl) throw new Error('no webgl2');
const raw = [compile(gl, LEAF_VS, LEAF_FS), compile(gl, QUAD_VS, BASE_FS), compile(gl, QUAD_VS, BLUR_FS)];
const ext = gl.getExtension('KHR_parallel_shader_compile');
const faces = {};
let ownTex;
const tex2 = (img, { near = false, mip = false } = {}) => {
const t = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, t);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
if (mip) gl.generateMipmap(gl.TEXTURE_2D);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, near ? gl.NEAREST : mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, near ? gl.NEAREST : gl.LINEAR);
return t;
};
const upload = async (name) => {
if (faces[name]) return faces[name];
const p = await loadPlate(name);
const f = { ...p };
const how = [{ mip: true }, {}, { near: true }];
const put = async (list) => {
const t = [];
for (let i = 0; i < 3; i++) {
gl.activeTexture(gl.TEXTURE0);
t.push(tex2(list[i], how[i]));
await breathe();
}
return t;
};
f.t = await put(p.img);
f.o = await (ownTex ??= put(p.own));
faces[name] = f;
return f;
};
let face = await upload(STYLE_NAMES[style]);
while (ext && raw.some((p) => !gl.getProgramParameter(p, ext.COMPLETION_STATUS_KHR))) await breathe();
const [leafP, baseP, blurP] = raw.map((p) => finish(gl, p));
const nx = 3;
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
const wholeSet = set();
const ownSet = set();
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
const shade = shadow ? [0, 1].map(() => ({ t: gl.createTexture(), f: gl.createFramebuffer() })) : null;
let shW = 0;
let shH = 0;
let at = []; // every plant that could stand on the grid, furthest first
let restock = true;
let lastT = 0;
const born = new Float32Array(MAX_CELLS).fill(-1);
const gone = new Float32Array(MAX_CELLS);
let bytes = new Uint8Array(4);
let still = new Float32Array(1);
let settled = false;
const rip = new Float32Array(12);
let ripAt = 0;
let maxDpr = 2;
let built = '';
const t0 = performance.now();
const W = {
L: { w: 1, h: 1, cols: 1, rows: 1, m: 100, ox: 0, oy: 0 },
ptr: { x: -9999, y: -9999, s: 0, target: 0 },
gust: 0,
tilt: 0,
par: { x: 0, y: 0 },
lamp: { x: 0, y: 0, r: 1, on: 0 },
amb: 1,
key: 1,
zoom: 1,
tint: [1, 1, 1],
planted: [],
partial: true, // some of it may be bare, so shadows are worth drawing
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
bytes = new Uint8Array(cols * rows * 4);
still = new Float32Array(cols * rows);
restock = true;
bind(5, cellTex);
gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
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
const g = bytes[i * 4] / 255;
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
const dpr = Math.min(devicePixelRatio || 1, maxDpr);
const cw = Math.round(L.w * dpr);
const ch = Math.round(L.h * dpr);
if (canvas.width !== cw || canvas.height !== ch) {
canvas.width = cw;
canvas.height = ch;
}
const now = reduced ? 60 : W.now();
const step = reduced ? 9 : Math.min(0.1, now - lastT);
lastT = now;
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
} else if (k < 1) settled = false;
}
bytes[i * 4] = g * 255;
}
const open = (x, y) => {
if (x < 0) return L.ox > -L.m;
if (y < 0) return L.oy > -L.m;
if (x >= L.cols) return L.ox + L.cols * L.m < L.w + L.m;
if (y >= L.rows) return L.oy + L.rows * L.m < L.h + L.m;
return bytes[(y * L.cols + x) * 4] < 252 || gone[y * L.cols + x] > 0;
};
for (let y = 0; y < L.rows; y++) for (let x = 0; x < L.cols; x++) {
let whole = 1;
for (let b = -2; b < 3 && whole; b++) for (let a = -2; a < 3; a++) if (open(x + a, y + b)) whole = 0;
const i = y * L.cols + x;
const was = still[i];
still[i] = whole ? Math.min(1, was + step / 1.4) : Math.max(0, was - step / 0.45);
if (still[i] !== whole) settled = false;
if ((was === 1) !== (still[i] === 1)) restock = true;
bytes[i * 4 + 1] = still[i] * 255;
}
bind(5, cellTex);
gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, L.cols, L.rows, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
}
if (restock) stock();
const S = ((L.m / CELL) * face.metres) / face.w; // css px to one table px
const common = ({ p, u }) => {
gl.useProgram(p);
for (const [n, i] of [['uTex', 0], ['uAux', 1], ['uId', 2], ['uCells', 5], ['uShadow', 6]]) if (u[n]) gl.uniform1i(u[n], i);
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
gl.uniform4f(u.uLamp, W.lamp.x, W.lamp.y, W.lamp.r, W.lamp.on);
};
bind(5, cellTex);
gl.disable(gl.DEPTH_TEST);
const leaves = (own, mask) => {
const q = own ? ownSet : wholeSet;
if (!q.n) return;
(own ? face.o : face.t).forEach((t, i) => bind(i, t));
common(leafP);
if (own) gl.uniform2f(leafP.u.uPlate, face.aw, face.ah);
gl.uniform1f(leafP.u.uKind, own);
gl.uniform1f(leafP.u.uMask, mask);
gl.uniform2f(leafP.u.uShade, mask * 0.62, mask * 0.78);
gl.bindVertexArray(q.vao);
gl.drawElementsInstanced(gl.TRIANGLES, gridI.length, gl.UNSIGNED_SHORT, 0, q.n);
};
const shadows = shade && W.partial;
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
leaves(1, 1);
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
face.t.forEach((t, i) => bind(i, t));
common(baseP);
gl.uniform1f(baseP.u.uShadowOn, shadows ? 1 : 0);
gl.uniform2f(baseP.u.uAnchor, L.ox + (anchor[0] * L.m) / CELL, L.oy + (anchor[1] * L.m) / CELL);
gl.bindVertexArray(quadVao);
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
gl.enable(gl.BLEND);
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
leaves(0, 0);
leaves(1, 0);
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
if (avg > 20 && maxDpr > 0.7) {
maxDpr = Math.max(0.7, Math.min(maxDpr, devicePixelRatio || 1) - 0.3);
avg = 12;
frames = 0;
}
}
const ease = 1 - Math.exp(-dt / 420);
W.par.x += ((W.parTo?.x ?? 0) - W.par.x) * ease;
W.par.y += ((W.parTo?.y ?? 0) - W.par.y) * ease;
W.ptr.s += (W.ptr.target - W.ptr.s) * (1 - Math.exp(-dt / 260));
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
const T = face.table;
const n = T.length / 8;
const right = L.ox + L.cols * L.m;
const foot = L.oy + L.rows * L.m;
const tiles = [];
for (let j = Math.floor((L.oy - ay) / ph); j * ph + ay < foot; j++) for (let i = Math.floor((L.ox - ax) / pw); i * pw + ax < right; i++) tiles.push([ax + i * pw, ay + j * ph]);
const out = [];
const pad = 60;
const inside = (x, y) => x >= L.ox && y >= L.oy && x <= right && y <= foot;
const rnd = (v) => {
const h = Math.sin(v) * 43758.5453;
return h - Math.floor(h);
};
for (let k = 0; k < n; k++) {
const o = k * 8;
for (const [tx, ty] of tiles) {
const x = tx + T[o] * S;
const y = ty + T[o + 1] * S;
if (!inside(x, y)) continue;
if (x + T[o + 4] * S < -pad || x + T[o + 2] * S > L.w + pad || y + T[o + 5] * S < -pad || y + T[o + 3] * S > L.h + pad) continue;
out.push(x, y, T[o], T[o + 1], T[o + 2], T[o + 3], T[o + 4], T[o + 5], T[o + 6], rnd(k * 12.9898 + T[o] * 0.31), k + 1, 0, S, 0);
}
}
wholeSet.n = out.length / 14;
gl.bindBuffer(gl.ARRAY_BUFFER, wholeSet.b);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(out), gl.DYNAMIC_DRAW);
const P = face.plants;
at = [];
for (let k = 0; k < P.length; k += 6) for (const [tx, ty] of tiles) {
const x = tx + P[k] * S;
const y = ty + P[k + 1] * S;
if (!inside(x, y) || x < -200 || y < -200 || x > L.w + 200 || y > L.h + 200) continue;
const cell = Math.min(L.rows - 1, Math.floor((y - L.oy) / L.m)) * L.cols + Math.min(L.cols - 1, Math.floor((x - L.ox) / L.m));
at.push([x, y, P[k + 2], P[k + 3] / 10000, P[k + 4] / 1000, P[k + 5], cell, rnd(k * 7.13 + tx)]);
}
restock = true;
}
function stock() {
restock = false;
const { L } = W;
const out = [];
const b = face.leaves;
for (const [x, y, kind, rot, size, z, cell, seed] of at) {
if (born[cell] === -1 || still[cell] === 1) continue;
const [first, n, rx, ry] = face.kinds.subarray(kind * 4, kind * 4 + 4);
const s = (size * L.m) / CELL / OWN;
for (let k = 0; k < n; k++) {
const o = (first + k) * 6;
const h = Math.sin((first + k) * 12.9898 + seed * 70) * 43758.5453;
out.push(x, y, rx, ry, b[o], b[o + 1], b[o + 2], b[o + 3], z + b[o + 4], h - Math.floor(h), first + k + 1, 0, s, rot);
}
}
ownSet.n = out.length / 14;
gl.bindBuffer(gl.ARRAY_BUFFER, ownSet.b);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(out), gl.DYNAMIC_DRAW);
}
return W;
}
function pointer(W, area, box) {
const at = (e) => {
const r = box.getBoundingClientRect();
W.ptr.x = e.clientX - r.left;
W.ptr.y = e.clientY - r.top;
W.parTo = { x: 0.5 - W.ptr.x / r.width, y: 0.5 - W.ptr.y / r.height };
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
function grow() {
if (reduced) return;
const box = pin.getBoundingClientRect();
const p = Math.min(1, Math.max(0, -box.top / Math.max(1, box.height - innerHeight)));
if (p === shownP) return;
shownP = p;
const goal = Math.round(Math.min(1, Math.max(0, p - 0.03) / 0.5) * spread.length);
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
hero.style.setProperty('--p', p.toFixed(4));
hero.classList.toggle('is-grown', p > 0.1);
W.zoom = 1 + 0.16 * Math.max(0, p - 0.35) ** 1.4;
W.amb = 1 - 0.3 * Math.min(1, Math.max(0, (p - 0.5) / 0.4));
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
layout();
new ResizeObserver(layout).observe(host);
W.run(host);
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


import { ROOM } from './roomdata.js?v=84784c04';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const GAP = 3.6; // metres between stops
const HALF = 2.15; // half width of the hall
const FLOOR = -1.35;
const ROOF = 1.75;
const NEAR = 0.05;
const FAR = 44;
const JAMB = 0.17; // how far the stone portals stand out
const LEAF = 0.34; // how far the planting stands out
const n2 = (v) => v.toFixed(3);
const WALL_VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec2 aUv;
uniform mat4 uVP; uniform float uFlip;
out vec3 vP; out vec2 vUv;
void main(){ vP = aP; vUv = aUv; vec3 p = aP; if (uFlip > .5) p.y = ${(FLOOR * 2).toFixed(2)} - p.y; gl_Position = uVP * vec4(p, 1.); }`;
const COMMON = `
precision highp float;
const vec3 FOG = vec3(.40, .365, .305);
uniform vec3 uCam; uniform float uT, uFlip;
float fogOf(vec3 p){ return 1. - exp(-pow(distance(p, uCam) * .042, 1.7)); }
vec3 film(vec3 c){ c *= vec3(1.36, 1.36, 1.46); c = pow(c, vec3(1.12)) * 1.12; c = c * (c * 2.51 + .03) / (c * (c * 2.43 + .59) + .14); return mix(c * 12.92, 1.055 * pow(max(c, vec3(1e-5)), vec3(1. / 2.4)) - .055, step(.0031308, c)); }
vec3 lin(vec3 c, float s){ return pow(c, vec3(2.4)) * s; }
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
`;
const WALL_FS = `#version 300 es
${COMMON}
in vec3 vP; in vec2 vUv;
uniform sampler2D uElev, uDepth, uCeil; uniform int uKind; uniform float uStops, uSide; uniform vec4 uS;
out vec4 o;
float along(float z){ return (${n2(GAP / 2)} - z - (uSide > 0. ? ${n2(GAP)} : 0.)) / ${n2(GAP * 2)}; }
float up(float y){ return (${n2(ROOF)} - y) / ${n2(ROOF - FLOOR)}; }
vec3 elev(vec2 uv, float b){ return lin(texture(uElev, vec2(uv.x, clamp(uv.y, .002, .998)), b).rgb, uS.x); }
void main(){
vec3 col; float fog = fogOf(vP);
if (uKind == 1) {
col = lin(texture(uCeil, vec2((${n2(GAP / 2)} - vP.z) / ${n2(GAP * 2)}, (${n2(HALF)} - vP.x) / ${n2(HALF * 2)})).rgb, uS.y);
} else if (uKind == 2) {
vec2 uv = vec2(.75 + vP.x * .107, up(vP.y));
col = elev(uv, 0.) * 1.35;
} else if (uKind == 3) {
vec3 v = normalize(vP - uCam); float inX = max(v.x * uSide, .05);
vec3 st = v * (${n2(LEAF + 0.15)} / inX);                    // from the front of the leaves to the panel behind
float bay = floor(-vP.z / ${n2(GAP)} + .5) * -${n2(GAP)};
float h = 1., hit = -1., last = 0.; const int N = 26;
float jit = hash(gl_FragCoord.xy) ;
for (int i = 0; i <= N; i++) {
float f = (float(i) + jit * .9) / float(N); vec3 p = vP + st * f;
if (abs(p.z - bay) > 1.62 || p.y > ${n2(ROOF - 0.03)}) break;
float d = textureLod(uDepth, vec2(along(p.z), up(p.y)), 0.).r;
if (d * ${n2(0.5 / (LEAF + 0.15))} >= 1. - f) { hit = f; break; }
last = f;
}
if (hit < 0.) discard;
float a = last, b = hit;
for (int i = 0; i < 5; i++) { float m = (a + b) * .5; vec3 p = vP + st * m; float d = textureLod(uDepth, vec2(along(p.z), up(p.y)), 0.).r; if (d * ${n2(0.5 / (LEAF + 0.15))} >= 1. - m) b = m; else a = m; }
vec3 p = vP + st * b; vec2 uv = vec2(along(p.z), up(p.y));
float sway = .0016 * textureLod(uDepth, uv, 2.).r; uv += vec2(sin(uT * .7 + p.z * 2.1 + p.y), cos(uT * .55 + p.z * 1.7)) * sway;
col = elev(uv, -.4);
col *= 1. + .35 * pow(1. - abs(v.x), 3.);
} else if (uKind == 4) {
vec2 uv = vec2((vUv.x - .5) * .036, max(up(vP.y), .07));
if (vP.y > ${n2(ROOF - 0.102)} && abs(vP.x) < ${n2(HALF - JAMB - 0.002)}) uv.y = .34 + vP.x * .03;   // the beam across
float edge = abs(fract((vP.z + ${n2(GAP / 2)}) / ${n2(GAP)} + .5) - .5) * ${n2(GAP)};
col = elev(uv, .6) * mix(.66, 1., smoothstep(.15, .158, edge)) * (vP.y > ${n2(ROOF - 0.102)} ? .72 : 1.);
} else {
vec2 uv = vec2(along(vP.z), up(vP.y));
col = elev(uv, 0.);
float z = -vP.z, i = floor(z / ${n2(GAP)} + .5), dz = z - i * ${n2(GAP)};
float mine = step(.5, 1. - abs(mod(i, 2.) - (uSide > 0. ? 1. : 0.))) * step(-.4, i) * step(i, uStops - .5);
float drop = ${n2(ROOF)} - vP.y, wide = .26 + drop * .34; float pool = 0.;
for (int k = -1; k < 2; k++) { float q = (dz - float(k) * .78) / wide; pool += exp(-q * q * 1.6) * smoothstep(.02, .3, drop) * exp(-drop * .62); }
col += col * vec3(1.5, 1.28, .98) * pool * mine * 1.05;
vec2 fr = abs(vec2(dz, vP.y - .12)) - vec2(1.08, .80);       // the frame's soft shadow, thrown down
col *= 1. - mine * .42 * exp(-length(max(fr, 0.)) * 7.);
}
vec3 c = mix(film(col * .92), FOG, fog);
o = vec4(c + (hash(gl_FragCoord.xy + uT) - .5) / 220., 1.);
}`;
const PIC_FS = `#version 300 es
${COMMON}
in vec3 vP; in vec2 vUv;
uniform sampler2D uTex; uniform float uOn, uHot;
out vec4 o;
void main(){
if (uOn < -.5) {                                       // brass
float sh = .5 + .5 * sin(vP.z * 3.1 + vP.y * 2.3 + uCam.z * 1.4);
vec3 b = mix(vec3(.13, .10, .065), vec3(.55, .44, .29), sh * sh) * (.8 + uHot * .5);
b = mix(b, FOG, fogOf(vP)); o = vec4(b, 1.); return;
}
vec3 col = uOn > 0. ? texture(uTex, vUv, uFlip > .5 ? 1.5 : -.35).rgb : vec3(.16, .145, .12);
col = mix(vec3(.16, .145, .12), col, uOn);
float l = 1.06 - .26 * vUv.y;                        // lit from above
col *= vec3(1.06, 1.01, .93) * l * (1. + uHot * .12);
float fog = fogOf(vP);
col = mix(col, FOG, fog * .9);
o = vec4(col, 1.);
}`;
const FLOOR_FS = `#version 300 es
${COMMON}
in vec3 vP; in vec2 vUv;
uniform sampler2D uFloor, uMirror; uniform vec2 uView; uniform vec4 uS;
out vec4 o;
void main(){
vec2 uv = vec2((vP.z + ${n2(GAP * 1.5)}) / ${n2(GAP * 2)}, (${n2(HALF)} - clamp(vP.x, -1.72, 1.72)) / ${n2(HALF * 2)});
vec3 t = texture(uFloor, uv, -.3).rgb;
vec3 base = lin(t, uS.z) * (1. - smoothstep(1.6, 2.1, abs(vP.x)) * .4);
vec3 v = normalize(uCam - vP);
float dist = distance(uCam, vP);
float grain = textureLod(uFloor, uv * 5.3, 1.).r - textureLod(uFloor, uv * 5.3, 5.).r;
vec2 st = gl_FragCoord.xy / uView + vec2(grain * .012, grain * .03);
float lod = clamp(1.4 + dist * .16, 1.4, 3.4);
vec3 m = textureLod(uMirror, st, lod).rgb * .55 + textureLod(uMirror, st + vec2(0., .012), lod + .8).rgb * .3 + textureLod(uMirror, st - vec2(0., .016), lod + 1.4).rgb * .15;
float f = .15 + .7 * pow(1. - max(v.y, 0.), 3.);
vec3 c = film(base * .62) * (1. - f * .55) + m * f * (.9 + grain * 2.);
c = mix(c, FOG, fogOf(vP));
o = vec4(c + (hash(gl_FragCoord.xy + uT) - .5) / 220., 1.);
}`;
const DUST_VS = `#version 300 es
layout(location=0) in vec4 aD;
uniform mat4 uVP; uniform vec3 uCam; uniform float uT, uPx;
out float vA;
void main(){
vec3 p = aD.xyz;
p.x += sin(uT * .13 + aD.w * 31.) * .4; p.y += sin(uT * .11 + aD.w * 17.) * .3;
p.z = uCam.z - mod(aD.z + uT * .05 + uCam.z * -1., 9.) ;
gl_Position = uVP * vec4(p, 1.);
float d = distance(p, uCam);
gl_PointSize = clamp((2. + aD.w * 5.) * uPx / d, 1., 16. * uPx);
vA = smoothstep(.3, 1.4, d) * smoothstep(8.5, 3., d) * (.05 + .13 * aD.w) * (.6 + .4 * sin(uT * .7 + aD.w * 50.));
}`;
const DUST_FS = `#version 300 es
precision mediump float; in float vA; out vec4 o;
void main(){ float r = length(gl_PointCoord - .5) * 2.; float a = exp(-r*r*3.4) * vA; o = vec4(vec3(1., .93, .68) * a, a); }`;
const mul = (a, b) => {
const o = new Float32Array(16);
for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
return o;
};
const persp = (fov, asp) => {
const f = 1 / Math.tan(fov / 2);
return new Float32Array([f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (FAR + NEAR) / (NEAR - FAR), -1, 0, 0, (2 * FAR * NEAR) / (NEAR - FAR), 0]);
};
const viewM = (x, y, z, yaw, pitch) => {
const [cy, sy, cp, sp] = [Math.cos(yaw), Math.sin(yaw), Math.cos(pitch), Math.sin(pitch)];
const r = new Float32Array([cy, -sp * sy, -cp * sy, 0, 0, cp, -sp, 0, sy, sp * cy, cp * cy, 0, 0, 0, 0, 1]);
const t = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -x, -y, -z, 1]);
return mul(r, t);
};
function program(gl, vs, fs) {
const p = gl.createProgram();
for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
const s = gl.createShader(type);
gl.shaderSource(s, src);
gl.compileShader(s);
gl.attachShader(p, s);
}
gl.linkProgram(p);
return p;
}
function ready(gl, p) {
if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`corridor shader ${[...gl.getAttachedShaders(p)].map((s) => gl.getShaderInfoLog(s)).join(' ')}`);
const u = {};
for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) {
const a = gl.getActiveUniform(p, i);
u[a.name] = gl.getUniformLocation(p, a.name);
}
return { p, u };
}
export async function initCorridor(sec, frames, open) {
const stage = sec.querySelector('[data-hall]');
const canvas = sec.querySelector('[data-hall-canvas]');
const words = sec.querySelector('[data-hall-words]');
const spare = [...words.children];
const meter = sec.querySelector('[data-hall-meter]');
const last = sec.querySelector('[data-hall-end]');
const fail = () => {
sec.classList.add('is-flat');
return { filter() {} };
};
if (reduced) return fail();
const gl = canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'high-performance' });
if (!gl) return fail();
let wallP;
let picP;
let floorP;
let dustP;
let T;
try {
const raw = [program(gl, WALL_VS, WALL_FS), program(gl, WALL_VS, PIC_FS), program(gl, WALL_VS, FLOOR_FS), program(gl, DUST_VS, DUST_FS)];
const ext = gl.getExtension('KHR_parallel_shader_compile');
const pics = await Promise.all(['elev', 'depth', 'ceil', 'floor'].map(async (f) => {
const img = new Image();
img.src = new URL(`../img/room/hall-${f}.avif`, import.meta.url).href;
await img.decode();
return img;
}));
while (ext && raw.some((p) => !gl.getProgramParameter(p, ext.COMPLETION_STATUS_KHR))) await new Promise((r) => { setTimeout(r, 4); });
[wallP, picP, floorP, dustP] = raw.map((p) => ready(gl, p));
T = pics.map((p) => texture(p, true));
} catch {
return fail();
}
const mirror = { t: gl.createTexture(), f: gl.createFramebuffer(), d: gl.createRenderbuffer(), w: 0, h: 0 };
function texture(img, tile) {
const t = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, t);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
gl.generateMipmap(gl.TEXTURE_2D);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, tile ? gl.REPEAT : gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
const x = gl.getExtension('EXT_texture_filter_anisotropic');
if (x) gl.texParameterf(gl.TEXTURE_2D, x.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(x.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
return t;
}
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
const dustVao = gl.createVertexArray();
gl.bindVertexArray(dustVao);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
const N = 150;
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...Array(N)].flatMap(() => [(Math.random() - 0.5) * 3.6, FLOOR + Math.random() * 2.8, Math.random() * 9, Math.random()])), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
gl.bindVertexArray(null);
const all = frames.map((a, i) => ({ a, i, place: a.closest('[data-place]').dataset.place, title: a.dataset.title, where: a.dataset.where, ratio: Number(a.dataset.ratio), src: innerWidth * Math.min(2, devicePixelRatio || 1) > 1700 ? a.dataset.hangL : a.dataset.hang, tex: null, on: 0, hot: 0 }));
let list = all;
let dirty = true;
const quads = {}; // name -> [first vertex, count]
function geometry() {
const v = [];
const quad = (name, a, b, c, d, uv = [0, 0, 1, 0, 0, 1, 1, 1]) => {
quads[name] = v.length / 5;
[a, b, c, d].forEach((p, i) => v.push(...p, uv[i * 2], uv[i * 2 + 1]));
};
const z0 = GAP * 1.5;
const z1 = -(list.length * GAP + 3.0);
quad('left', [-HALF, ROOF, z0], [-HALF, ROOF, z1], [-HALF, FLOOR, z0], [-HALF, FLOOR, z1]);
quad('right', [HALF, ROOF, z0], [HALF, ROOF, z1], [HALF, FLOOR, z0], [HALF, FLOOR, z1]);
quad('roof', [-HALF, ROOF, z0], [HALF, ROOF, z0], [-HALF, ROOF, z1], [HALF, ROOF, z1]);
quad('floor', [-HALF, FLOOR, z0], [HALF, FLOOR, z0], [-HALF, FLOOR, z1], [HALF, FLOOR, z1]);
quad('end', [-HALF, ROOF, z1], [HALF, ROOF, z1], [-HALF, FLOOR, z1], [HALF, FLOOR, z1]);
quads.bays = [];
quads.jambs = [];
for (let n = -1; n <= list.length; n++) {
const z = -n * GAP;
const side = n % 2 ? -1 : 1;
const x = side * (HALF - LEAF);
const name = `g${n}`;
quad(name, [x, ROOF, z + 1.64], [x, ROOF, z - 1.64], [x, FLOOR, z + 1.64], [x, FLOOR, z - 1.64]);
quads.bays.push([quads[name], side, n]);
const zp = z - GAP / 2;
const box = (nm, a, b, c, d) => {
quad(nm, a, b, c, d);
quads.jambs.push([quads[nm], n]);
};
for (const sd of [-1, 1]) {
const xi = sd * (HALF - JAMB);
const xo = sd * (HALF + 0.1);
box(`j${n}a${sd}`, [xi, ROOF, zp + 0.16], [xo, ROOF, zp + 0.16], [xi, FLOOR, zp + 0.16], [xo, FLOOR, zp + 0.16]);
box(`j${n}b${sd}`, [xi, ROOF, zp - 0.16], [xo, ROOF, zp - 0.16], [xi, FLOOR, zp - 0.16], [xo, FLOOR, zp - 0.16]);
box(`j${n}c${sd}`, [xi, ROOF, zp + 0.16], [xi, ROOF, zp - 0.16], [xi, FLOOR, zp + 0.16], [xi, FLOOR, zp - 0.16]);
}
const yb = ROOF - 0.1;
box(`j${n}d`, [-HALF, ROOF, zp + 0.16], [HALF, ROOF, zp + 0.16], [-HALF, yb, zp + 0.16], [HALF, yb, zp + 0.16]);
box(`j${n}e`, [-HALF, yb, zp + 0.16], [HALF, yb, zp + 0.16], [-HALF, yb, zp - 0.16], [HALF, yb, zp - 0.16]);
}
list.forEach((f, n) => {
const side = n % 2 ? 1 : -1;
const h = f.ratio > 1 ? 1.62 : 2.06;
const w = Math.min(2.5, h * Math.min(1.5, Math.max(0.66, f.ratio)));
const z = -n * GAP;
const x = side * (HALF - 0.045);
const y = 0.16;
const cover = f.ratio / (w / h); // crop, never stretch
const du = cover > 1 ? (1 - 1 / cover) / 2 : 0;
const dv = cover < 1 ? (1 - cover) / 2 : 0;
const zl = z + (side < 0 ? w / 2 : -w / 2);
const zr = z - (side < 0 ? w / 2 : -w / 2);
f.box = [[x, y + h / 2, zl], [x, y + h / 2, zr], [x, y - h / 2, zl], [x, y - h / 2, zr]];
const g = 0.022;
const bx = side * (HALF - 0.02);
const s = side < 0 ? 1 : -1;
quad(`b${n}`, [bx, y + h / 2 + g, zl + g * s], [bx, y + h / 2 + g, zr - g * s], [bx, y - h / 2 - g, zl + g * s], [bx, y - h / 2 - g, zr - g * s]);
quad(`p${n}`, ...f.box, [du, dv, 1 - du, dv, du, 1 - dv, 1 - du, 1 - dv]);
});
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
sec.style.setProperty('--len', list.length);
dirty = false;
}
async function hang(f) {
if (f.busy || f.tex) return;
f.busy = true;
try {
const img = new Image();
img.src = f.src;
await img.decode();
f.tex = texture(img);
} catch { /* stays a dark panel */ }
f.busy = false;
}
let vp;
const cam = { x: 0, y: 0, z: 2, yaw: 0, pitch: 0 };
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
let hover = -1;
let dpr = Math.min(2, devicePixelRatio || 1);
function draw(t, walk) {
if (dirty) geometry();
const w = stage.clientWidth;
const h = stage.clientHeight;
const cw = Math.round(w * dpr);
const ch = Math.round(h * dpr);
if (canvas.width !== cw || canvas.height !== ch) {
canvas.width = cw;
canvas.height = ch;
}
const asp = w / h;
const tall = asp < 0.8;
const stop = Math.min(list.length - 1, Math.max(0, walk));
const i = Math.floor(walk);
const f = walk - i;
const e = f * f * f * (f * (f * 6 - 15) + 10);
const s = i + e * 0.82 + f * 0.18;
const back = tall ? 2.5 : 2.35; // how far before a wall we pause
cam.z = -s * GAP + back + Math.max(0, walk - (list.length - 1)) * 0.4;
let yaw = 0;
for (let k = Math.max(0, i - 1); k <= Math.min(list.length - 1, i + 2); k++) {
const side = k % 2 ? 1 : -1;
yaw += side * Math.exp(-((s - k - 0.06) ** 2) * 5.2) * (tall ? 0.72 : 0.36);
}
const endK = Math.min(1, Math.max(0, walk - (list.length - 1.05)));
yaw *= 1 - endK;
cam.x = Math.sin(s * 1.3) * 0.05 - yaw * (tall ? 1.15 : 0.5);
cam.y = 0.12 + Math.sin(s * Math.PI * 2) * 0.012;
cam.yaw = yaw + mouse.x * 0.1;
cam.pitch = mouse.y * 0.05;
vp = mul(persp(tall ? 1.18 : 0.98, asp), viewM(cam.x, cam.y, cam.z, cam.yaw, cam.pitch));
gl.viewport(0, 0, cw, ch);
gl.clearColor(0.4, 0.365, 0.305, 1);
gl.enable(gl.DEPTH_TEST);
gl.disable(gl.BLEND);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
gl.activeTexture(gl.TEXTURE0);
const bind = (i, t) => {
gl.activeTexture(gl.TEXTURE0 + i);
gl.bindTexture(gl.TEXTURE_2D, t);
};
const common = (P, flip) => {
gl.useProgram(P.p);
gl.uniformMatrix4fv(P.u.uVP, false, vp);
gl.uniform3f(P.u.uCam, cam.x, cam.y, cam.z);
gl.uniform1f(P.u.uT, t);
gl.uniform1f(P.u.uFlip, flip);
for (const [n, i] of [['uTex', 0], ['uElev', 1], ['uDepth', 2], ['uCeil', 3], ['uFloor', 4], ['uMirror', 5]]) if (P.u[n]) gl.uniform1i(P.u[n], i);
if (P.u.uS) gl.uniform4f(P.u.uS, ROOM.hall.elev, ROOM.hall.ceil, ROOM.hall.floor, 0);
};
T.forEach((x, i) => bind(i + 1, x));
const seen = list.map((p, n) => ({ p, n })).filter(({ n }) => Math.abs(n - s) < 8.5);
const scene = (flip) => {
gl.bindVertexArray(vao);
common(wallP, flip);
gl.uniform1f(wallP.u.uStops, list.length);
const part = (kind, at, side = 0) => {
gl.uniform1i(wallP.u.uKind, kind);
gl.uniform1f(wallP.u.uSide, side);
gl.drawArrays(gl.TRIANGLE_STRIP, at, 4);
};
for (const [at, n] of quads.jambs) if (n > s - 1.6 && n < s + 9) part(4, at);
if (!flip) for (const [at, side, n] of quads.bays) if (n > s - 1.4 && n < s + 4.2) part(3, at, side);
part(0, quads.left, -1);
part(0, quads.right, 1);
part(2, quads.end);
if (!flip || true) part(1, quads.roof);
common(picP, flip);
for (const { p, n } of seen) {
gl.uniform1f(picP.u.uOn, -1);
gl.uniform1f(picP.u.uHot, p.hot);
gl.drawArrays(gl.TRIANGLE_STRIP, quads[`b${n}`], 4);
if (!p.tex) continue;
p.on += (1 - p.on) * 0.05;
bind(0, p.tex);
gl.uniform1f(picP.u.uOn, p.on);
gl.uniform1f(picP.u.uHot, p.hot);
gl.drawArrays(gl.TRIANGLE_STRIP, quads[`p${n}`], 4);
}
};
const mw = cw >> 1;
const mh = ch >> 1;
if (mirror.w !== mw || mirror.h !== mh) {
mirror.w = mw;
mirror.h = mh;
bind(5, mirror.t);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, mw, mh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.bindFramebuffer(gl.FRAMEBUFFER, mirror.f);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, mirror.t, 0);
gl.bindRenderbuffer(gl.RENDERBUFFER, mirror.d);
gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, mw, mh);
gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, mirror.d);
}
bind(5, null);
gl.bindFramebuffer(gl.FRAMEBUFFER, mirror.f);
gl.viewport(0, 0, mw, mh);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
scene(1); // what the floor reflects, small, then softened
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
bind(5, mirror.t);
gl.generateMipmap(gl.TEXTURE_2D);
gl.viewport(0, 0, cw, ch);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
scene(0);
gl.bindVertexArray(vao);
common(floorP, 0);
gl.uniform2f(floorP.u.uView, cw, ch);
gl.drawArrays(gl.TRIANGLE_STRIP, quads.floor, 4);
gl.enable(gl.BLEND);
gl.blendFunc(gl.ONE, gl.ONE);
gl.depthMask(false);
gl.bindVertexArray(dustVao);
common(dustP, 0);
gl.uniform1f(dustP.u.uPx, dpr);
gl.drawArrays(gl.POINTS, 0, N);
gl.depthMask(true);
list.forEach((p, n) => {
if (n > s - 2.5 && n < s + 5) hang(p);
else if (p.tex && Math.abs(n - s) > 9) {
gl.deleteTexture(p.tex);
p.tex = null;
p.on = 0;
}
p.hot += ((n === hover ? 1 : 0) - p.hot) * 0.12;
});
const near = Math.round(stop);
if (sec.dataset.n !== `${near}`) {
sec.dataset.n = near;
const old = words.querySelector('.on');
const neu = spare[0] === old ? spare[1] : spare[0];
old?.classList.remove('on');
old?.classList.add('gone');
neu.classList.remove('gone');
neu.firstElementChild.textContent = list[near].title;
neu.lastElementChild.textContent = list[near].where;
void neu.offsetWidth;
neu.classList.add('on');
}
sec.style.setProperty('--end', endK.toFixed(3));
last.classList.toggle('on', endK > 0.72);
sec.classList.toggle('at-end', endK > 0.5);
meter.style.transform = `scaleX(${(Math.min(list.length, walk + 0.4) / list.length).toFixed(4)})`;
}
const project = ([x, y, z]) => {
const o = [0, 1, 3].map((r) => vp[r] * x + vp[4 + r] * y + vp[8 + r] * z + vp[12 + r]);
return o[2] > 0.05 ? [o[0] / o[2], o[1] / o[2]] : null;
};
function hit(e) {
const r = stage.getBoundingClientRect();
const x = ((e.clientX - r.left) / r.width) * 2 - 1;
const y = 1 - ((e.clientY - r.top) / r.height) * 2;
let best = -1;
let bd = 1e9;
list.forEach((f, n) => {
const d = cam.z + n * GAP;
if (d < 0.3 || d > 10 || !f.box) return;
const q = [0, 1, 3, 2].map((k) => project(f.box[k]));
if (q.some((p) => !p)) return;
let inside = false;
for (let a = 0, b = 3; a < 4; b = a++) if ((q[a][1] > y) !== (q[b][1] > y) && x < ((q[b][0] - q[a][0]) * (y - q[a][1])) / (q[b][1] - q[a][1]) + q[a][0]) inside = !inside;
if (inside && d < bd) {
bd = d;
best = n;
}
});
return best;
}
stage.addEventListener('pointermove', (e) => {
if (e.pointerType !== 'mouse') return;
mouse.tx = e.clientX / innerWidth - 0.5;
mouse.ty = e.clientY / innerHeight - 0.5;
hover = e.target.closest('button, a') || !vp ? -1 : hit(e);
if (hover >= 0) stage.dataset.cursor = 'View';
else delete stage.dataset.cursor;
}, { passive: true });
stage.addEventListener('click', (e) => {
if (e.target.closest('button, a') || !vp) return;
const n = hit(e);
if (n >= 0) open(list[n].a);
});
let live = false;
let cur = -1;
let then = 0;
let slow = 8;
const t0 = performance.now();
function loop(t) {
if (!live) return;
const dt = Math.min(60, t - then || 16);
then = t;
slow = slow * 0.96 + dt * 0.04;
if (slow > 22 && dpr > 1) {
dpr = Math.max(1, dpr - 0.25);
slow = 10;
}
const r = sec.getBoundingClientRect();
const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
const to = p * list.length;
const k = 1 - Math.exp(-dt / 190);
mouse.x += (mouse.tx - mouse.x) * k;
mouse.y += (mouse.ty - mouse.y) * k;
cur = cur < 0 ? to : cur + (to - cur) * k;
if (!document.hidden) draw((t - t0) / 1000, cur);
requestAnimationFrame(loop);
}
geometry();
draw(0, 0);
sec.classList.add('is-ready');
new IntersectionObserver(([e]) => {
const was = live;
live = e.isIntersecting;
if (live && !was) requestAnimationFrame(loop);
}).observe(sec);
canvas.addEventListener('webglcontextlost', () => {
live = false;
sec.classList.add('is-flat');
});
return {
filter(where) {
list = all.filter((f) => where === 'all' || f.place === where);
dirty = true;
cur = 0;
delete sec.dataset.n;
scrollTo({ top: sec.offsetTop, behavior: 'instant' });
},
};
}
export function ambience() {
let ctx;
let out;
const build = () => {
ctx = new AudioContext();
out = ctx.createGain();
out.gain.value = 0;
out.connect(ctx.destination);
const buf = ctx.createBuffer(2, ctx.sampleRate * 6, ctx.sampleRate);
for (let c = 0; c < 2; c++) {
const d = buf.getChannelData(c);
let b = 0;
for (let i = 0; i < d.length; i++) {
b = 0.985 * b + 0.015 * (Math.random() * 2 - 1);
d[i] = b * 6;
}
}
const layer = (type, freq, q, gain, rate, depth) => {
const s = ctx.createBufferSource();
s.buffer = buf;
s.loop = true;
s.playbackRate.value = rate;
const f = ctx.createBiquadFilter();
f.type = type;
f.frequency.value = freq;
f.Q.value = q;
const g = ctx.createGain();
g.gain.value = gain;
const lfo = ctx.createOscillator();
lfo.frequency.value = 0.05 + Math.random() * 0.09;
const lg = ctx.createGain();
lg.gain.value = gain * depth;
lfo.connect(lg).connect(g.gain);
s.connect(f).connect(g).connect(out);
s.start();
lfo.start();
};
layer('lowpass', 260, 0.3, 0.5, 0.7, 0.4); // the room
layer('bandpass', 2400, 0.7, 0.34, 1.6, 0.8); // leaves
layer('bandpass', 900, 3.5, 0.16, 1.1, 0.9); // water behind the wall
const drop = () => {
const o = ctx.createOscillator();
const g = ctx.createGain();
const n = ctx.currentTime;
const hz = 700 + Math.random() * 900;
o.frequency.setValueAtTime(hz, n);
o.frequency.exponentialRampToValueAtTime(hz * 1.7, n + 0.06);
g.gain.setValueAtTime(0.0001, n);
g.gain.exponentialRampToValueAtTime(0.05, n + 0.008);
g.gain.exponentialRampToValueAtTime(0.0001, n + 0.22);
o.connect(g).connect(out);
o.start();
o.stop(n + 0.25);
setTimeout(drop, 1600 + Math.random() * 4200);
};
drop();
};
return (on) => {
if (!ctx) build();
ctx.resume();
out.gain.cancelScheduledValues(ctx.currentTime);
out.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.7);
};
}

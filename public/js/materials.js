
import { scrollWall } from './wall.js?v=426d4046';
const clamp = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => v * v * v * (v * (v * 6 - 15) + 10);
const ease = (v) => 1 - (1 - v) ** 4;
const VS = `#version 300 es
layout(location=0) in vec2 a; void main(){ gl_Position = vec4(a * 2. - 1., 0., 1.); }`;
const FS = `#version 300 es
precision highp float;
uniform vec2 uRes, uPtr; uniform sampler2D uN; uniform vec4 uP; // timber in, lamp wall in, lamp on, lamp out
out vec4 o;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*f*(f*(f*6.-15.)+10.); return textureLod(uN, (i + f + .5) / 256., 0.).r; }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 7.3; a *= .5; } return v; }
float vein(vec2 p, float w){ float n = fbm(p); return exp(-abs(n - .5) / w); }
vec3 stone(vec2 p, vec2 l){
float jx = .64 * uRes.x / uRes.y;
vec2 q = vec2(abs(p.x - jx) + .13, p.y);                // two slabs cut from one block and opened like a book
vec2 w = vec2(fbm(q * 1.25 + 3.1), fbm(q * 1.25 + 8.7)) - .5;
vec2 w2 = vec2(fbm(q * 5.5 + 1.7), fbm(q * 5.5 + 5.9)) - .5;
vec2 s = mat2(.8, .6, -.6, .8) * (q + w * .5 + w2 * .07);
float a = fbm(s * vec2(1.5, .55) + 14.) - .5, b = fbm(s * vec2(2.9, 1.1) + 31.) - .5, c3 = fbm(s * vec2(6.5, 3.2) + 47.) - .5;
float m1 = smoothstep(.36, .6, fbm(q * 1.1 + 20.)), m2 = smoothstep(.4, .62, fbm(q * 1.9 + 11.));
float core = exp(-abs(a) * 110.), feather = exp(-abs(a) * 15.) * smoothstep(-.02, .06, a);
float second = exp(-abs(b) * 95.) * m2, hair = exp(-abs(c3) * 120.) * m2 * .5;
float cloud = fbm(s * 2.4 + w2 * .6), grain = noise(p * 420.) * .5 + noise(p * 170.) * .5;
vec3 c = mix(vec3(.945, .938, .922), vec3(.83, .828, .818), smoothstep(.44, .78, cloud) * .75);
c = mix(c, vec3(.52, .52, .515), feather * .5 * (.2 + .8 * m1));
c = mix(c, vec3(.24, .24, .235), core * (.34 + .5 * m1));
c = mix(c, vec3(.62, .47, .27), second * .78 + core * .35 * smoothstep(.4, .6, fbm(q * 7.)));
c = mix(c, vec3(.52, .5, .47), hair * .5);
c *= .975 + .05 * grain;
c *= mix(.45, 1., smoothstep(.0009, .0022, abs(p.x - jx)));
vec2 d = (p - l) * mat2(.96, .28, -.28, .96);
float pool = exp(-dot(d, d) * .55), pane = smoothstep(.34, .2, abs(d.x)) * smoothstep(.62, .3, abs(d.y));
return c * (.83 + .16 * pool) + vec3(1., .97, .92) * pane * .05;
}
vec3 timber(vec2 p, vec2 l){
float per = .082, x = p.x / per, id = floor(x), f = fract(x) * 2. - 1.;
float gap = smoothstep(.985, .93, abs(f));
float hgt = sqrt(max(0., 1. - f * f * .92));
float nx = f * .92;
float seed = hash(vec2(id, 3.));
vec2 g = vec2((p.x + seed * 9.) * 34., p.y * 1.5 + seed * 40.);
float wob = fbm(g * vec2(.12, .7)) * 5.;
float rings = .5 + .5 * sin((g.x * .34 + wob) * 6.2);
float fib = noise(vec2(p.x * 900., p.y * 9. + seed * 50.)) * .6 + noise(vec2(p.x * 380., p.y * 4.)) * .4;
vec3 c = mix(vec3(.17, .085, .045), vec3(.44, .262, .148), rings * .46 + fib * .34 + seed * .26);
c *= 1. - .34 * smoothstep(.62, .9, noise(vec2(p.x * 260. + 5., p.y * 2.2)));
vec3 n = normalize(vec3(nx, 0., hgt + .12));
vec3 ld = normalize(vec3(l.x - p.x, (l.y - p.y) * .5, .42));
float dif = max(dot(n, ld), 0.);
float spec = pow(max(dot(reflect(-ld, n), vec3(0., 0., 1.)), 0.), 26.);
vec2 d = p - l; float pool = exp(-dot(d, d) * 1.15);
c = c * (.13 + dif * (.5 + 1.15 * pool)) + vec3(1., .85, .62) * spec * .16 * (.3 + pool);
return mix(vec3(.012, .009, .007), c, gap);
}
vec3 lamp(vec2 p, float on){
float asp = uRes.x / uRes.y;
vec2 c = asp > .9 ? vec2(asp * .69, .43) : vec2(asp * .5, .34);
float R = asp > .9 ? .24 : asp * .34;
vec2 d = p - c; float r = length(d);
float tr = fbm(p * vec2(5., 8.)) * .55 + fbm(p * 26.) * .28 + noise(p * 240.) * .07;
vec3 wall = vec3(.43, .4, .36) * (.72 + tr * .56);
float halo = exp(-max(r - R, 0.) * 2.5) * .95 + exp(-max(r - R, 0.) * 9.) * .5;
float rake = fbm(p * vec2(9., 14.) + normalize(d + .001) * .03) - fbm(p * vec2(9., 14.));
vec3 col = wall * (vec3(.025, .03, .034) + vec3(1.18, .86, .52) * halo * on * (1. + rake * 1.6));
col *= 1. - .5 * smoothstep(.06, 0., abs(r - R - .012)) * (1. - on * .6);
vec2 q = d / R; vec2 w = vec2(fbm(q * 1.7 + 2.), fbm(q * 1.7 + 9.)) - .5;
float v = vein(q * .9 + w * 1.5 + 5., .05), cl = fbm(q * 2.1 + w * 1.2);
vec3 al = mix(vec3(1., .88, .68), vec3(.93, .68, .4), smoothstep(.35, .75, cl));
al = mix(al, vec3(.66, .4, .19), v * .55);
float lens = sqrt(max(0., 1. - dot(q, q) * .72));
vec3 face = al * (mix(.1, 1.22, on) * (.62 + .5 * lens));
face += vec3(1., .9, .72) * exp(-dot(q, q) * 2.2) * .34 * on;
float px = 1.5 / uRes.y;
float ring = smoothstep(px, -px, abs(r - R) - .0075);
float ang = atan(d.y, d.x);
vec3 brass = vec3(.66, .49, .25) * (.35 + .75 * pow(.5 + .5 * sin(ang * 2. + 1.2), 2.) + .5 * on);
col = mix(col, face, smoothstep(px, -px, r - R));
return mix(col, brass, ring);
}
void main(){
vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes.y;
float asp = uRes.x / uRes.y, px = 1. / uRes.y;
vec2 l = uPtr * vec2(asp, 1.);
float e1 = mix(asp * 1.12, -.02, uP.x), e2 = mix(asp * 1.12, -.02, uP.y);
vec3 c = vec3(0.);
if (p.x >= e2) c = lamp(p - vec2(e2 + .02, 0.) * .35, uP.z);
else if (p.x >= e1) {
c = timber(p - vec2(e1 + .02, 0.), l - vec2(e1 + .02, 0.));
c *= 1. - .78 * exp(-(e2 - p.x) * 9.) * step(.0001, uP.y);
} else {
c = stone(p + vec2(uP.x * .16, 0.), l);
c *= 1. - .78 * exp(-(e1 - p.x) * 9.) * step(.0001, uP.x);
}
float t1 = p.x - e1, t2 = p.x - e2;
if (uP.x > 0. && uP.x < 1. && t1 > 0. && t1 < .007 && p.x < e2) c = mix(vec3(.5, .33, .2), vec3(.2, .11, .06), t1 / .007);
if (uP.y > 0. && uP.y < 1. && t2 > 0. && t2 < .007) c = mix(vec3(.4, .37, .33), vec3(.1, .09, .08), t2 / .007);
vec2 q = p / vec2(asp, 1.);
c *= 1. - .2 * pow(length((q - .5) * vec2(1.05, 1.1)), 2.4) * 2.;
c = mix(c, vec3(.012, .056, .043), uP.w);
c += (hash(gl_FragCoord.xy) - .5) / 160.;
o = vec4(c, 1.);
}`;
export function initMaterials(sec) {
const canvas = sec.querySelector('[data-mat-canvas]');
const growBox = sec.querySelector('[data-grow]');
const shade = sec.querySelector('[data-shade]');
const lines = [...sec.querySelectorAll('[data-line]')];
const gl = matchMedia('(prefers-reduced-motion: reduce)').matches ? null : canvas.getContext('webgl2', { alpha: false, antialias: false });
if (!gl) {
sec.classList.add('is-flat');
return;
}
const prog = gl.createProgram();
for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]]) {
const s = gl.createShader(type);
gl.shaderSource(s, src);
gl.compileShader(s);
gl.attachShader(prog, s);
}
gl.linkProgram(prog);
const par = gl.getExtension('KHR_parallel_shader_compile');
const u = {};
let built = false;
const build = () => {
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
sec.classList.add('is-flat');
return;
}
gl.useProgram(prog);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
const grain = new Uint8Array(65536);
let seed = 7;
for (let i = 0; i < 65536; i++) {
seed = (seed * 1664525 + 1013904223) >>> 0;
grain[i] = seed >>> 24;
}
gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 256, 256, 0, gl.RED, gl.UNSIGNED_BYTE, grain);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
for (const n of ['uRes', 'uPtr', 'uP']) u[n] = gl.getUniformLocation(prog, n);
built = true;
sec.classList.add('is-lit');
};
const poll = () => (!par || gl.getProgramParameter(prog, par.COMPLETION_STATUS_KHR) ? build() : setTimeout(poll, 16));
poll();
let grow = () => {};
scrollWall(growBox).then((g) => { grow = g; }).catch(() => sec.classList.add('no-webgl'));
const ptr = { x: 0.62, y: 0.2, tx: 0.62, ty: 0.2, held: false };
sec.addEventListener('pointermove', (e) => {
if (e.pointerType !== 'mouse') return;
ptr.held = true;
ptr.tx = e.clientX / innerWidth;
ptr.ty = e.clientY / innerHeight;
}, { passive: true });
let dpr = Math.min(1.5, devicePixelRatio || 1);
let key = '';
function paint(p) {
if (!built || p > 0.8) return;
const w = Math.round(canvas.clientWidth * dpr);
const h = Math.round(canvas.clientHeight * dpr);
const P = [smooth(clamp((p - 0.13) / 0.15)), smooth(clamp((p - 0.35) / 0.15)), smooth(clamp((p - 0.43) / 0.1)), smooth(clamp((p - 0.585) / 0.06))];
const k = [w, h, ptr.x.toFixed(3), ptr.y.toFixed(3), ...P.map((v) => v.toFixed(4))].join();
if (k === key) return;
key = k;
if (canvas.width !== w || canvas.height !== h) {
canvas.width = w;
canvas.height = h;
}
gl.viewport(0, 0, w, h);
gl.uniform2f(u.uRes, w, h);
gl.uniform2f(u.uPtr, ptr.x, ptr.y);
gl.uniform4f(u.uP, ...P);
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
const say = [[-1, 0.13], [0.23, 0.34], [0.46, 0.56], [0.62, 0.72], [0.84, 2]];
function words(p) {
lines.forEach((n, i) => {
const [a, b] = say[i];
const inn = i === 0 ? 1 : ease(clamp((p - a) / 0.08));
const out = clamp((p - b) / 0.055);
const on = inn > 0 && out < 1;
n.style.visibility = on ? 'visible' : 'hidden';
if (on) n.firstElementChild.style.transform = `translateY(${((1 - inn) * 112 - out * out * 112).toFixed(2)}%)`;
});
shade.style.opacity = clamp((p - 0.78) / 0.1).toFixed(3);
growBox.style.opacity = clamp((p - 0.66) / 0.03).toFixed(3);
grow(clamp((p - 0.67) / 0.22));
}
let live = false;
let cur = -1;
let then = 0;
let slow = 8;
function loop(t) {
if (!live) return;
const dt = Math.min(60, t - then || 16);
then = t;
slow = slow * 0.95 + dt * 0.05;
if (slow > 24 && dpr > 0.75) {
dpr -= 0.25;
slow = 12;
}
const r = sec.getBoundingClientRect();
const to = clamp(-r.top / Math.max(1, r.height - innerHeight));
cur = cur < 0 ? to : cur + (to - cur) * (1 - Math.exp(-dt / 140));
if (!ptr.held) {
ptr.tx = 0.35 + 0.4 * Math.sin(cur * 9);
ptr.ty = 0.25 + 0.15 * Math.cos(cur * 7);
}
const k = 1 - Math.exp(-dt / 220);
ptr.x += (ptr.tx - ptr.x) * k;
ptr.y += (ptr.ty - ptr.y) * k;
paint(cur);
words(cur);
requestAnimationFrame(loop);
}
words(0);
new IntersectionObserver(([e]) => {
const before = live;
live = e.isIntersecting;
if (live && !before) requestAnimationFrame(loop);
}).observe(sec);
canvas.addEventListener('webglcontextlost', () => sec.classList.add('is-flat'));
}

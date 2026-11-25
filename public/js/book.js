
import { page, scene, follow, clamp, smooth, box } from './frame.js?v=c5329617';
import { programs, picture, texture, sized, slot } from './gl.js?v=da570bfd';
const PW = 1; // page width
const PH = 1.36;
const TH = 0.0075; // one sheet
const BOARD = 0.018;
const NX = 44;
const PXW = 1000;
const PXH = 1360;
const HEAD = `#version 300 es
precision highp float;
uniform mat4 uVP; uniform float uTurn, uCurl, uBaseR, uBaseL, uThick, uW, uH, uRest;
`;
const PAGE_VS = `${HEAD}
layout(location=0) in vec4 aV;
out vec2 vUv; out vec3 vP, vN; out float vU; flat out float vFace;
void main(){
float th = uTurn * 3.14159265;
float u = aV.x, n = 24.;
vec2 p = vec2(0.); float a = th;
float du = u / n;
for (float i = 0.; i < n; i++) {
float s = (i + .5) * du;
a = th + uCurl * sin(th) * (.34 - s) + uRest * exp(-s * 7.5) * cos(th);
p += vec2(cos(a), sin(a)) * du * uW;
}
vec2 nrm = vec2(-sin(a), cos(a));
float base = mix(uBaseR, uBaseL, smoothstep(0., 1., uTurn));
vec2 q = p + nrm * (aV.z < .5 ? uThick : aV.z < 1.5 ? 0. : aV.w * uThick);
vP = vec3(q.x, aV.y * uH * .5, q.y + base);
vN = aV.z < .5 ? vec3(nrm.x, 0., nrm.y) : aV.z < 1.5 ? -vec3(nrm.x, 0., nrm.y) : vec3(cos(a), 0., sin(a));
vU = u; vFace = aV.z;
vUv = vec2(aV.z > .5 && aV.z < 1.5 ? 1. - u : u, .5 - aV.y * .5);
gl_Position = uVP * vec4(vP, 1.);
}`;
const PAGE_FS = `#version 300 es
precision highp float;
in vec2 vUv; in vec3 vP, vN; in float vU; flat in float vFace;
uniform sampler2D uA, uB; uniform vec3 uEye, uLight; uniform float uBoard, uOnA, uOnB, uShade, uTip, uLamp; uniform vec2 uGl; uniform vec4 uHl; uniform vec2 uHf;
out vec4 o;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
void main(){
vec3 N = normalize(vN), V = normalize(uEye - vP);
vec3 L = normalize(uLight - vP);
vec3 col; float spec = .04, rough = 40.; float foil = 0.;
if (vFace > 1.5) {
if (uBoard > .5) col = vec3(.006, .022, .017);
else { float s = noise(vec2(vP.y * 3., vP.z * 1400.)) * .5 + noise(vec2(vP.y * 60., vP.z * 2600.)) * .5; col = mix(vec3(.60, .56, .49), vec3(.80, .77, .71), s); }
} else {
bool top = vFace < .5;
vec4 t = top ? texture(uA, vUv, -.35) : texture(uB, vUv, -.35);
float on = top ? uOnA : uOnB;
if (uBoard > .5 && t.a > 0. && ((top && uBoard < 1.5) || (!top && uBoard > 1.5))) {
vec2 w = vUv * vec2(1., 1.36);
float fine = 1. - smoothstep(.0007, .0022, length(fwidth(w)));
float wx = sin(w.x * 2300.) * fine, wy = sin(w.y * 2300.) * fine;
float weave = wx * wy * .5 + .5; float slub = noise(w * vec2(26., 240.)) * .5 + noise(w * vec2(240., 26.)) * .5;
vec3 cloth = mix(vec3(.0035, .0165, .0125), vec3(.0095, .036, .0275), weave * .5 + slub * .5);
float e = .0022;
float h = t.a, hx = texture(uA, vUv + vec2(e, 0.)).a * float(top) + texture(uB, vUv + vec2(e, 0.)).a * float(!top), hy = texture(uA, vUv + vec2(0., e)).a * float(top) + texture(uB, vUv + vec2(0., e)).a * float(!top);
foil = smoothstep(.45, .75, h) * on;
float press = (1. - foil) * smoothstep(.02, .45, h) * on;
N = normalize(N + vec3((h - hx) * 1.3, (hy - h) * 1.3, 0.) * on + vec3(wx * .05, wy * .05, 0.) * (1. - foil));
col = mix(cloth * (1. - press * .55), pow(t.rgb, vec3(2.2)) * .85, foil);
spec = mix(.03, .9, foil); rough = mix(12., 30., foil);
} else {
col = mix(vec3(.86, .835, .785), pow(max(t.rgb, 0.), vec3(2.2)), on);
if (uHf.x > .001 && (uHf.y < .5) == top) { vec2 q = smoothstep(uHl.xy - .004, uHl.xy + .004, vUv) * (1. - smoothstep(uHl.zw - .004, uHl.zw + .004, vUv)); col = mix(col, col * vec3(.80, .97, .50), q.x * q.y * uHf.x * .75); }
float g = noise(vUv * vec2(900., 1220.)) * .5 + noise(vUv * vec2(210., 280.)) * .5;
col *= .972 + g * .045;                                              // uncoated paper
float gut = exp(-vU * 15.); col *= 1. - gut * .52;                    // the fall of the page into the spine
}
}
float nl = dot(N, L);
float d2 = dot(uLight - vP, uLight - vP);
float lit = max(nl, 0.) * .92 + max(-nl, 0.) * .16;                      // a little light comes through a sheet
vec3 H = normalize(L + V);
float sp = pow(max(dot(N, H), 0.), rough) * spec;
if (foil > 0.) { vec3 R = reflect(-V, N); float band = smoothstep(-.2, .7, sin(R.x * 5. + R.y * 3. + uGl.x * 4.)) * .7 + .35; col *= mix(1., band * 1.5, foil); sp *= 1.2; }
float fall = 1. / (1. + d2 * .055);
float sh = 1.;
if (uShade > .001) { float x = vP.x; float under = uTip > 0. ? smoothstep(uTip + .34, uTip - .25, x) * smoothstep(-.25, .10, x) : smoothstep(uTip - .34, uTip + .25, x) * smoothstep(.25, -.10, x); sh = 1. - uShade * .50 * under; }
vec3 amb = mix(vec3(.13, .115, .095), vec3(.27, .245, .205), N.z * .5 + .5);
vec3 c = col * (amb + vec3(1.30, 1.09, .80) * lit * fall * 1.66 * sh) + vec3(1.2, 1.0, .72) * sp * fall * sh;
c *= uLamp;
c = c * (c * 2.51 + .03) / (c * (c * 2.43 + .59) + .14);
o = vec4(pow(c, vec3(1. / 2.2)) + (hash(gl_FragCoord.xy) - .5) / 200., 1.);
}`;
const DESK_VS = `#version 300 es
layout(location=0) in vec2 aP; uniform mat4 uVP, uBake; out vec2 vP; out vec4 vB; void main(){ vP = aP * 9.; vB = uBake * vec4(vP, 0., 1.); gl_Position = uVP * vec4(vP, -.004, 1.); }`;
const DESK_FS = `#version 300 es
precision highp float; in vec2 vP; in vec4 vB; uniform sampler2D uTex; uniform float uOpenL, uOpenR, uLamp; out vec4 o;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float edge(vec2 p, vec2 lo, vec2 hi){ vec2 c = (lo + hi) * .5, h = (hi - lo) * .5; vec2 d = abs(p - c) - h; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
void main(){
vec2 uv = vec2(.5 + .5 * vB.x / vB.w, .5 - .5 * vB.y / vB.w);
vec3 c = texture(uTex, clamp(uv, .002, .998)).rgb;
vec2 off = max(abs(uv - .5) - .5, 0.); c *= exp(-length(off) * 5.);
float d = edge(vP, vec2(-1.02 * uOpenL, -.70), vec2(1.02 * uOpenR, .70));
float con = exp(-max(d, 0.) * 17.) * .62 + exp(-max(edge(vP + vec2(-.11, .10), vec2(-1.02 * uOpenL, -.70), vec2(1.02 * uOpenR, .70)), 0.) * 6.) * .62;
c *= (1. - clamp(con, 0., .9)) * uLamp;
o = vec4(c + (hash(gl_FragCoord.xy + 2.) - .5) / 200., 1.);
}`;
const RIB_L = 1.36 + 0.36;
const RIB_VS = `#version 300 es
layout(location=0) in vec2 aR; uniform mat4 uVP; uniform vec3 uAt; uniform float uDy, uCast, uT; out vec2 vR; out vec3 vP, vN; out float vDrop;
vec3 path(float s, float side){
float y = .68 - s * ${RIB_L.toFixed(3)} - uDy; float past = max(0., -.68 - y), sg = sign(uAt.x + .0001);
float drop = smoothstep(.0, .13, past), lie = smoothstep(.10, .34, past);
float hw = .043 * (1. - .10 * lie);
float x = uAt.x + sin(y * 2.1 + .6) * .006 + sg * (.02 * drop + .075 * lie * lie) + side * hw * cos(lie * .5);
float yy = y + (1. - cos(drop * 1.57)) * .018 + side * hw * lie * .32 * sg;
float z = mix(uAt.z, .0105, drop) + .0016 + lie * (.016 * (sin(past * 21. - 1.2) * .5 + .5) + side * .013 * sin(past * 13. + .5)) + .0035 * (1. - side * side) * (1. - drop);
return vec3(x, yy, z);
}
void main(){
vP = path(aR.x, aR.y); vR = aR; vDrop = max(0., -.68 - vP.y);
vec3 a = path(aR.x + .004, aR.y) - path(aR.x - .004, aR.y), b = path(aR.x, min(1., aR.y + .5)) - path(aR.x, max(-1., aR.y - .5)); vN = normalize(cross(b, -a)); if (vN.z < 0.) vN = -vN;
gl_Position = uVP * vec4(vP + vec3(.017, -.017, -.0011) * uCast, 1.);
}`;
const RIB_FS = `#version 300 es
precision highp float; in vec2 vR; in vec3 vP, vN; in float vDrop; uniform sampler2D uTex; uniform vec3 uLight, uEye; uniform float uCast, uLamp; out vec4 o;
void main(){
float e = (1. - vR.x) * ${RIB_L.toFixed(3)} - .052 * (1. - abs(vR.y)); float aa = fwidth(e); float cut = smoothstep(-aa, aa, e);
if (cut < .02) discard;
if (uCast > .5) { float a = (1. - smoothstep(.35, 1., abs(vR.y))) * .42 * uLamp * cut; o = vec4(0., 0., 0., a); return; }
vec3 col = pow(texture(uTex, vec2(vR.y * .5 + .5, vR.x), -.4).rgb, vec3(2.2));
vec3 N = normalize(vN + vec3(vR.y * .16, 0., 0.)), L = normalize(uLight - vP), V = normalize(uEye - vP), H = normalize(L + V);
vec3 T = normalize(vec3(0., 1., 0.) - N * N.y); float th = dot(T, H); float satin = pow(max(0., 1. - th * th), 26.) * .34 + pow(max(0., 1. - th * th), 5.) * .10;
float warp = .965 + .035 * sin(vR.y * 260.) * (1. - smoothstep(.0, .05, fwidth(vR.y) * 8.));
float edge = smoothstep(1., .93, abs(vR.y));
vec3 c = col * warp * (vec3(.24, .22, .18) + vec3(1.32, 1.1, .8) * max(dot(N, L), 0.)) * mix(.62, 1., edge) + (col * .7 + .05) * vec3(1.25, 1.05, .78) * satin;
c *= uLamp; c = c * (c * 2.51 + .03) / (c * (c * 2.43 + .59) + .14);
o = vec4(pow(c, vec3(1. / 2.2)), 1.);
}`;
const BAKE_EYE = [0.12, -3.89 * Math.sin(0.22), 3.89 * Math.cos(0.22)];
const mul = (a, b) => {
const o = new Float32Array(16);
for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
return o;
};
const persp = (fov, asp, n, f) => {
const k = 1 / Math.tan(fov / 2);
return new Float32Array([k / asp, 0, 0, 0, 0, k, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]);
};
const look = (e, t) => {
const nz = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const z = nz([e[0] - t[0], e[1] - t[1], e[2] - t[2]]);
const x = nz(cr([0, 1, 0], z));
const y = cr(z, x);
const d = (v) => -(v[0] * e[0] + v[1] * e[1] + v[2] * e[2]);
return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, d(x), d(y), d(z), 1]);
};
export async function initBook(sec) {
const canvas = sec.querySelector('[data-book-canvas]');
const stories = [...document.querySelectorAll('[data-story]')].map((a) => ({ a, url: a.href, ...a.dataset }));
const open = sec.querySelector('[data-book-open]');
const at = sec.querySelector('[data-book-at]');
const intro = sec.querySelector('[data-book-intro]');
const toList = sec.querySelector('[data-book-list]');
const keep = sec.querySelector('[data-book-keep]');
const gl = canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'high-performance' });
if (!gl) throw new Error('no webgl2');
const making = programs(gl, [[PAGE_VS, PAGE_FS], [DESK_VS, DESK_FS], [RIB_VS, RIB_FS]], 'book');
making.catch(() => {});
const css = getComputedStyle(document.documentElement);
const fam = (v, d) => css.getPropertyValue(v).trim() || d;
const DISP = fam('--disp', 'serif');
const STRONG = fam('--strong', 'serif');
const TEXT = fam('--font', 'sans-serif');
const small = innerWidth * Math.min(2, devicePixelRatio || 1) < 1500;
const deskPic = picture(new URL(`../img/book/desk${small ? '-s' : ''}.avif`, import.meta.url).href);
deskPic.catch(() => {});
await Promise.allSettled([document.fonts.load(`400 80px ${DISP}`), document.fonts.load(`400 60px ${STRONG}`), document.fonts.load(`450 30px ${TEXT}`)]);
const INK = '#12372c';
const sheet = () => {
const c = new OffscreenCanvas(PXW, PXH);
const x = c.getContext('2d');
x.fillStyle = '#f3efe6';
x.fillRect(0, 0, PXW, PXH);
x.fillStyle = INK;
x.textBaseline = 'alphabetic';
return x;
};
const wrap = (x, text, w) => {
const out = [];
let line = '';
for (const word of text.split(' ')) {
const t = line ? `${line} ${word}` : word;
if (x.measureText(t).width > w && line) {
out.push(line);
line = word;
} else line = t;
}
if (line) out.push(line);
return out;
};
const block = (x, text, font, size, lead, left, top, w, most = 99) => {
x.font = font.replace('$', size);
const lines = wrap(x, text, w).slice(0, most);
lines.forEach((l, i) => x.fillText(l, left, top + size * 0.8 + i * lead));
return top + lines.length * lead;
};
const mark = (x, cx, cy, w, fills) => {
x.save();
const k = w / 768;
x.translate(cx - w / 2, cy - (571 * k) / 2);
x.scale(k, k);
['p', 'q'].forEach((n) => {
x.fillStyle = n === 'q' ? fills[0] : fills[1];
x.fill(new Path2D(document.querySelector(`.foot__mark defs path[id$="-${n}"]`).getAttribute('d')));
});
x.restore();
};
const cover = (back) => {
const c = new OffscreenCanvas(PXW, PXH);
const x = c.getContext('2d');
x.clearRect(0, 0, PXW, PXH);
x.fillStyle = 'rgba(0,0,0,.004)';
x.fillRect(0, 0, PXW, PXH);
if (back) mark(x, PXW / 2, PXH * 0.86, 120, ['#e9e6dc', '#a1e815']);
else {
x.shadowBlur = 5;
x.shadowColor = 'rgba(255,255,255,.9)';
mark(x, PXW / 2, PXH * 0.4, 470, ['#f1eee4', '#a1e815']);
x.fillStyle = '#f1eee4';
x.textAlign = 'center';
x.font = `400 118px ${DISP}`;
x.fillText('Journal', PXW / 2, PXH * 0.735);
}
return c;
};
const endpaper = () => {
const x = sheet();
x.fillStyle = '#08251c';
x.fillRect(0, 0, PXW, PXH);
x.globalAlpha = 0.16;
for (let r = 0; r < 12; r++) for (let q = 0; q < 8; q++) mark(x, 70 + q * 128 + (r % 2) * 64, 62 + r * 116, 62, ['#f1eee4', '#f1eee4']);
return x.canvas;
};
const GREEN = '#3a6a1a';
const groups = [];
stories.forEach((s) => {
let g = groups.find((x) => x.id === s.group);
if (!g) groups.push((g = { id: s.group, name: s.groupName, say: s.groupSay, list: [] }));
g.list.push(s);
});
const line = (x, text, font, px, left, base, align = 'left') => {
x.font = font.replace('$', px);
x.textAlign = align;
x.fillText(text, left, base);
x.textAlign = 'left';
};
const rule = (x, left, top, w, a = 0.2) => {
x.globalAlpha = a;
x.fillRect(left, top, w, 1.5);
x.globalAlpha = 1;
};
const arrow = (x, cx, cy, r, dir) => {
x.save();
x.lineWidth = 2.4;
x.lineCap = 'round';
x.lineJoin = 'round';
x.strokeStyle = INK;
x.beginPath();
x.arc(cx, cy, r, 0, 7);
x.globalAlpha = 0.4;
x.stroke();
x.globalAlpha = 1;
x.beginPath();
x.moveTo(cx + dir * r * 0.4, cy);
x.lineTo(cx - dir * r * 0.4, cy);
x.moveTo(cx - dir * r * 0.06, cy - r * 0.36);
x.lineTo(cx - dir * r * 0.4, cy);
x.lineTo(cx - dir * r * 0.06, cy + r * 0.36);
x.stroke();
x.restore();
};
const BACK = { x: 690, y: 62, w: 220, h: 74, list: true };
const backTo = (x) => {
arrow(x, 880, 99, 22, 1);
line(x, 'Contents', `450 $px ${TEXT}`, 25, 846, 108, 'right');
};
const title = (pg) => {
const x = sheet();
mark(x, 172, 168, 150, [INK, '#8fcb17']);
block(x, 'Journal', `400 $px ${DISP}`, 190, 190, 92, 520, 850);
block(x, 'Walls, rooms, and the plants that share them.', `400 $px ${DISP}`, 50, 62, 100, 740, 700);
rule(x, 100, 1150, 800);
line(x, 'Modiwall, Pretoria', `450 $px ${TEXT}`, 26, 100, 1216);
line(x, 'Turn the page', `450 $px ${TEXT}`, 26, 838, 1216, 'right');
arrow(x, 880, 1207, 22, -1);
pg.hits = [{ x: 560, y: 1160, w: 360, h: 100, by: 1 }];
return x.canvas;
};
const overview = (pg) => {
const x = sheet();
block(x, 'Contents', `400 $px ${DISP}`, 148, 148, 92, 120, 820);
pg.hits = [];
let y = 420;
groups.forEach((g, k) => {
rule(x, 96, y, 808, 0.2);
x.font = `400 64px ${DISP}`;
x.fillText(g.name, 94, y + 92);
line(x, `${g.list.length} stories`, `450 $px ${TEXT}`, 25, 904, y + 90, 'right');
pg.hits.push({ x: 76, y: y + 4, w: 848, h: 132, to: 2 + Math.floor((k + 1) / 2) });
y += 140;
});
rule(x, 96, y, 808, 0.2);
mark(x, 140, PXH - 108, 88, [INK, '#8fcb17']);
return x.canvas;
};
const chapter = (g) => async (pg) => {
const x = sheet();
const L = 112;
const E = 904;
const img = await picture(g.list[0].img);
const k = Math.max((E - L) / img.width, 400 / img.height);
x.save();
x.beginPath();
x.rect(L, 96, E - L, 400);
x.clip();
x.imageSmoothingQuality = 'high';
x.drawImage(img, L + (E - L - img.width * k) / 2, 96 + (400 - img.height * k) / 2, img.width * k, img.height * k);
x.restore();
img.close();
block(x, g.name, `400 $px ${DISP}`, 84, 84, L - 4, 530, E - L);
block(x, g.say, `400 $px ${DISP}`, 32, 40, L, 636, E - L);
pg.hits = [];
const rows = g.list.length + (g.id === 'plants' ? 1 : 0);
const step = Math.min(64, (PXH - 92 - 716) / rows);
let y = 716;
const row = (text, to) => {
rule(x, L, y, E - L, 0.16);
let px = 33;
x.font = `400 ${px}px ${STRONG}`;
while (x.measureText(text).width > 700 && px > 24) x.font = `400 ${--px}px ${STRONG}`;
x.fillText(text, L, y + step * 0.67);
line(x, String(to * 2 + 1), `400 $px ${STRONG}`, 28, E, y + step * 0.67, 'right');
pg.hits.push({ x: L - 20, y: y + 2, w: E - L + 40, h: step - 3, to });
y += step;
};
g.list.forEach((s) => row(s.head, spreadOf(stories.indexOf(s))));
if (g.id === 'plants') row('A plate of our plants', plate);
rule(x, L, y, E - L, 0.16);
return x.canvas;
};
const layoutOf = (i) => {
const g = groups.find((q) => q.id === stories[i].group);
const n = g.list.indexOf(stories[i]);
return n === 0 ? 'opener' : stories[i].quote ? ['framed', 'quote', 'full'][(n - 1) % 3] : 'framed';
};
const text = (s, i) => (pg) => {
const x = sheet();
const L = 96;
const E = 904;
const C = 318; // where the words begin
const g = groups.find((q) => q.id === s.group);
const n = g.list.indexOf(s);
x.fillStyle = GREEN;
line(x, s.groupName, `400 $px ${STRONG}`, 28, L, 108);
x.fillStyle = INK;
backTo(x);
let px = 108;
x.font = `400 ${px}px ${DISP}`;
const fits = () => { const w = wrap(x, s.head, E - L); return w.length <= 3 && w.every((l) => x.measureText(l).width <= E - L); };
while (px > 66 && !fits()) x.font = `400 ${(px -= 3)}px ${DISP}`;
let y = block(x, s.head, `400 $px ${DISP}`, px, px * 0.99, L - px * 0.04, 186, E - L + 6);
const quoteHere = s.quote && layoutOf(i) !== 'quote';
let floor = PXH - 168;
if (quoteHere) {
x.font = `400 46px ${DISP}`;
const q = wrap(x, s.quote, 720);
floor -= q.length * 54 + 46;
x.fillStyle = GREEN;
x.fillRect(C, floor + 22, 64, 3);
x.fillStyle = INK;
block(x, s.quote, `400 $px ${DISP}`, 46, 54, C, floor + 46, E - C);
}
const top = Math.max(y + 50, 452);
rule(x, L, top, E - L, 0.22);
x.globalAlpha = 0.86;
block(x, s.stand, `500 $px ${TEXT}`, 21.5, 33, L, top + 30, C - L - 28);
x.globalAlpha = 1;
const lead = 43;
const body = s.open ?? '';
const W = E - C;
const room = Math.floor((floor - top - 34) / lead);
const bits = body.split(' ').flatMap((w) => w.split(/(?<=[a-z]{2}-)(?=[a-z]{2})/).map((q, k) => [q, k > 0]));
let row = 0;
let xx = C;
const space = 8.4;
for (let k = 0; k < bits.length; k++) {
const [word, joined] = bits[k];
const strong = k < 5;
x.font = strong ? `400 34px ${STRONG}` : `450 27.5px ${TEXT}`;
const w = x.measureText(word).width;
const gap = xx > C && !joined ? space : 0;
if (xx + gap + w > C + W) {
row++;
xx = C;
if (row >= room) break;
}
const last = row === room - 1 && bits[k + 1] && xx + (xx > C ? gap : 0) + w + space + x.measureText(`${bits[k + 1][0]} …`).width > C + W;
x.fillText(last ? `${word.replace(/[,.;:]$/, '')} …` : word, xx + (xx > C ? gap : 0), top + 48 + row * lead);
xx += (xx > C ? gap : 0) + w;
if (last) break;
}
rule(x, L, PXH - 138, E - L, 0.22);
line(x, 'Read the whole story', `500 $px ${TEXT}`, 27, L, PXH - 84);
const w = x.measureText('Read the whole story').width;
x.fillStyle = GREEN;
x.fillRect(L, PXH - 70, w, 3);
x.fillStyle = INK;
line(x, `${s.minutes} minute read`, `450 $px ${TEXT}`, 24, L + w + 34, PXH - 84);
line(x, String(spreadOf(i) * 2 + 1), `400 $px ${STRONG}`, 28, E, PXH - 84, 'right');
void n;
pg.hits = [BACK, { x: L - 24, y: PXH - 136, w: w + 48, h: 90, url: s.url }, { x: L, y: 170, w: E - L, h: y - 170, url: s.url }];
return x.canvas;
};
const plants = (list, name, href, right) => async (pg) => {
const x = sheet();
x.fillStyle = GREEN;
line(x, right ? 'Exterior' : 'Interior', `400 $px ${STRONG}`, 29, 100, 109);
x.fillStyle = INK;
if (right) backTo(x);
block(x, name, `400 $px ${DISP}`, 78, 80, 96, 170, 800);
const pics = await Promise.all(list.map(([k]) => picture(new URL(`../img/plants/${k}.avif`, import.meta.url).href).catch(() => null)));
const cw = 256;
list.forEach(([, common, latin], i) => {
const xx = 100 + (i % 3) * (cw + 16);
const yy = 300 + Math.floor(i / 3) * 452;
if (pics[i]) x.drawImage(pics[i], xx, yy, cw, cw);
pics[i]?.close();
block(x, common, `400 $px ${STRONG}`, 27, 30, xx, yy + cw + 22, cw, 2);
x.globalAlpha = 0.8;
block(x, latin, `italic 450 $px ${TEXT}`, 21, 27, xx, yy + cw + 92, cw, 2);
x.globalAlpha = 1;
});
rule(x, 100, PXH - 138, 800, 0.18);
line(x, 'See them grown on a wall', `500 $px ${TEXT}`, 27, 100, PXH - 84);
const w = x.measureText('See them grown on a wall').width;
x.fillStyle = GREEN;
x.fillRect(100, PXH - 70, w, 3);
x.fillStyle = INK;
line(x, String(plate * 2 + (right ? 1 : 0)), `400 $px ${STRONG}`, 27, 900, PXH - 84, 'right');
pg.hits = [{ x: 84, y: PXH - 130, w: w + 32, h: 76, url: href }, ...(right ? [BACK] : [])];
return x.canvas;
};
const photo = (s, i) => async (pg) => {
const x = sheet();
const img = await picture(s.img);
const how = layoutOf(i);
const lay = (l, t, w, h, fy = 0.5) => {
const k = Math.max(w / img.width, h / img.height);
x.save();
x.beginPath();
x.rect(l, t, w, h);
x.clip();
x.imageSmoothingQuality = 'high';
x.drawImage(img, l + (w - img.width * k) / 2, t + (h - img.height * k) * fy, img.width * k, img.height * k);
x.restore();
};
pg.hits = [{ x: 0, y: 0, w: PXW, h: PXH, url: s.url, pic: true }];
if (how === 'opener') {
lay(0, 0, PXW, PXH);
const d = x.createLinearGradient(0, PXH * 0.42, 0, PXH);
d.addColorStop(0, 'rgba(4,16,11,0)');
d.addColorStop(1, 'rgba(4,16,11,.86)');
x.fillStyle = d;
x.fillRect(0, 0, PXW, PXH);
x.fillStyle = '#fbf8f0';
block(x, s.groupName, `400 $px ${DISP}`, 148, 138, 84, PXH - 330, 840);
block(x, s.groupSay, `400 $px ${DISP}`, 40, 48, 92, PXH - 172, 760);
} else if (how === 'quote') {
lay(0, 0, PXW, 820);
x.fillStyle = '#0c3328';
x.fillRect(0, 820, PXW, PXH - 820);
x.fillStyle = '#a1e815';
x.fillRect(96, 884, 64, 4);
x.fillStyle = '#f6f2e8';
let q = 66;
x.font = `400 ${q}px ${DISP}`;
while (q > 44 && wrap(x, s.quote, 800).length > 4) x.font = `400 ${(q -= 2)}px ${DISP}`;
block(x, s.quote, `400 $px ${DISP}`, q, q * 1.12, 94, 922, 806);
} else if (how === 'framed') {
lay(96, 96, 808, 1010);
block(x, s.alt ?? '', `450 $px ${TEXT}`, 23, 33, 96, 1136, 560, 2);
line(x, String(spreadOf(i) * 2), `400 $px ${STRONG}`, 28, 96, PXH - 84);
} else lay(0, 0, PXW, PXH);
img.close();
return x.canvas;
};
const last = () => {
const x = sheet();
mark(x, PXW / 2, PXH * 0.4, 150, [INK, '#7fb512']);
x.textAlign = 'center';
x.font = `400 62px ${DISP}`;
x.fillText('Grown for one address.', PXW / 2, PXH * 0.55);
return x.canvas;
};
const M = stories.length;
const spreads = [null, { kind: 'title' }, { kind: 'contents' }, { kind: 'contents2' }, { kind: 'contents3' }];
stories.forEach((st, i) => {
spreads.push({ kind: 'story', i });
if (st.group === 'plants' && stories[i + 1]?.group !== 'plants') spreads.push({ kind: 'plate' });
});
function spreadOf(i) { return spreads.findIndex((q) => q?.kind === 'story' && q.i === i); }
const plate = spreads.findIndex((q) => q?.kind === 'plate');
const page1 = new URL('./plants.html', document.baseURI).href;
const INP = [['heart', 'Heart-leaf philodendron', 'Philodendron hederaceum'], ['marble', 'Marble queen', 'Epipremnum aureum'], ['sche', 'Dwarf umbrella', 'Heptapleurum arboricola'], ['spider', 'Spider plant', 'Chlorophytum comosum'], ['fern', 'Boston fern', 'Nephrolepis, sterile'], ['lily', 'Peace lily', 'Spathiphyllum']];
const EXP = [['bulb', 'Bulbine', 'Bulbine frutescens'], ['spek', 'Spekboom', 'Portulacaria afra'], ['crass', 'Campfire crassula', 'Crassula capitella'], ['helich', 'Silver helichrysum', 'Helichrysum petiolare'], ['fescue', 'Blue fescue', 'Festuca glauca'], ['setc', 'Purple heart', 'Tradescantia pallida']];
const leaves = { title: [endpaper, title], contents: [overview, chapter(groups[0])], contents2: [chapter(groups[1]), chapter(groups[2])], contents3: [chapter(groups[3]), chapter(groups[4])], plate: [plants(INP, 'For a room', page1, false), plants(EXP, 'For the open air', `${page1}#exterior`, true)] };
const faces = (q) => (q.kind === 'story' ? [photo(stories[q.i], q.i), text(stories[q.i], q.i)] : leaves[q.kind]);
const sheets = [{ board: 1, a: () => cover(false), b: endpaper }];
for (let k = 1; k < spreads.length; k++) sheets.push({ a: faces(spreads[k])[1], b: spreads[k + 1] ? faces(spreads[k + 1])[0] : last });
sheets.push({ board: 2, a: endpaper, b: () => cover(true) });
sheets.forEach((q) => { q.aPg = {}; q.bPg = {}; });
const N = sheets.length;
const ENDS = N - 1; // the back board stays where it is
const blank = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, blank);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([243, 239, 230, 0]));
const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
async function print(s, k) {
if (s[`${k}T`] || s[`${k}B`]) return;
s[`${k}B`] = true;
await slot();
let c;
try {
c = await s[k](s[`${k}Pg`]);
} catch {
return;
}
await slot();
const t = gl.createTexture();
gl.activeTexture(gl.TEXTURE3);
gl.bindTexture(gl.TEXTURE_2D, t);
gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
await slot();
gl.activeTexture(gl.TEXTURE3);
gl.bindTexture(gl.TEXTURE_2D, t);
gl.generateMipmap(gl.TEXTURE_2D);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
for (const w of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, w, gl.CLAMP_TO_EDGE);
if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
s[`${k}T`] = t;
s[`${k}On`] = 0;
}
const v = [];
const idx = [];
for (const face of [0, 1]) {
const o = v.length / 4;
for (let i = 0; i <= NX; i++) for (const y of [-1, 1]) v.push(i / NX, y, face, 0);
for (let i = 0; i < NX; i++) {
const a = o + i * 2;
idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
}
}
for (const y of [-1, 1]) {
const o = v.length / 4;
for (let i = 0; i <= NX; i++) for (const w of [0, 1]) v.push(i / NX, y, 2, w);
for (let i = 0; i < NX; i++) {
const a = o + i * 2;
idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
}
}
{
const o = v.length / 4;
for (const y of [-1, 1]) for (const w of [0, 1]) v.push(1, y, 2, w);
idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3);
}
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
const desk = gl.createVertexArray();
gl.bindVertexArray(desk);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.bindVertexArray(null);
const [pageP, deskP, ribP] = await making;
const wood = await texture(gl, await deskPic, { mip: true, sharp: 8 });
const bake = mul(persp(0.95, 2, 0.1, 30), look(BAKE_EYE, [0.12, 0, 0]));
const rib = ribbon();
await Promise.all([print(sheets[0], 'a'), print(sheets[0], 'b'), print(sheets[1], 'a')]);
const size = sized(canvas, 2);
const turn = { x: -1, v: 0 };
const eye = { x: { x: 0.5, v: 0 }, y: { x: 0, v: 0 }, d: { x: 3, v: 0 }, t: { x: 0, v: 0 } };
const mouse = { tx: 0, ty: 0, x: { x: 0, v: 0 }, y: { x: 0, v: 0 } };
let VP = null;
let shown = -1;
let lamp = 0;
function ribbon() {
const pts = [];
const ix = [];
const NS = 150; // along it
const NW = 6; // across
for (let i = 0; i <= NS; i++) {
const f = i / NS;
const u = f < 0.3 ? (f / 0.3) * 0.74 : 0.74 + ((f - 0.3) / 0.7) * 0.26;
for (let k = 0; k <= NW; k++) pts.push(u, (k / NW) * 2 - 1);
}
for (let i = 0; i < NS; i++) for (let k = 0; k < NW; k++) {
const a0 = i * (NW + 1) + k;
ix.push(a0, a0 + 1, a0 + NW + 1, a0 + 1, a0 + NW + 2, a0 + NW + 1);
}
const a = gl.createVertexArray();
gl.bindVertexArray(a);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ix), gl.STATIC_DRAW);
gl.bindVertexArray(null);
const RW = 192;
const c = new OffscreenCanvas(RW, Math.round((RW * RIB_L) / 0.086));
const x = c.getContext('2d');
const sh = x.createLinearGradient(0, 0, RW, 0);
sh.addColorStop(0, '#0d3a2e');
sh.addColorStop(0.5, '#17604b');
sh.addColorStop(1, '#0d3a2e');
x.fillStyle = sh;
x.fillRect(0, 0, RW, c.height);
x.fillStyle = '#a1e815';
x.fillRect(13, 0, 5, c.height);
x.fillRect(RW - 18, 0, 5, c.height);
x.fillStyle = 'rgba(8,40,30,.55)';
for (let y = 0; y < c.height; y += 9) {
x.fillRect(12, y, 7, 2);
x.fillRect(RW - 19, y, 7, 2);
}
const tail = Math.round(c.height * ((1.36 + 0.185) / RIB_L));
mark(x, RW / 2, tail, 112, ['#f6f2e8', '#b4f23a']);
mark(x, RW / 2, Math.round(c.height * 0.055), 112, ['#f6f2e8', '#b4f23a']);
x.globalAlpha = 0.5;
x.strokeStyle = 'rgba(8,40,30,.6)';
x.lineWidth = 1;
for (const cy of [tail, c.height * 0.055]) for (let q = -60; q < 60; q += 3) {
x.beginPath();
x.moveTo(RW / 2 - 62, cy + q);
x.lineTo(RW / 2 + 62, cy + q + 14);
x.stroke();
}
x.globalAlpha = 1;
const t = gl.createTexture();
gl.activeTexture(gl.TEXTURE3);
gl.bindTexture(gl.TEXTURE_2D, t);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
gl.generateMipmap(gl.TEXTURE_2D);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
for (const w of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, w, gl.CLAMP_TO_EDGE);
if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
return { a, t, n: ix.length };
}
const KEY = 'mw-ribbon';
const nameOf = (k) => { const q = spreads[k]; return q?.kind === 'story' ? new URL(stories[q.i].url).pathname.split('/').pop() : q?.kind ?? null; };
let kept = null;
try { kept = localStorage.getItem(KEY); } catch { /* not allowed: the ribbon simply stays in the contents */ }
const placeOf = () => { const k = kept ? spreads.findIndex((q, i) => q && nameOf(i) === kept) : -1; return k > 0 ? k : 2; };
let ribAt = placeOf();
let ribTo = ribAt;
const pull = { x: 0, v: 0 };
const peel = { r: { x: 0, v: 0 }, l: { x: 0, v: 0 }, tr: 0, tl: 0 };
const hl = { x: 0, v: 0, rect: [0, 0, 0, 0], face: 0, sheet: -1, on: 0 };
const tall = () => size.w < size.h * 0.86;
const REST = 0.42;
function place(p) {
const steps = ENDS;
const x = clamp(p) * steps;
const i = Math.min(steps - 1, Math.floor(x));
const f = x - i;
return { x: i + smooth(clamp((f - REST * 0.5) / (1 - REST))), i, f };
}
function draw(t, dt, p) {
if (!size.fit()) return;
const { cw, ch } = size;
const asp = cw / ch;
const narrow = tall();
const q = place(p);
const x = q.x;
for (const [k, s] of sheets.entries()) {
const near = k > x - 2.6 && k < x + 3.4 && Math.abs(turn.v) < 0.0009; // pages that fly past are not set
if (near) {
print(s, 'a');
print(s, 'b');
} else if (Math.abs(k - x) > 6 && k > 0) for (const f of ['a', 'b']) if (s[`${f}T`]) {
gl.deleteTexture(s[`${f}T`]);
s[`${f}T`] = null;
s[`${f}B`] = false;
}
for (const f of ['a', 'b']) if (s[`${f}T`]) s[`${f}On`] += (1 - s[`${f}On`]) * (1 - Math.exp(-dt / 260));
}
const opened = smooth(clamp(x));
let cx = 0.5 * (1 - opened);
if (narrow) {
const f = q.f;
const after = q.i + (f > 0.5 ? 1 : 0); // how many sheets are over once this turn has been made
const side = after < 1 ? 0.5 : smooth(clamp((f - 0.04) / 0.22)) - 0.5;
cx = q.i < 1 && f <= 0.5 ? 0.5 : f > 0.5 ? -0.5 : side;
}
const mx = follow(mouse.x, mouse.tx, dt, 240);
const my = follow(mouse.y, mouse.ty, dt, 240);
const wide = narrow ? 1.2 : 1.12 + opened * 1.06;
const fov = 0.5;
const need = Math.max((PH * (narrow ? 1.28 : 1.55)) / (2 * Math.tan(fov / 2)), wide / (2 * Math.tan(fov / 2) * asp));
const d = follow(eye.d, need, dt, 420);
const ex = follow(eye.x, cx, dt, narrow ? 230 : 380);
const lift = 0.22 + 0.10 * (1 - opened);
const e = [ex + mx * 0.16, -d * Math.sin(lift) + my * -0.12, d * Math.cos(lift)];
VP = mul(persp(fov, asp, 0.1, 30), look(e, [ex, narrow ? 0.0 : -0.012, 0]));
lamp += (1 - lamp) * (1 - Math.exp(-dt / 900));
const light = [-1.35 + mx * 0.5, 1.3 - my * 0.4, 2.0];
gl.viewport(0, 0, cw, ch);
gl.enable(gl.DEPTH_TEST);
gl.disable(gl.CULL_FACE);
gl.clear(gl.DEPTH_BUFFER_BIT);
gl.useProgram(deskP.p);
gl.uniformMatrix4fv(deskP.u.uVP, false, VP);
gl.uniformMatrix4fv(deskP.u.uBake, false, bake);
gl.uniform1i(deskP.u.uTex, 2);
gl.activeTexture(gl.TEXTURE2);
gl.bindTexture(gl.TEXTURE_2D, wood);
gl.uniform1f(deskP.u.uOpenL, clamp(x * 1.2));
gl.uniform1f(deskP.u.uOpenR, 1);
gl.uniform1f(deskP.u.uLamp, lamp);
gl.bindVertexArray(desk);
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
const { u } = pageP;
gl.useProgram(pageP.p);
gl.uniformMatrix4fv(u.uVP, false, VP);
gl.uniform3fv(u.uEye, e);
gl.uniform3fv(u.uLight, light);
gl.uniform1i(u.uA, 0);
gl.uniform1i(u.uB, 1);
gl.uniform1f(u.uLamp, lamp);
gl.uniform2f(u.uGl, mx, my);
follow(hl, hl.on, dt, 80);
gl.uniform4fv(u.uHl, hl.rect);
follow(peel.r, peel.tr, dt, 210);
follow(peel.l, peel.tl, dt, 210);
const inAir = Math.floor(x);
const a = x - inAir;
const th = a * Math.PI;
gl.uniform1f(u.uTip, Math.cos(th) + (Math.abs(Math.cos(th)) < 0.001 ? 0.001 : 0));
gl.bindVertexArray(vao);
const under = BOARD; // the back board lies beneath everything
for (const [k, s] of sheets.entries()) {
let g = k === N - 1 ? 0 : clamp(x - k);
const still = Math.abs(x - Math.round(x)) < 0.02;
if (still && k === Math.round(x) && k < N - 1) g = Math.max(g, peel.r.x);
if (still && k === Math.round(x) - 1) g = Math.min(g, 1 - peel.l.x);
const moving = g > 0 && g < 1;
gl.uniform1f(u.uTurn, g);
gl.uniform1f(u.uCurl, s.board ? 0.0 : 1.55);
gl.uniform1f(u.uRest, s.board ? 0.0 : 0.42 * clamp(x * 1.6 - 0.25) * clamp((ENDS - x) * 1.6));
gl.uniform1f(u.uThick, s.board ? BOARD : TH);
gl.uniform1f(u.uW, s.board ? PW * 1.022 : PW);
gl.uniform1f(u.uH, s.board ? PH * 1.026 : PH);
gl.uniform1f(u.uBaseR, k === N - 1 ? 0 : under + (N - 2 - k) * TH + (k === 0 ? TH * 2.2 : 0));
gl.uniform1f(u.uBaseL, k === 0 ? BOARD * 1.02 : BOARD * 1.02 + k * TH);
gl.uniform1f(u.uBoard, s.board ?? 0);
gl.uniform1f(u.uShade, moving ? 0 : Math.sin(th));
gl.uniform2f(u.uHf, k === hl.sheet ? hl.x : 0, hl.face);
gl.uniform1f(u.uOnA, s.aT ? s.aOn : 0);
gl.uniform1f(u.uOnB, s.bT ? s.bOn : 0);
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, s.aT ?? blank);
gl.activeTexture(gl.TEXTURE1);
gl.bindTexture(gl.TEXTURE_2D, s.bT ?? blank);
gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
}
if (ribTo !== ribAt && pull.x > 0.985) ribAt = ribTo;
follow(pull, ribTo !== ribAt ? 1 : 0, dt, 260);
{
const g = clamp(x - ribAt);
const ang = g * Math.PI;
const out = 0.05;
const right = under + (N - 2 - ribAt) * TH + TH;
const left = BOARD * 1.02 + ribAt * TH;
const lift = Math.sin(ang) * out;
const bow = 0.028 * (1 - g) * clamp((x - ribAt + 1) * 2 - 1); // a leaf at rest stands up a little beside the spine
gl.useProgram(ribP.p);
gl.uniformMatrix4fv(ribP.u.uVP, false, VP);
gl.uniform3f(ribP.u.uAt, Math.cos(ang) * out, 0, right + (left - right) * smooth(g) + lift + (g < 0.5 ? bow : 0));
gl.uniform1f(ribP.u.uDy, pull.x * 1.95);
gl.uniform1f(ribP.u.uLamp, lamp * clamp(1.4 - Math.max(0, pull.x - 0.7) * 5));
gl.uniform3fv(ribP.u.uLight, light);
gl.uniform3fv(ribP.u.uEye, e);
gl.uniform1i(ribP.u.uTex, 2);
gl.activeTexture(gl.TEXTURE2);
gl.bindTexture(gl.TEXTURE_2D, rib.t);
gl.bindVertexArray(rib.a);
gl.enable(gl.BLEND);
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
gl.depthMask(false);
gl.uniform1f(ribP.u.uCast, 1);
gl.drawElements(gl.TRIANGLES, rib.n, gl.UNSIGNED_SHORT, 0);
gl.depthMask(true);
gl.disable(gl.BLEND);
gl.uniform1f(ribP.u.uCast, 0);
gl.drawElements(gl.TRIANGLES, rib.n, gl.UNSIGNED_SHORT, 0);
}
const spread = Math.round(x);
if (spread !== shown) {
shown = spread;
hl.on = 0;
const q = spreads[spread];
const s = q?.kind === 'story' ? stories[q.i] : null;
sec.classList.toggle('has-story', !!s || spread === plate);
sec.classList.toggle('is-open', spread > 0);
at.textContent = s ? s.groupName : spread === 0 ? 'Scroll to open' : spread >= 2 && spread <= 4 ? 'Contents' : spread === plate ? 'Plants' : '';
if (s) {
open.href = s.url;
open.textContent = 'Read this story';
open.setAttribute('aria-label', `Read: ${s.head}`);
} else if (spread === plate) {
open.href = page1;
open.textContent = 'See the plants';
open.removeAttribute('aria-label');
}
keepLabel();
}
const k = (1 - clamp(x * 2.4)).toFixed(3);
if (intro.dataset.k !== k) {
intro.dataset.k = k;
intro.style.opacity = k;
intro.style.visibility = k > 0.01 ? '' : 'hidden';
intro.style.transform = `translate3d(0,${((1 - k) * -1.6).toFixed(2)}rem,0)`;
}
}
const goTo = (k) => {
const b = box(sec);
scrollTo({ top: b.top + (clamp(k, 0, ENDS) / ENDS) * (b.height - page.h), behavior: 'smooth' });
};
function keepLabel() {
const here = Math.max(0, shown);
const mine = kept && placeOf() === here;
const back = kept && here < 1;
sec.classList.toggle('is-kept', !!mine);
keep.hidden = !spreads[here] && !back;
keep.lastElementChild.textContent = back ? 'Back to your page' : mine ? 'Take the bookmark out' : 'Bookmark this page';
keep.setAttribute('aria-pressed', !!mine);
toList.hidden = here < 1 || here === 2; // the way back, from anywhere
}
keep.addEventListener('click', () => {
if (kept && shown < 1) return goTo(placeOf());
kept = kept && placeOf() === shown ? null : nameOf(shown);
try {
if (kept) localStorage.setItem(KEY, kept);
else localStorage.removeItem(KEY);
} catch { /* kept for this visit only */ }
ribTo = placeOf();
keepLabel();
});
toList.addEventListener('click', () => goTo(2));
const go = (by) => {
const b = box(sec);
const len = b.height - page.h;
const now = clamp((page.y - b.top) / len) * ENDS;
const to = clamp(Math.round(now) + by, 0, ENDS);
scrollTo({ top: b.top + (to / ENDS) * len, behavior: 'smooth' });
};
sec.querySelectorAll('[data-book-go]').forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.bookGo))));
addEventListener('keydown', (e) => {
const r = sec.getBoundingClientRect();
if (r.top > innerHeight * 0.4 || r.bottom < innerHeight * 0.6 || e.target.closest('input, textarea, select, dialog')) return;
if (e.key === 'ArrowRight') go(1);
if (e.key === 'ArrowLeft') go(-1);
});
const spot = (e) => {
const r = canvas.getBoundingClientRect();
const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
const ny = 1 - ((e.clientY - r.top) / r.height) * 2;
const onto = (z) => {
const [a, b, c] = [VP[0] - nx * VP[3], VP[4] - nx * VP[7], -(VP[8] * z + VP[12] - nx * (VP[11] * z + VP[15]))];
const [d, f, g] = [VP[1] - ny * VP[3], VP[5] - ny * VP[7], -(VP[9] * z + VP[13] - ny * (VP[11] * z + VP[15]))];
const k = a * f - b * d;
return [(c * f - b * g) / k, (a * g - c * d) / k];
};
let p = onto(BOARD + (N - 2 - Math.max(0, shown)) * TH + TH);
if (p[0] < 0 && shown > 0) p = onto(BOARD + shown * TH);
const [x, y] = p;
const side0 = turn.x * ENDS > ribAt + 0.5 ? -0.076 : 0.076;
if (Math.abs(x - side0) < 0.06 && y < -PH / 2 - 0.01 && y > -PH / 2 - 0.2) return { s: 0, tail: true };
if (Math.abs(y) > PH / 2 || Math.abs(x) > 1.02 || (shown === 0 && x < 0)) return { s: 0 };
const s = x > 0 ? 1 : -1;
const sh = s > 0 ? shown : shown - 1;
const px = (s > 0 ? x : 1 + x) * PXW;
const py = (0.5 - y / PH) * PXH;
const pg = sheets[sh]?.[s > 0 ? 'aPg' : 'bPg'];
const hit = pg?.hits?.find((h) => px > h.x && px < h.x + h.w && py > h.y && py < h.y + h.h);
return { s: shown === 0 ? 1 : s, hit, sh, face: s > 0 ? 0 : 1, px, py };
};
let down = null;
canvas.addEventListener('pointermove', (e) => {
mouse.tx = e.clientX / page.w - 0.5;
mouse.ty = e.clientY / page.h - 0.5;
if (e.pointerType !== 'mouse' || !VP) return;
const { s, hit, sh, face, tail, px } = spot(e);
const kind = tail ? 'ribbon' : hit?.list ? 'list' : hit?.url ? (hit.pic ? 'read' : 'read') : hit?.by ? 'next' : hit?.to ? 'line' : s ? (shown === 0 ? 'open' : s > 0 && shown < ENDS ? 'next' : s < 0 ? 'back' : '') : '';
const outer = px > PXW * 0.8 && s > 0 ? 1 : px < PXW * 0.2 && s < 0 ? -1 : 0;
const k2 = outer && kind !== 'list' && kind !== 'line' ? (outer > 0 ? 'next' : 'back') : kind;
if (k2) {
canvas.dataset.kind = k2;
canvas.dataset.cursor = { ribbon: kept ? 'Your page' : 'Contents', list: 'Contents', read: 'Read', open: 'Open' }[k2] ?? '';
} else {
delete canvas.dataset.kind;
delete canvas.dataset.cursor;
}
peel.tr = s > 0 && shown > 0 && shown < ENDS ? 0.012 + 0.05 * clamp((px / PXW - 0.45) / 0.55) : 0;
peel.tl = s < 0 && shown > 0 ? 0.012 + 0.05 * clamp((0.55 - px / PXW) / 0.55) : 0;
if (hit && !hit.url && !hit.list && !hit.by) {
hl.on = 1;
hl.rect = [hit.x / PXW, hit.y / PXH, (hit.x + hit.w) / PXW, (hit.y + hit.h) / PXH];
hl.sheet = sh;
hl.face = face;
} else hl.on = 0;
}, { passive: true });
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
if (!down || !VP) return;
const dx = e.clientX - down.x;
const dy = e.clientY - down.y;
down = null;
if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
else if (Math.hypot(dx, dy) < 8) {
const { s, hit, tail, px } = spot(e);
const outer = (px > PXW * 0.8 && s > 0) || (px < PXW * 0.2 && s < 0);
if (tail) goTo(placeOf());
else if (hit?.list) goTo(2);
else if (hit?.to) goTo(hit.to);
else if (outer && s && shown > 0) go(s);
else if (hit?.url) location.href = hit.url;
else if (hit?.by) go(hit.by);
else if (s) go(s);
}
});
let lost = false;
canvas.addEventListener('webglcontextlost', () => {
lost = true;
sec.classList.add('is-flat');
});
canvas.addEventListener('pointerleave', () => {
hl.on = 0;
peel.tr = peel.tl = 0;
});
sec.style.setProperty('--turns', ENDS);
sec.classList.add('is-ready');
scene(sec, (dt, t, top, h) => {
if (lost) return;
const to = clamp(-top / Math.max(1, h - page.h));
if (turn.x < 0) turn.x = to;
draw(t, dt, follow(turn, to, dt, 165));
});
}

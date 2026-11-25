/* The journal as a book. Cloth boards with the mark pressed into them, sheets that bend as they turn, real thickness,
   light that falls across the paper. Scrolling turns the pages; so do a click, a swipe and the arrow keys. Every page is
   set in the site's own type, and every story can also be reached as an ordinary link below the book. The desk is a traced
   render, laid back down on the plane it was seen on. A ribbon keeps your place. */
import { page, scene, follow, clamp, smooth, box } from './frame.js';
import { programs, picture, texture, sized, slot } from './gl.js';

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
/* aV: along the page 0..1, up the page -1..1, face (0 top, 1 underside, 2 edges), side of the edge */
const PAGE_VS = `${HEAD}
layout(location=0) in vec4 aV;
out vec2 vUv; out vec3 vP, vN; out float vU; flat out float vFace;
void main(){
  float th = uTurn * 3.14159265;
  float u = aV.x, n = 24.;
  vec2 p = vec2(0.); float a = th;
  // walk out from the spine along the bent sheet
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
      // cloth, and the mark pressed into it
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
  // what the sheet in the air throws on the pages beneath it
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
  // the light comes from the upper left: the book stands in its own shade to the lower right
  float con = exp(-max(d, 0.) * 17.) * .62 + exp(-max(edge(vP + vec2(-.11, .10), vec2(-1.02 * uOpenL, -.70), vec2(1.02 * uOpenR, .70)), 0.) * 6.) * .62;
  c *= (1. - clamp(con, 0., .9)) * uLamp;
  o = vec4(c + (hash(gl_FragCoord.xy + 2.) - .5) / 200., 1.);
}`;
/* a silk ribbon from the head of the spine, through the pages, out past the foot and down to the desk */
const RIB_L = 1.36 + 0.2;
const RIB_VS = `#version 300 es
layout(location=0) in vec2 aR; uniform mat4 uVP; uniform vec3 uAt; uniform float uDy, uCast, uLay; out vec2 vR; out vec3 vP; out float vDrop;
void main(){
  float y = .68 - aR.x * ${RIB_L.toFixed(3)} - uDy; float past = -.68 - y;
  float drop = smoothstep(.012, .15, past); vDrop = past;
  float x = uAt.x + aR.y * .034 + sin(y * 2.4 + 1.) * .010 * uLay + drop * .03 * sign(uAt.x + .0001);
  float z = mix(uAt.z, .010, drop) + sin(past * 26.) * .006 * step(0., past) * (1. - drop * .4) + .0016;
  vP = vec3(x, y, z); vR = aR;
  vec3 q = vP + vec3(.014, -.014, -.0012) * uCast;
  gl_Position = uVP * vec4(q, 1.);
}`;
const RIB_FS = `#version 300 es
precision highp float; in vec2 vR; in vec3 vP; in float vDrop; uniform sampler2D uTex; uniform vec3 uLight, uEye; uniform float uCast, uLamp; out vec4 o;
void main(){
  if ((1. - vR.x) * ${RIB_L.toFixed(3)} < .05 * (1. - abs(vR.y))) discard;
  if (uCast > .5) { float a = (1. - smoothstep(.55, 1., abs(vR.y))) * .34 * uLamp; o = vec4(0., 0., 0., a); return; }
  vec3 col = pow(texture(uTex, vec2(vR.y * .5 + .5, vR.x)).rgb, vec3(2.2));
  float slope = vDrop > 0. ? cos(vDrop * 26.) * .16 + smoothstep(.012, .05, vDrop) * (1. - smoothstep(.09, .16, vDrop)) * -.6 : 0.;
  vec3 N = normalize(vec3(vR.y * .22, slope, 1.)), L = normalize(uLight - vP), V = normalize(uEye - vP), H = normalize(L + V);
  float weave = .93 + .07 * sin(vR.y * 190.) * sin(vR.x * 5200.);
  vec3 c = col * weave * (vec3(.26, .24, .2) + vec3(1.3, 1.09, .8) * max(dot(N, L), 0.) * 1.05) + vec3(1.2, 1., .7) * pow(max(dot(N, H), 0.), 22.) * .12;
  c *= uLamp; c = c * (c * 2.51 + .03) / (c * (c * 2.43 + .59) + .14);
  o = vec4(pow(c, vec3(1. / 2.2)), 1.);
}`;
/* how the desk was seen when it was rendered (tools/render/desk.py) */
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

  /* ---- setting the pages ---- */
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
    document.querySelectorAll('.foot__mark > path').forEach((p) => {
      x.fillStyle = p.matches('.lg-m') ? fills[0] : fills[1];
      x.fill(new Path2D(p.getAttribute('d')));
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
  // text with a little air between its letters
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
  // contents, in chapters, over two pages
  const half = (list) => (pg) => {
    const x = sheet();
    pg.hits = [];
    let y = 118;
    const left = list[0] === groups[0];
    if (left) {
      block(x, 'Contents', `400 $px ${DISP}`, 104, 104, 96, 96, 800);
      y = 372;
    }
    const step = 60;
    list.forEach((g) => {
      x.fillStyle = GREEN;
      line(x, g.name, `400 $px ${DISP}`, 56, 98, y + 46);
      x.fillStyle = INK;
      y += 74;
      g.list.forEach((s) => {
        rule(x, 100, y, 800, 0.16);
        const at = stories.indexOf(s);
        let px = 33;
        x.font = `400 ${px}px ${STRONG}`;
        while (x.measureText(s.head).width > 700 && px > 25) x.font = `400 ${--px}px ${STRONG}`;
        x.fillText(s.head, 100, y + step * 0.66);
        line(x, String(spreadOf(at) * 2), `400 $px ${STRONG}`, 29, 900, y + step * 0.66, 'right');
        pg.hits.push({ x: 84, y: y + 3, w: 832, h: step - 4, to: spreadOf(at) });
        y += step;
      });
      if (g.id === 'plants') {
        rule(x, 100, y, 800, 0.16);
        line(x, 'A plate of our plants', `400 $px ${STRONG}`, 33, 100, y + step * 0.66);
        line(x, String(plate * 2), `400 $px ${STRONG}`, 29, 900, y + step * 0.66, 'right');
        pg.hits.push({ x: 84, y: y + 3, w: 832, h: step - 4, to: plate });
        y += step;
      }
      y += 46;
    });
    return x.canvas;
  };
  const text = (s, i) => (pg) => {
    const x = sheet();
    const L = 112;
    const W = 776;
    x.fillStyle = GREEN;
    line(x, s.groupName, `400 $px ${STRONG}`, 29, L, 109);
    x.fillStyle = INK;
    backTo(x);
    rule(x, L, 152, W, 0.18);
    let px = 92;
    x.font = `400 ${px}px ${DISP}`;
    while (px > 60 && (wrap(x, s.head, W).length > 3 || wrap(x, s.head, W).some((l) => x.measureText(l).width > W))) x.font = `400 ${(px -= 3)}px ${DISP}`;
    let y = block(x, s.head, `400 $px ${DISP}`, px, px * 1.02, L - 4, 204, W + 8);
    y = block(x, s.stand, `400 $px ${DISP}`, 39, 50, L, y + 36, W - 40);
    // the story's own first lines, with a large first letter
    const body = s.open ?? '';
    const top = y + 54;
    const lead = 46;
    const room = Math.floor((PXH - 236 - top) / lead);
    if (body && room > 2) {
      x.fillStyle = GREEN;
      line(x, body[0], `400 $px ${DISP}`, 108, L - 4, top + 74);
      const cap = x.measureText(body[0]).width + 18;
      x.fillStyle = INK;
      x.font = `450 28px ${TEXT}`;
      const lines = [];
      let l = '';
      const bits = body.slice(1).split(' ').flatMap((w) => w.split(/(?<=[a-z]{2}-)(?=[a-z]{2})/).map((q, n) => [q, n > 0])); // a word may break at its own hyphen
      for (const [word, joined] of bits) {
        const t = l ? `${l}${joined ? '' : ' '}${word}` : word;
        if (x.measureText(t).width > W - (lines.length < 2 ? cap : 0)) {
          lines.push(l);
          l = word;
          if (lines.length >= room) break;
        } else l = t;
      }
      if (lines.length < room && l) lines.push(l);
      // set square to both margins, as a book is
      lines.forEach((ln, n) => {
        const ind = n < 2 ? cap : 0;
        const yy = top + 27 + n * lead;
        const end = n === lines.length - 1;
        if (end) {
          x.fillText(lines.length >= room ? `${ln.replace(/[,.;:]?$/, '')} …` : ln, L + ind, yy);
          return;
        }
        const ws = ln.split(' ');
        const gap = (W - ind - ws.reduce((a, w) => a + x.measureText(w).width, 0)) / Math.max(1, ws.length - 1);
        let xx = L + ind;
        if (gap > 34) x.fillText(ln, xx, yy);
        else ws.forEach((w) => { x.fillText(w, xx, yy); xx += x.measureText(w).width + gap; });
      });
    }
    rule(x, L, PXH - 138, W, 0.18);
    line(x, 'Read the whole story', `500 $px ${TEXT}`, 27, L, PXH - 84);
    const w = x.measureText('Read the whole story').width;
    x.fillStyle = GREEN;
    x.fillRect(L, PXH - 70, w, 3);
    x.fillStyle = INK;
    line(x, `${s.minutes} minute read`, `450 $px ${TEXT}`, 25, L + w + 34, PXH - 84);
    line(x, String(spreadOf(i) * 2 + 1), `400 $px ${STRONG}`, 27, L + W, PXH - 84, 'right');
    pg.hits = [BACK, { x: L - 16, y: PXH - 130, w: w + 32, h: 76, url: s.url }];
    return x.canvas;
  };
  // a plate from the plant pages
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
  const photo = (s, i) => async () => {
    const x = sheet();
    const img = await picture(s.img);
    const framed = i % 3 === 1; // now and then a picture stands in a margin, with its caption
    const [l, t, w, h] = framed ? [112, 112, 776, 980] : [0, 0, PXW, PXH];
    const k = Math.max(w / img.width, h / img.height);
    x.save();
    x.beginPath();
    x.rect(l, t, w, h);
    x.clip();
    x.drawImage(img, l + (w - img.width * k) / 2, t + (h - img.height * k) / 2, img.width * k, img.height * k);
    x.restore();
    img.close();
    if (framed) {
      block(x, s.alt ?? '', `450 $px ${TEXT}`, 24, 34, l, t + h + 34, 600, 2);
      line(x, String(spreadOf(i) * 2), `400 $px ${STRONG}`, 27, l + 0, PXH - 84);
    }
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
  const cutAt = Math.floor(groups.length / 2);
  // spreads: what faces you once so many sheets are over. 1 the title, 2 the contents, then the stories; the plants stand after their chapter
  const spreads = [null, { kind: 'title' }, { kind: 'contents' }];
  stories.forEach((st, i) => {
    spreads.push({ kind: 'story', i });
    if (st.group === 'plants' && stories[i + 1]?.group !== 'plants') spreads.push({ kind: 'plate' });
  });
  function spreadOf(i) { return spreads.findIndex((q) => q?.kind === 'story' && q.i === i); }
  const plate = spreads.findIndex((q) => q?.kind === 'plate');
  const page1 = new URL('./plants.html', document.baseURI).href;
  const INP = [['heart', 'Heart-leaf philodendron', 'Philodendron hederaceum'], ['marble', 'Marble queen', 'Epipremnum aureum'], ['sche', 'Dwarf umbrella', 'Heptapleurum arboricola'], ['spider', 'Spider plant', 'Chlorophytum comosum'], ['fern', 'Boston fern', 'Nephrolepis, sterile'], ['lily', 'Peace lily', 'Spathiphyllum']];
  const EXP = [['bulb', 'Bulbine', 'Bulbine frutescens'], ['spek', 'Spekboom', 'Portulacaria afra'], ['crass', 'Campfire crassula', 'Crassula capitella'], ['helich', 'Silver helichrysum', 'Helichrysum petiolare'], ['fescue', 'Blue fescue', 'Festuca glauca'], ['setc', 'Purple heart', 'Tradescantia pallida']];
  const leaves = { title: [endpaper, title], contents: [half(groups.slice(0, cutAt)), half(groups.slice(cutAt))], plate: [plants(INP, 'For a room', page1, false), plants(EXP, 'For the open air', `${page1}#exterior`, true)] };
  const faces = (q) => (q.kind === 'story' ? [photo(stories[q.i], q.i), text(stories[q.i], q.i)] : leaves[q.kind]);
  // each sheet: what is on its upper face, then on its back
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

  /* ---- the mesh of one sheet: two faces and four thin edges ---- */
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

  /* ---- the ribbon ---- */
  function ribbon() {
    const pts = [];
    const ix = [];
    for (let i = 0; i <= 90; i++) {
      pts.push(i / 90, -1, i / 90, 1);
      if (i) ix.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2);
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
    const c = new OffscreenCanvas(128, Math.round((128 * RIB_L) / 0.068));
    const x = c.getContext('2d');
    x.fillStyle = '#155141';
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#a1e815';
    x.fillRect(0, 0, 9, c.height);
    x.fillRect(119, 0, 9, c.height);
    for (let y = c.height - 250; y > 0; y -= 236) mark(x, 64, y, 74, ['#f4f1e8', '#a1e815']);
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
  // the place that was kept, by name, so that a new story never moves it
  const KEY = 'mw-ribbon';
  const nameOf = (k) => { const q = spreads[k]; return q?.kind === 'story' ? new URL(stories[q.i].url).pathname.split('/').pop() : q?.kind ?? null; };
  let kept = null;
  try { kept = localStorage.getItem(KEY); } catch { /* not allowed: the ribbon simply stays in the contents */ }
  const placeOf = () => { const k = kept ? spreads.findIndex((q, i) => q && nameOf(i) === kept) : -1; return k > 0 ? k : 2; };
  let ribAt = placeOf();
  let ribTo = ribAt;
  const pull = { x: 0, v: 0 };
  const hl = { x: 0, v: 0, rect: [0, 0, 0, 0], face: 0, sheet: -1, on: 0 };

  /* one turn per step: a pause on every spread, then the sheet goes over */
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
    // where the reader's eye is: over the cover, over the spread, or on phones over one page and then the other
    const opened = smooth(clamp(x));
    let cx = 0.5 * (1 - opened);
    if (narrow) {
      const f = q.f;
      const after = q.i + (f > 0.5 ? 1 : 0); // how many sheets are over once this turn has been made
      const side = after < 1 ? 0.5 : smooth(clamp((f - 0.04) / 0.22)) - 0.5;
      cx = q.i < 1 && f <= 0.5 ? 0.5 : f > 0.5 ? -0.5 : side;
    }
    const mx = follow(mouse.x, mouse.tx, dt, 420);
    const my = follow(mouse.y, mouse.ty, dt, 420);
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
    follow(hl, hl.on, dt, 160);
    gl.uniform4fv(u.uHl, hl.rect);
    // the sheet in the air, and the shade it throws
    const inAir = Math.floor(x);
    const a = x - inAir;
    const th = a * Math.PI;
    gl.uniform1f(u.uTip, Math.cos(th) + (Math.abs(Math.cos(th)) < 0.001 ? 0.001 : 0));
    gl.bindVertexArray(vao);
    const under = BOARD; // the back board lies beneath everything
    for (const [k, s] of sheets.entries()) {
      const g = k === N - 1 ? 0 : clamp(x - k);
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
    // the ribbon lies on top of the sheet that was kept, and goes over with it
    if (ribTo !== ribAt && pull.x > 0.985) ribAt = ribTo;
    follow(pull, ribTo !== ribAt ? 1 : 0, dt, 260);
    {
      const g = clamp(x - ribAt);
      const ang = g * Math.PI;
      const out = 0.046;
      const right = under + (N - 2 - ribAt) * TH + TH;
      const left = BOARD * 1.02 + ribAt * TH;
      const lift = Math.sin(ang) * out;
      const bow = 0.028 * (1 - g) * clamp((x - ribAt + 1) * 2 - 1); // a leaf at rest stands up a little beside the spine
      gl.useProgram(ribP.p);
      gl.uniformMatrix4fv(ribP.u.uVP, false, VP);
      gl.uniform3f(ribP.u.uAt, Math.cos(ang) * out, 0, right + (left - right) * smooth(g) + lift + (g < 0.5 ? bow : 0));
      gl.uniform1f(ribP.u.uDy, pull.x * 1.75);
      gl.uniform1f(ribP.u.uLay, 1);
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
    // which story is open
    const spread = Math.round(x);
    if (spread !== shown) {
      shown = spread;
      hl.on = 0;
      const q = spreads[spread];
      const s = q?.kind === 'story' ? stories[q.i] : null;
      sec.classList.toggle('has-story', !!s || spread === plate);
      sec.classList.toggle('is-open', spread > 0);
      at.textContent = s ? s.groupName : spread === 0 ? 'Scroll to open' : spread === 2 ? 'Contents' : spread === plate ? 'Plants' : '';
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

  /* ---- turning by hand ---- */
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
    toList.hidden = here < 1 || here === 2;
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
  // where on the book a hand is: which page, and where on the page
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
    // the tail of the ribbon, below the book
    const side0 = turn.x * ENDS > ribAt + 0.5 ? -0.076 : 0.076;
    if (Math.abs(x - side0) < 0.06 && y < -PH / 2 - 0.01 && y > -PH / 2 - 0.2) return { s: 0, tail: true };
    if (Math.abs(y) > PH / 2 || Math.abs(x) > 1.02 || (shown === 0 && x < 0)) return { s: 0 };
    const s = x > 0 ? 1 : -1;
    const sh = s > 0 ? shown : shown - 1;
    const px = (s > 0 ? x : 1 + x) * PXW;
    const py = (0.5 - y / PH) * PXH;
    const pg = sheets[sh]?.[s > 0 ? 'aPg' : 'bPg'];
    const hit = pg?.hits?.find((h) => px > h.x && px < h.x + h.w && py > h.y && py < h.y + h.h);
    return { s: shown === 0 ? 1 : s, hit, sh, face: s > 0 ? 0 : 1 };
  };
  let down = null;
  canvas.addEventListener('pointermove', (e) => {
    mouse.tx = e.clientX / page.w - 0.5;
    mouse.ty = e.clientY / page.h - 0.5;
    if (e.pointerType !== 'mouse' || !VP) return;
    const { s, hit, sh, face, tail } = spot(e);
    const word = tail ? (kept ? 'Your page' : 'Contents') : hit ? (hit.list ? 'Contents' : hit.url ? 'Read' : hit.by ? 'Turn' : '') : s ? (shown === 0 ? 'Open' : s > 0 && shown < ENDS ? 'Next' : s < 0 ? 'Back' : '') : '';
    if (word) canvas.dataset.cursor = word;
    else delete canvas.dataset.cursor;
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
      const { s, hit, tail } = spot(e);
      if (tail) goTo(placeOf());
      else if (hit?.list) goTo(2);
      else if (hit?.url) location.href = hit.url;
      else if (hit?.by) go(hit.by);
      else if (hit?.to) goTo(hit.to);
      else if (s) go(s);
    }
  });
  let lost = false;
  canvas.addEventListener('webglcontextlost', () => {
    lost = true;
    sec.classList.add('is-flat');
  });
  canvas.addEventListener('pointerleave', () => { hl.on = 0; });
  sec.style.setProperty('--turns', ENDS);
  sec.classList.add('is-ready');
  scene(sec, (dt, t, top, h) => {
    if (lost) return;
    const to = clamp(-top / Math.max(1, h - page.h));
    if (turn.x < 0) turn.x = to;
    draw(t, dt, follow(turn, to, dt, 190));
  });
}

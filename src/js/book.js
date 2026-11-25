/* The journal as a book. Cloth boards with the mark pressed into them, sheets that bend as they turn, real thickness,
   light that falls across the paper. Scrolling turns the pages; so do a click, a swipe and the arrow keys. Every page is
   set in the site's own type, and every story can also be reached as an ordinary link below the book. */
import { page, scene, follow, clamp, smooth, box } from './frame.js';
import { programs, picture, sized, slot } from './gl.js';

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
uniform sampler2D uA, uB; uniform vec3 uEye, uLight; uniform float uBoard, uOnA, uOnB, uShade, uTip, uLamp; uniform vec2 uGl;
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
  vec3 amb = mix(vec3(.10, .115, .11), vec3(.21, .205, .19), N.z * .5 + .5);
  vec3 c = col * (amb + vec3(1.22, 1.10, .92) * lit * fall * 1.5 * sh) + vec3(1.2, 1.05, .82) * sp * fall * sh;
  c *= uLamp;
  c = c * (c * 2.51 + .03) / (c * (c * 2.43 + .59) + .14);
  o = vec4(pow(c, vec3(1. / 2.2)) + (hash(gl_FragCoord.xy) - .5) / 200., 1.);
}`;
const DESK_VS = `#version 300 es
layout(location=0) in vec2 aP; uniform mat4 uVP; out vec2 vP; void main(){ vP = aP * 9.; gl_Position = uVP * vec4(vP, -.004, 1.); }`;
const DESK_FS = `#version 300 es
precision highp float; in vec2 vP; uniform vec3 uLight; uniform float uOpenL, uOpenR, uLamp, uHi; out vec4 o;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float edge(vec2 p, vec2 lo, vec2 hi){ vec2 c = (lo + hi) * .5, h = (hi - lo) * .5; vec2 d = abs(p - c) - h; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
void main(){
  // smoked oak, waxed
  float wp = noise(vec2(vP.x * .5, vP.y * 1.3)) * 2.2;
  float plank = floor(vP.y / 1.15 + .5); float py = vP.y / 1.15 + .5 - plank;
  float gr = noise(vec2(vP.x * 1.1 + plank * 17., (vP.y + wp * .05) * 26.)) * .55 + noise(vec2(vP.x * 3. + plank * 9., vP.y * 90.)) * .3 + noise(vec2(vP.x * 9., vP.y * 300.)) * .15;
  vec3 col = mix(vec3(.013, .0105, .0085), vec3(.037, .028, .021), gr) * (.85 + .3 * hash(vec2(plank, 4.)));
  col *= 1. - smoothstep(.012, .0, min(py, 1. - py)) * .75;
  vec3 L = uLight - vec3(vP, 0.); float fall = 1. / (1. + dot(L, L) * .085);
  float d = 1e3;
  if (uOpenR > .0) d = min(d, edge(vP, vec2(0., -.70), vec2(1.02, .70)));
  if (uOpenL > .0) d = min(d, edge(vP, vec2(-1.02 * uOpenL, -.70), vec2(0., .70)));
  float con = exp(-max(d, 0.) * 15.) * .72 + exp(-max(edge(vP + vec2(-.10, .12), vec2(-1.02 * uOpenL, -.70), vec2(1.02 * uOpenR, .70)), 0.) * 4.2) * .55;
  vec3 c = col * (vec3(.05, .055, .052) + vec3(1.2, 1.02, .76) * fall * normalize(L).z * 2.1) * (1. - clamp(con, 0., .93)) * uLamp;
  c = c * (c * 2.51 + .03) / (c * (c * 2.43 + .59) + .14);
  o = vec4(pow(c, vec3(1. / 2.2)) + (hash(gl_FragCoord.xy + 2.) - .5) / 180., 1.);
}`;

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
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  const making = programs(gl, [[PAGE_VS, PAGE_FS], [DESK_VS, DESK_FS]], 'book');
  making.catch(() => {});
  const css = getComputedStyle(document.documentElement);
  const fam = (v, d) => css.getPropertyValue(v).trim() || d;
  const DISP = fam('--disp', 'serif');
  const STRONG = fam('--strong', 'serif');
  const TEXT = fam('--font', 'sans-serif');
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
    const k = w / 1526;
    x.translate(cx - w / 2, cy - (1140 * k) / 2);
    x.scale(k, k);
    x.translate(-235, -100);
    document.querySelectorAll('.foot__mark path').forEach((p) => {
      const path = new Path2D(p.getAttribute('d'));
      const c = /lg-(m|leg)/.test(p.getAttribute('class') ?? '') ? fills[0] : fills[1];
      x.strokeStyle = x.fillStyle = c;
      if (p.getAttribute('stroke-width')) {
        x.lineWidth = p.getAttribute('stroke-width');
        x.lineCap = 'round';
        x.lineJoin = 'round';
        x.stroke(path);
      } else x.fill(path);
    });
    x.restore();
  };
  const cover = (back) => {
    const c = new OffscreenCanvas(PXW, PXH);
    const x = c.getContext('2d');
    x.clearRect(0, 0, PXW, PXH);
    x.fillStyle = 'rgba(0,0,0,.004)';
    x.fillRect(0, 0, PXW, PXH);
    if (back) mark(x, PXW / 2, PXH * 0.86, 120, ['#e9e6dc', '#a0e515']);
    else {
      x.shadowBlur = 5;
      x.shadowColor = 'rgba(255,255,255,.9)';
      mark(x, PXW / 2, PXH * 0.4, 470, ['#f1eee4', '#a0e515']);
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
  const contents = () => {
    const x = sheet();
    block(x, 'Journal', `400 $px ${DISP}`, 132, 130, 96, 110, 820);
    x.globalAlpha = 0.8;
    block(x, 'Short reads on walls, rooms and the plants that share them.', `450 $px ${TEXT}`, 30, 46, 100, 300, 620);
    x.globalAlpha = 1;
    let y = 452;
    stories.forEach((s, i) => {
      x.globalAlpha = 0.18;
      x.fillRect(100, y - 30, 800, 1.5);
      x.globalAlpha = 1;
      y = Math.max(y + 76, block(x, s.head, `400 $px ${STRONG}`, 31, 37, 100, y - 4, 690, 2) + 22);
      x.font = `450 25px ${TEXT}`;
      x.textAlign = 'right';
      x.fillText(String(i * 2 + 2), 900, y - 60);
      x.textAlign = 'left';
    });
    return x.canvas;
  };
  const text = (s, i) => {
    const x = sheet();
    x.globalAlpha = 0.72;
    block(x, `${s.topic}, ${s.minutes} minute read`, `450 $px ${TEXT}`, 27, 34, 108, 118, 760);
    x.globalAlpha = 1;
    let size = 104;
    x.font = `400 ${size}px ${DISP}`;
    while (size > 64 && (wrap(x, s.head, 790).length > 5 || wrap(x, s.head, 790).some((l) => x.measureText(l).width > 795))) {
      size -= 4;
      x.font = `400 ${size}px ${DISP}`;
    }
    let y = block(x, s.head, `400 $px ${DISP}`, size, size * 1.04, 104, 196, 790);
    x.globalAlpha = 0.9;
    y = block(x, s.stand, `500 $px ${TEXT}`, 34, 52, 108, y + 44, 760);
    x.globalAlpha = 1;
    x.fillStyle = '#7fb512';
    x.fillRect(108, y + 34, 92, 4);
    x.fillStyle = INK;
    // the story's own first lines, with a large first letter
    const body = s.open ?? '';
    const top = y + 86;
    const room = Math.floor((PXH - 150 - top) / 45);
    if (body && room > 2) {
      x.font = `400 132px ${DISP}`;
      x.fillText(body[0], 102, top + 98);
      const cap = x.measureText(body[0]).width + 24;
      x.font = `450 29px ${TEXT}`;
      let line = '';
      let n = 0;
      const put = (last) => {
        const ind = n < 2 ? cap : 0;
        x.fillText(last && n >= room - 1 ? `${line.replace(/[,.;:]?$/, '')} …` : line, 108 + ind, top + 27 + n * 45);
        n++;
      };
      for (const word of body.slice(1).split(' ')) {
        const t = line ? `${line} ${word}` : word;
        if (x.measureText(t).width > 770 - (n < 2 ? cap : 0)) {
          put(n === room - 1);
          line = word;
          if (n >= room) break;
        } else line = t;
      }
      if (n < room) put();
    }
    x.font = `450 25px ${TEXT}`;
    x.textAlign = 'right';
    x.fillText(String(i * 2 + 2), 892, PXH - 76);
    return x.canvas;
  };
  const photo = async (s) => {
    const x = sheet();
    const img = await picture(s.img);
    const k = Math.max(PXW / img.width, PXH / img.height);
    x.drawImage(img, (PXW - img.width * k) / 2, (PXH - img.height * k) / 2, img.width * k, img.height * k);
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
  // each sheet: what is on its upper face, then on its back
  const sheets = [{ board: 1, a: () => cover(false), b: endpaper }];
  sheets.push({ a: contents, b: () => photo(stories[0]) });
  for (let i = 0; i < M; i++) sheets.push({ a: () => text(stories[i], i), b: i + 1 < M ? () => photo(stories[i + 1]) : last });
  sheets.push({ board: 2, a: endpaper, b: () => cover(true) });
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
      c = await s[k]();
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

  const [pageP, deskP] = await making;
  await Promise.all([print(sheets[0], 'a'), print(sheets[0], 'b'), print(sheets[1], 'a')]);
  const size = sized(canvas, 2);
  const turn = { x: -1, v: 0 };
  const eye = { x: { x: 0.5, v: 0 }, y: { x: 0, v: 0 }, d: { x: 3, v: 0 }, t: { x: 0, v: 0 } };
  const mouse = { tx: 0, ty: 0, x: { x: 0, v: 0 }, y: { x: 0, v: 0 } };
  let VP = null;
  let shown = -1;
  let lamp = 0;

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
      const near = k > x - 2.6 && k < x + 3.4;
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
    const need = Math.max((PH * (narrow ? 1.28 : 1.46)) / (2 * Math.tan(fov / 2)), wide / (2 * Math.tan(fov / 2) * asp));
    const d = follow(eye.d, need, dt, 420);
    const ex = follow(eye.x, cx, dt, narrow ? 230 : 380);
    const lift = 0.22 + 0.10 * (1 - opened);
    const e = [ex + mx * 0.16, -d * Math.sin(lift) + my * -0.12, d * Math.cos(lift)];
    VP = mul(persp(fov, asp, 0.1, 30), look(e, [ex, narrow ? 0.0 : -0.012, 0]));
    lamp += (1 - lamp) * (1 - Math.exp(-dt / 900));
    const light = [-0.75 + mx * 0.6, 1.25 - my * 0.4, 2.1];
    gl.viewport(0, 0, cw, ch);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(deskP.p);
    gl.uniformMatrix4fv(deskP.u.uVP, false, VP);
    gl.uniform3fv(deskP.u.uLight, light);
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
      gl.uniform1f(u.uOnA, s.aT ? s.aOn : 0);
      gl.uniform1f(u.uOnB, s.bT ? s.bOn : 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, s.aT ?? blank);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, s.bT ?? blank);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    }
    // which story is open
    const spread = Math.round(x);
    if (spread !== shown) {
      shown = spread;
      const s = stories[spread - 2];
      sec.classList.toggle('has-story', !!s);
      sec.classList.toggle('is-open', spread > 0);
      at.textContent = s ? `${spread - 1} of ${M}` : spread === 0 ? 'Scroll to open' : spread === 1 ? 'Contents' : '';
      if (s) {
        open.href = s.url;
        open.setAttribute('aria-label', `Read: ${s.head}`);
      }
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
  const side = (e) => {
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = 1 - ((e.clientY - r.top) / r.height) * 2;
    const pt = (x, y) => {
      const c = [0, 1, 3].map((k) => VP[k] * x + VP[4 + k] * y + VP[12 + k]);
      return [c[0] / c[2], c[1] / c[2]];
    };
    const l = pt(-1, 0)[0];
    const m = pt(0, 0)[0];
    const rr = pt(1, 0)[0];
    const [, top] = pt(0, PH / 2);
    const [, foot] = pt(0, -PH / 2);
    if (ny > top || ny < foot || nx > rr || nx < l) return 0;
    if (shown === 0) return nx > m ? 1 : 0;
    return nx > m ? 1 : -1;
  };
  let down = null;
  canvas.addEventListener('pointermove', (e) => {
    mouse.tx = e.clientX / page.w - 0.5;
    mouse.ty = e.clientY / page.h - 0.5;
    if (e.pointerType !== 'mouse' || !VP) return;
    const s = side(e);
    if (s) canvas.dataset.cursor = shown === 0 ? 'Open' : s > 0 && shown < ENDS ? 'Next' : s < 0 ? 'Back' : '';
    if (!s || !canvas.dataset.cursor) delete canvas.dataset.cursor;
  }, { passive: true });
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || !VP) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    down = null;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
    else if (Math.hypot(dx, dy) < 8) {
      const s = side(e);
      if (s) go(s);
    }
  });
  let lost = false;
  canvas.addEventListener('webglcontextlost', () => {
    lost = true;
    sec.classList.add('is-flat');
  });
  sec.style.setProperty('--turns', ENDS);
  sec.classList.add('is-ready');
  scene(sec, (dt, t, top, h) => {
    if (lost) return;
    const to = clamp(-top / Math.max(1, h - page.h));
    if (turn.x < 0) turn.x = to;
    draw(t, dt, follow(turn, to, dt, 190));
  });
}

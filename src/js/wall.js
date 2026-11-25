/* Modiwall living wall: one continuous photographic surface, joined from photos of real planted Modiwalls.
   The photo's own light gives its depth, and depth drives everything: wind, parallax, the lamp, and a leaf-shaped
   edge wherever the planting stops. One quad per wall; no libraries. */

const MAX_CELLS = 220;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const STYLE_NAMES = ['forest', 'fern', 'jungle'];

const VS = `#version 300 es
layout(location=0) in vec2 aQ;
void main(){ gl_Position = vec4(aQ * 2. - 1., 0., 1.); }`;

const FS = `#version 300 es
precision highp float;
uniform vec2 uRes, uOrigin, uGrid, uTexSize, uPar;
uniform float uDpr, uM, uT, uGust, uTilt, uK, uAmb;
uniform vec3 uPtr, uTint;
uniform vec3 uRip[4];
uniform vec4 uLamp; // x, y, reach, on
uniform sampler2D uTex, uCells;
out vec4 o;
float lum(vec2 uv, float l){ return dot(textureLod(uTex, uv, l).rgb, vec3(.3, .59, .11)); }
float depth(vec2 uv){ return clamp((lum(uv, 2.6) * .45 + lum(uv, 4.) * .55) * 2., 0., 1.); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 q = (px - uOrigin) / uM;
  // planting state: r how far grown, g panel in place
  vec4 cell = texture(uCells, q / uGrid);
  vec2 in2 = step(vec2(-.5), q) * step(q, uGrid + .5);
  float inside = in2.x * in2.y;
  vec2 fade = smoothstep(vec2(-.55), vec2(.35), q) * smoothstep(vec2(-.55), vec2(.35), uGrid - q);
  float grown = cell.r * inside * fade.x * fade.y;

  vec2 base = px * uK / uTexSize;
  float d0 = depth(base);
  // wind: slow swells across the wall, small independent tremble per plant
  float plant = noise(px * uK / 46.);
  vec2 w = vec2(sin(uT*.62 - px.x*.006 + px.y*.0032) * (.6 + .4*sin(uT*.23 + px.x*.002)), .35 * sin(uT*.5 + px.y*.008)) * 2.1;
  w += vec2(sin(uT*1.5 + plant*18.), cos(uT*1.23 + plant*23.)) * (.7 + uGust * 2.4);
  w.x += uTilt * 46. + uGust * 3. * sin(uT*3.1 + px.y*.012);
  vec2 pd = px - uPtr.xy;
  float pf = exp(-dot(pd, pd) / (uM * uM * .8)) * uPtr.z;
  w += normalize(pd + .01) * pf * 9.;
  float glow = exp(-dot(pd, pd) / (uM * uM * 3.4)) * uPtr.z * .34;
  for (int i = 0; i < 4; i++) {
    float age = uT - uRip[i].z;
    if (uRip[i].z > 0. && age < 2.8) {
      vec2 r = px - uRip[i].xy; float k = (length(r) - age * uM * 2.3) / (uM * .55);
      k = exp(-k*k) * (1. - age / 2.8);
      w += normalize(r + .01) * k * 10.; glow += k * .2;
    }
  }
  vec2 disp = (w * (.25 + d0) + uPar * 34. * (d0 - .38)) * uK;
  vec2 uv = base - disp / uTexSize;
  vec3 col = texture(uTex, uv, -.6).rgb;
  float d = depth(uv);
  // surface direction from depth, for the lamp and the passing sun
  vec2 e = 9. / uTexSize;
  vec2 n = vec2(depth(uv - vec2(e.x, 0.)) - depth(uv + vec2(e.x, 0.)), depth(uv - vec2(0., e.y)) - depth(uv + vec2(0., e.y))) * .8;

  // leaves nearest the viewer arrive first and reach furthest past the edge
  float fine = clamp((lum(uv, 1.2) * .6 + lum(uv, 2.8) * .4) * 2., 0., 1.);
  float reach = clamp(d * .42 + fine * .5 + (noise(px * uK / 70.) - .5) * .42 + .06, 0., 1.);
  float g2 = smoothstep(.2, 1., grown);
  float th = 1. - g2 * 1.55;
  float a = smoothstep(th - .05, th + .05, reach) * step(.01, g2);

  float beam = (px.x*.62 + px.y*.78 - mod(uT * uM * .34, uRes.x + uRes.y + uM*8.) + uM*4.) / (uM * 2.7);
  float sun = exp(-beam*beam);
  float face = dot(n, normalize(vec2(-.6, -.8)));
  col *= 1.1 + glow * 1.2 + sun * (.26 + face * .5);

  // light: ambient, then one warm lamp
  vec2 ld = px - uLamp.xy;
  float fall = uLamp.w / (1. + dot(ld, ld) / (uLamp.z * uLamp.z) * 1.35);
  float lf = clamp(.78 + dot(n, -normalize(ld + .01)) * .8 + d * .3, .3, 1.35);
  vec3 light = vec3(uAmb) * mix(vec3(.55, .78, 1.15), vec3(1.), uAmb) + vec3(1.5, 1.2, .8) * fall * lf;
  col *= light;
  col = col / (1. + max(col - .72, 0.) * .9);
  // toward the edge the planting turns away from the light
  col *= mix(.72, 1., smoothstep(th, th + .4, reach + g2 * .5));
  col = clamp(col, 0., 1.);
  col = mix(col, col * col * (3. - 2. * col), .1) * uTint;

  // shade on the wall behind, and the black panel before it fills
  vec2 sq = (px - vec2(8., 18.) - uOrigin) / uM;
  vec2 sf = smoothstep(vec2(-.6), vec2(.5), sq) * smoothstep(vec2(-.6), vec2(.5), uGrid - sq);
  float sh = smoothstep(.25, 1.1, texture(uCells, sq / uGrid).r * sf.x * sf.y) * .26 * uAmb;
  vec2 f = fract(q);
  float seam = smoothstep(0., .012, min(min(f.x, f.y), min(1. - f.x, 1. - f.y)));
  vec4 own = texelFetch(uCells, ivec2(clamp(floor(q), vec2(0.), uGrid - 1.)), 0);
  float panel = own.g * step(0., q.x) * step(0., q.y) * step(q.x, uGrid.x) * step(q.y, uGrid.y) * (1. - smoothstep(.12, .62, own.r));
  vec3 pc = mix(vec3(.02, .03, .027), vec3(.07, .095, .085), seam) * (.4 + .6 * uAmb) * (.75 + .25 * step(.5, fract(q.x * 20.)));
  vec4 under = vec4(pc, 1.) * panel;
  under += vec4(.015, .05, .035, 1.) * sh * (1. - panel);
  o = vec4(clamp(col, 0., 1.), 1.) * a + under * (1. - a);
}`;

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
  return u;
}
const breathe = () => new Promise((r) => { setTimeout(r, 0); });

/* wall photographs: the smaller cut on small screens; each is fetched once */
const photos = {};
export const wallPhoto = (name) => (photos[name] ??= (async () => {
  const img = new Image();
  const small = innerWidth * Math.min(2, devicePixelRatio || 1) < 1500;
  img.src = new URL(`../img/wall/${name}${small ? '-s' : ''}.avif`, import.meta.url).href;
  await img.decode();
  return img;
})());

/* ------------------------------------------------------------------ engine */
export async function createWall(canvas, { style = 0, leaf = 0 } = {}) {
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  // Compilation starts now and is only checked once the driver is done, so the page never waits for it.
  const prog = compile(gl, VS, FS);
  const ext = gl.getExtension('KHR_parallel_shader_compile');
  const tex = {};
  const upload = async (name) => {
    if (tex[name]) return tex[name];
    const img = await wallPhoto(name);
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    tex[name] = { t, w: img.naturalWidth, h: img.naturalHeight };
    return tex[name];
  };
  let face = await upload(STYLE_NAMES[style]);
  await breathe();
  while (ext && !gl.getProgramParameter(prog, ext.COMPLETION_STATUS_KHR)) await breathe();
  const u = finish(gl, prog);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const cellTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, cellTex);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);

  const born = new Float32Array(MAX_CELLS).fill(-1);
  const gone = new Float32Array(MAX_CELLS);
  let bytes = new Uint8Array(4);
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
    tint: [1, 1, 1],
    planted: [],
    now: () => (performance.now() - t0) / 1000,
    async style(i) {
      face = await upload(STYLE_NAMES[i]);
    },
    /* returns true when the grid changed and must be planted again */
    place(next) {
      Object.assign(W.L, next);
      const { cols, rows } = W.L;
      const key = `${cols}x${rows}`;
      if (key === built) return false;
      built = key;
      bytes = new Uint8Array(cols * rows * 4);
      gl.bindTexture(gl.TEXTURE_2D, cellTex);
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
      if (on) {
        born[i] = reduced ? -100 : W.now() + delay;
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
      if (!settled) {
        settled = true;
        const n = L.cols * L.rows;
        for (let i = 0; i < n; i++) {
          let g = 0;
          let pnl = 0;
          if (born[i] !== -1) {
            const t = Math.max(0, now - born[i]);
            const k = Math.min(1, Math.max(0, (t - 0.25) / 2.6));
            g = 1 - (1 - k) ** 2.4;
            pnl = Math.min(1, t / 0.4);
            if (gone[i]) {
              const out = Math.max(0, 1 - (now - gone[i]) / 0.7);
              g *= out * out;
              pnl *= out;
              if (out > 0) settled = false;
            } else if (k < 1) settled = false;
          }
          bytes[i * 4] = g * 255;
          bytes[i * 4 + 1] = pnl * 255;
        }
        gl.bindTexture(gl.TEXTURE_2D, cellTex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, L.cols, L.rows, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
      }
      gl.viewport(0, 0, cw, ch);
      gl.disable(gl.BLEND);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, face.t);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, cellTex);
      gl.uniform1i(u.uTex, 0);
      gl.uniform1i(u.uCells, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform2f(u.uRes, L.w, L.h);
      gl.uniform1f(u.uDpr, cw / L.w);
      gl.uniform2f(u.uOrigin, L.ox, L.oy);
      gl.uniform2f(u.uGrid, L.cols, L.rows);
      // texture pixels to one CSS pixel: leaves keep a believable size against the panel
      // stay inside the photograph, so its mirrored repeat is never seen
      const fit = leaf ? Math.min((face.h * 0.97) / (L.oy + L.rows * L.m), (face.w * 0.97) / (L.ox + L.cols * L.m)) : Math.min((face.h * 0.98) / L.h, (face.w * 0.98) / L.w);
      const K = (leaf ? 62 / (leaf * L.m) : innerWidth < 700 ? 1.9 : 1.22) * (face.w / 2048);
      gl.uniform1f(u.uK, K > fit && K < fit * 2.2 ? fit : K);
      gl.uniform2f(u.uTexSize, face.w, face.h);
      gl.uniform1f(u.uM, L.m);
      gl.uniform1f(u.uT, now);
      gl.uniform1f(u.uGust, W.gust);
      gl.uniform1f(u.uTilt, W.tilt);
      gl.uniform2f(u.uPar, W.par.x, W.par.y);
      gl.uniform3f(u.uPtr, W.ptr.x, W.ptr.y, W.ptr.s);
      gl.uniform3fv(u.uRip, rip);
      gl.uniform4f(u.uLamp, W.lamp.x, W.lamp.y, W.lamp.r, W.lamp.on);
      gl.uniform1f(u.uAmb, W.amb);
      gl.uniform3fv(u.uTint, W.tint);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    /* runs only while `watch` is on screen; lowers resolution if frames are slow */
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
          if (avg > 21 && maxDpr > 0.75) {
            maxDpr = Math.max(0.75, Math.min(maxDpr, devicePixelRatio || 1) - 0.35);
            avg = 12;
            frames = 0;
          }
        }
        const ease = 1 - Math.exp(-dt / 320);
        W.par.x += ((W.parTo?.x ?? 0) - W.par.x) * ease;
        W.par.y += ((W.parTo?.y ?? 0) - W.par.y) * ease;
        W.ptr.s += (W.ptr.target - W.ptr.s) * (1 - Math.exp(-dt / 220));
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

/* phones: the leaves lean as the phone is tilted (only where no permission prompt is needed) */
function tilt(W) {
  if (reduced || !matchMedia('(pointer: coarse)').matches || typeof DeviceOrientationEvent === 'undefined' || DeviceOrientationEvent.requestPermission) return;
  addEventListener('deviceorientation', (e) => {
    W.tiltTo = Math.max(-0.22, Math.min(0.22, (e.gamma || 0) / 130));
  }, { passive: true });
}

/* ------------------------------------------------------------------ hero */
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
    const inRows = Math.max(3, Math.round(sr.height / (small ? 108 : 150)));
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
    const first = new Set(inside.slice(0, Math.round(inside.length * (small ? 0.86 : 0.8))));
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
  // links under the grown wall: bring them back into view if someone tabs to them
  hero.querySelector('[data-copy]').addEventListener('focusin', () => {
    if (hero.classList.contains('is-grown')) scrollTo({ top: pin.offsetTop, behavior: 'instant' });
  });
  layout();
  let timer;
  let seenW = innerWidth;
  new ResizeObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      // phone address bars change the height while scrolling: only a change of width replants
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

/* ------------------------------------------------------------------ strip along the foot of a page */
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

/* ------------------------------------------------------------------ a wall for the visualiser */
export async function frameWall(canvas, watch) {
  const W = await createWall(canvas, { leaf: 0.2 });
  let shown = 0;
  W.run(watch);
  return {
    W,
    async set({ cols, rows, m, pad, style }) {
      const fresh = W.place({ w: cols * m + pad * 2, h: rows * m + pad * 2, cols, rows, m, ox: pad, oy: pad });
      if (style !== shown) {
        shown = style;
        await W.style(style);
      }
      if (fresh) for (let i = 0; i < cols * rows; i++) W.plant(i, true, ((i % cols) + (rows - 1 - Math.floor(i / cols))) * 0.12);
      if (reduced) W.draw();
    },
  };
}

/* ------------------------------------------------------------------ a wall planted by scrolling: returns grow(0..1) */
export async function scrollWall(canvas) {
  const W = await createWall(canvas);
  let order = [];
  let shown = -1;
  const layout = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const rows = Math.max(4, Math.round(h / (w < 700 ? 110 : 150)));
    const m = h / rows;
    const cols = Math.min(Math.floor(MAX_CELLS / rows), Math.ceil(w / m));
    if (W.place({ w, h, cols, rows, m, ox: 0, oy: 0 })) {
      order = [...Array(cols * rows).keys()].sort((a, b) => {
        const cost = (i) => (cols - (i % cols)) * 0.9 + (rows - Math.floor(i / cols)) * 0.7 + Math.sin(i * 12.9) * 0.9;
        return cost(a) - cost(b);
      });
      shown = -1;
    }
  };
  layout();
  new ResizeObserver(layout).observe(canvas);
  pointer(W, canvas.closest('section'), canvas);
  W.run(canvas);
  return (p) => {
    const goal = Math.round(p * order.length);
    if (goal === shown) return;
    shown = goal;
    order.forEach((i, k) => W.plant(i, k < goal));
  };
}

/* ------------------------------------------------------------------ after dark: a wall lit by one lamp */
export async function nightWall(sec) {
  const canvas = sec.querySelector('[data-wall]');
  const stage = sec.querySelector('[data-stage]');
  const lamp = sec.querySelector('[data-lamp]');
  const sw = sec.querySelector('[data-switch]');
  const W = await createWall(canvas);
  let on = false;
  let level = 0;
  let x = 0.5; // lamp position across the stage, 0 to 1
  let vx = 0;
  let swing = 0;
  let vs = 0;
  let drag = null;
  W.amb = 0.07;

  function layout() {
    const hr = sec.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    const rows = Math.max(3, Math.round(sr.height / (hr.width < 700 ? 110 : 150)));
    const m = sr.height / rows;
    const cols = Math.min(Math.floor(MAX_CELLS / rows), Math.ceil(sr.width / m));
    if (W.place({ w: hr.width, h: hr.height, cols, rows, m, ox: sr.right - hr.left - cols * m, oy: sr.top - hr.top })) {
      for (let i = 0; i < cols * rows; i++) W.plant(i, true, 0);
    }
  }
  const set = (v) => {
    on = v;
    sw.setAttribute('aria-pressed', v);
    sec.classList.toggle('is-lit', v);
    vs += (Math.random() < 0.5 ? -1 : 1) * 0.0016; // the pull of the cord sets it swinging
    if (reduced) {
      level = v ? 1 : 0;
      apply();
      W.draw();
    }
  };
  function apply() {
    const hr = sec.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    const px = sr.left - hr.left + sr.width * x;
    const drop = lamp.offsetHeight;
    const lx = px + Math.sin(swing) * drop;
    const ly = Math.cos(swing) * drop;
    lamp.style.transform = `translateX(${px.toFixed(1)}px) rotate(${(-swing * 57.3).toFixed(2)}deg)`;
    W.lamp = { x: lx, y: ly + 20, r: Math.min(sr.width, sr.height) * 0.46, on: level * 1.15 };
    W.amb = 0.07 + level * 0.16;
    sec.style.setProperty('--lit', level.toFixed(3));
    sec.style.setProperty('--lx', `${lx.toFixed(1)}px`);
    sec.style.setProperty('--ly', `${ly.toFixed(1)}px`);
  }
  sw.addEventListener('click', () => set(!on));
  lamp.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, from: x, moved: 0 };
    lamp.setPointerCapture(e.pointerId);
  });
  lamp.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const d = e.clientX - drag.x;
    drag.moved = Math.max(drag.moved, Math.abs(d));
    const nx = Math.min(0.95, Math.max(0.05, drag.from + d / stage.offsetWidth));
    vs -= (nx - x) * 0.012;
    x = nx;
  });
  lamp.addEventListener('pointerup', () => {
    if (drag && drag.moved < 6) set(!on);
    drag = null;
  });
  lamp.addEventListener('pointercancel', () => { drag = null; });
  pointer(W, sec, sec);
  layout();
  apply();
  new ResizeObserver(() => {
    layout();
    apply();
  }).observe(stage);
  W.run(sec, (dt) => {
    // warm filament: quick to rise, slower to fade
    level += ((on ? 1 : 0) - level) * (1 - Math.exp(-dt / (on ? 240 : 420)));
    const steps = Math.max(1, Math.round(dt / 8));
    for (let k = 0; k < steps; k++) {
      vs += (-swing * 0.00022 - vs * 0.006) * (dt / steps);
      swing += vs * (dt / steps);
    }
    swing = Math.max(-0.5, Math.min(0.5, swing));
    x += vx;
    W.ptr.target = 0; // here the lamp is the light, not the pointer
    apply();
  });
  sec.classList.add('wall-ready');
}

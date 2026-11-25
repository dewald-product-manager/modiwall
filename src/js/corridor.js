/* The walk: a real corridor in WebGL2. Photos hang on both sides under picture lights, living walls fill the
   bays between them, the stone floor reflects it all, pollen drifts in the light. Scroll walks you through;
   the camera slows and turns to each wall as you reach it, so it frames well on any screen. */
import { wallPhoto } from './wall.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const GAP = 3.6; // metres between stops
const HALF = 2.15; // half width of the corridor
const FLOOR = -1.35;
const ROOF = 1.75;
const NEAR = 0.05;
const FAR = 34;

const WALL_VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec2 aUv;
uniform mat4 uVP; uniform float uFlip;
out vec3 vP; out vec2 vUv;
void main(){ vP = aP; vUv = aUv; vec3 p = aP; if (uFlip > .5) p.y = ${(FLOOR * 2).toFixed(2)} - p.y; gl_Position = uVP * vec4(p, 1.); }`;

const COMMON = `
precision highp float;
const vec3 FOG = vec3(.013, .03, .024);
uniform vec3 uCam; uniform float uT, uFlip, uEnd, uDim;
float fogOf(vec3 p){ return 1. - exp(-pow(distance(p, uCam) * .062, 1.6)); }
vec3 tone(vec3 c){ return c / (1. + max(c - .8, 0.) * .85); }
`;

/* side walls, ceiling, end wall: kind 0 side, 1 ceiling, 2 end */
const WALL_FS = `#version 300 es
${COMMON}
in vec3 vP; in vec2 vUv;
uniform sampler2D uTex; uniform int uKind; uniform float uStops, uSide; uniform vec2 uTexSize;
out vec4 o;
float lum(vec2 uv, float l){ return dot(textureLod(uTex, uv, l).rgb, vec3(.3, .59, .11)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 5.1; a *= .5; } return v; }
vec3 plants(vec2 w, vec3 view, float cx, float fx){
  vec2 uv = vec2(cx + w.x * fx * .205, .02 + (1.75 - w.y) * .31);
  float d = clamp((lum(uv, 3.) + lum(uv, 4.4)) * 1.05, 0., 1.);
  uv += vec2(sin(uT*.6 + w.x*1.7 + w.y*.8), cos(uT*.5 + w.x*1.3)) * .0011 * (.3 + d);
  uv -= view.xy * (d - .4) * .012;
  vec3 c = texture(uTex, uv, -.7).rgb;
  c = mix(vec3(dot(c, vec3(.3, .59, .11))), c, .82) * vec3(.9, 1., .92);
  return c * (.72 + .75 * d);
}
void main(){
  float lod = uFlip > .5 ? 1. : 0.;
  vec3 col; float fog = fogOf(vP);
  if (uKind == 1) {
    float slot = smoothstep(.17, .145, abs(vP.x));
    float spill = exp(-pow(abs(vP.x) / .62, 2.));
    col = vec3(.02, .023, .02) + vec3(1., .86, .62) * spill * .07 + vec3(1.5, 1.28, .95) * slot * (.72 + .05 * sin(vP.z * 3.));
  } else if (uKind == 2) {
    vec2 w = vP.xy;
    col = plants(w * vec2(.9, 1.), vec3(0.), .5, 1.) * 1.1;
    float l = exp(-dot(w - vec2(0., .2), w - vec2(0., .2)) * .22);
    col *= vec3(1.4, 1.2, .9) * l * 2.3 + .18;
  } else {
    float z = -vP.z;                                  // distance along the corridor
    float i = floor(z / ${GAP.toFixed(2)} + .5);
    float mine = step(.5, 1. - abs(mod(i, 2.) - (uSide > 0. ? 1. : 0.))) * step(.5, i + .6) * step(i, uStops - .5);
    float dz = z - i * ${GAP.toFixed(2)};
    // plaster: dark, trowelled
    vec2 pw = vec2(z * 1.6, vP.y * 2.2);
    float tr = fbm(pw + fbm(pw * .7) * .9) * .8 + fbm(pw * 6.) * .3 + noise(pw * 46.) * .06;
    col = vec3(.088, .09, .078) * (.5 + tr * .85);
    // picture light: a soft cone down the wall around each photo
    float drop = max(1.72 - vP.y, 0.);                  // each photo is washed from a spot in the ceiling
    float wide = .34 + drop * .52;
    float cone = exp(-pow(abs(dz) / wide, 2.6)) * exp(-drop * .34) * smoothstep(0., .2, drop);
    col += col * vec3(21., 16., 10.4) * cone * mine * (1. - uDim * .4);
    // the frame's soft shadow
    vec2 fr = abs(vec2(dz, vP.y - .1)) - vec2(1.18, .86);
    col *= 1. - mine * .45 * exp(-max(length(max(fr, 0.)) * 7., 0.));
    // living bays between the photos on this side
    float bay = 1. - mine;
    float ci = .3 + .4 * hash(vec2(i, uSide)), fx = hash(vec2(i, uSide + 4.)) > .5 ? 1. : -1.;
    vec2 buv = vec2(ci + dz * fx * .205, .02 + (1.75 - vP.y) * .31);
    float leafy = lum(buv, 1.6) * .6 + lum(buv, 3.2) * .6;
    float edge = abs(dz) - 1.2 + (noise(vec2(z * 7., vP.y * 7.)) - .5) * .1 - (leafy - .4) * .34;
    float inBay = bay * (1. - smoothstep(-.012, .012, edge));
    col *= 1. - bay * .7 * exp(-max(edge, 0.) * 5.);    // planting stands off the wall, and shades it
    vec3 view = normalize(vP - uCam);
    vec3 gr = plants(vec2(dz, vP.y), vec3(view.z * -uSide * fx, view.y, 0.), ci, fx);
    float wash = exp(-pow(max(1.75 - vP.y, 0.) * .36, 2.)) * 1.5 + .22;
    gr *= vec3(1.25, 1.1, .88) * wash * (1. - .55 * smoothstep(-.34, 0., edge));
    col = mix(col, gr * (.9 - .3 * uDim), inBay);
    // cove light along the skirting
    col += vec3(1., .8, .5) * exp(-pow((vP.y - ${FLOOR.toFixed(2)}) / .07, 2.)) * .1;
    col += vec3(1., .86, .62) * exp(-pow((vP.y - ${ROOF.toFixed(2)}) / .5, 2.)) * .05;
  }
  col = mix(tone(col), FOG, fog);
  if (uFlip > .5) col *= .5;
  o = vec4(col, 1.);
}`;

const PIC_FS = `#version 300 es
${COMMON}
in vec3 vP; in vec2 vUv;
uniform sampler2D uTex; uniform float uOn, uHot;
out vec4 o;
void main(){
  if (uOn < -.5) {                                       // brass
    float sh = .5 + .5 * sin(vP.z * 3.1 + vP.y * 2.3 + uCam.z * 1.4);
    vec3 b = mix(vec3(.2, .135, .06), vec3(.86, .66, .36), sh * sh) * (.75 + uHot * .5);
    b = mix(b, FOG, fogOf(vP)); o = vec4(uFlip > .5 ? b * .4 : b, 1.); return;
  }
  vec3 col = uOn > 0. ? texture(uTex, vUv, uFlip > .5 ? 1.5 : -.35).rgb : vec3(.03, .07, .055);
  col = mix(vec3(.03, .07, .055), col, uOn);
  float l = 1.06 - .26 * vUv.y;                        // lit from above
  col *= vec3(1.06, 1.01, .93) * l * (1. + uHot * .12);
  float fog = fogOf(vP);
  col = mix(tone(col), FOG, fog * .92);
  if (uFlip > .5) col *= .46;
  o = vec4(col, 1.);
}`;

const FLOOR_FS = `#version 300 es
${COMMON}
in vec3 vP; in vec2 vUv;
out vec4 o;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
void main(){
  vec3 v = normalize(uCam - vP);
  float fres = pow(1. - max(v.y, 0.), 3.);
  vec2 g = abs(fract(vP.xz * vec2(.7, .42)) - .5);
  float joint = smoothstep(.492, .498, max(g.x, g.y));
  float vein = noise(vP.xz * 2.4 + noise(vP.xz * 5.) * 1.4);
  vec3 col = vec3(.026, .027, .023) * (.8 + vein * .5) - joint * .012;
  float a = clamp(.9 - fres * .66 - vein * .06, .25, .95);
  float fog = fogOf(vP);
  o = vec4(mix(col, FOG, fog) * mix(a, 1., fog), mix(a, 1., fog));
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
  vA = smoothstep(.3, 1.4, d) * smoothstep(8.5, 3., d) * (.14 + .3 * aD.w) * (.6 + .4 * sin(uT * .7 + aD.w * 50.));
}`;
const DUST_FS = `#version 300 es
precision mediump float; in float vA; out vec4 o;
void main(){ float r = length(gl_PointCoord - .5) * 2.; float a = exp(-r*r*3.4) * vA; o = vec4(vec3(1., .93, .68) * a, a); }`;

/* ---- small matrix helpers, column major ---- */
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
  // view = pitch * yaw * translate; positive yaw looks right, positive pitch looks up
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
  const title = sec.querySelector('[data-hall-title]');
  const place = sec.querySelector('[data-hall-place]');
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
  let leaves;
  try {
    const raw = [program(gl, WALL_VS, WALL_FS), program(gl, WALL_VS, PIC_FS), program(gl, WALL_VS, FLOOR_FS), program(gl, DUST_VS, DUST_FS)];
    const ext = gl.getExtension('KHR_parallel_shader_compile');
    const img = await wallPhoto('forest');
    while (ext && raw.some((p) => !gl.getProgramParameter(p, ext.COMPLETION_STATUS_KHR))) await new Promise((r) => { setTimeout(r, 4); });
    [wallP, picP, floorP, dustP] = raw.map((p) => ready(gl, p));
    leaves = texture(img, true);
  } catch {
    return fail();
  }
  function texture(img, mirror) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    const wrap = mirror ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
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
    const z0 = 6;
    const z1 = -(list.length * GAP + 3.4);
    quad('left', [-HALF, ROOF, z0], [-HALF, ROOF, z1], [-HALF, FLOOR, z0], [-HALF, FLOOR, z1]);
    quad('right', [HALF, ROOF, z0], [HALF, ROOF, z1], [HALF, FLOOR, z0], [HALF, FLOOR, z1]);
    quad('roof', [-HALF, ROOF, z0], [HALF, ROOF, z0], [-HALF, ROOF, z1], [HALF, ROOF, z1]);
    quad('floor', [-HALF, FLOOR, z0], [HALF, FLOOR, z0], [-HALF, FLOOR, z1], [HALF, FLOOR, z1]);
    quad('end', [-HALF, ROOF, z1], [HALF, ROOF, z1], [-HALF, FLOOR, z1], [HALF, FLOOR, z1]);
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
      // seen from inside the corridor, left to right
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

    // walk: ease in and out of every stop
    const i = Math.floor(walk);
    const f = walk - i;
    const e = f * f * f * (f * (f * 6 - 15) + 10);
    const s = i + e * 0.82 + f * 0.18;
    const back = tall ? 2.5 : 2.35; // how far before a wall we pause
    cam.z = -s * GAP + back + Math.max(0, walk - (list.length - 1)) * 0.4;
    // turn toward the wall we are passing, weighted by how near its stop we are
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
    gl.clearColor(0.013, 0.03, 0.024, 1);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);

    const common = (P, flip) => {
      gl.useProgram(P.p);
      gl.uniformMatrix4fv(P.u.uVP, false, vp);
      gl.uniform3f(P.u.uCam, cam.x, cam.y, cam.z);
      gl.uniform1f(P.u.uT, t);
      gl.uniform1f(P.u.uFlip, flip);
      gl.uniform1i(P.u.uTex, 0);
    };
    const seen = list.map((p, n) => ({ p, n })).filter(({ n }) => Math.abs(n - s) < 7.5);
    const scene = (flip) => {
      gl.bindVertexArray(vao);
      common(wallP, flip);
      gl.bindTexture(gl.TEXTURE_2D, leaves);
      gl.uniform1f(wallP.u.uStops, list.length);
      gl.uniform1f(wallP.u.uDim, 0);
      const part = (kind, name, side = 0) => {
        gl.uniform1i(wallP.u.uKind, kind);
        gl.uniform1f(wallP.u.uSide, side);
        gl.drawArrays(gl.TRIANGLE_STRIP, quads[name], 4);
      };
      part(0, 'left', -1);
      part(0, 'right', 1);
      part(2, 'end');
      if (!flip) part(1, 'roof');
      common(picP, flip);
      for (const { p, n } of seen) {
        gl.uniform1f(picP.u.uOn, -1);
        gl.uniform1f(picP.u.uHot, p.hot);
        gl.drawArrays(gl.TRIANGLE_STRIP, quads[`b${n}`], 4);
        if (!p.tex) continue;
        p.on += (1 - p.on) * 0.05;
        gl.bindTexture(gl.TEXTURE_2D, p.tex);
        gl.uniform1f(picP.u.uOn, p.on);
        gl.uniform1f(picP.u.uHot, p.hot);
        gl.drawArrays(gl.TRIANGLE_STRIP, quads[`p${n}`], 4);
      }
    };
    scene(1); // reflection first
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(vao);
    common(floorP, 0);
    gl.depthMask(true);
    gl.drawArrays(gl.TRIANGLE_STRIP, quads.floor, 4);
    gl.disable(gl.BLEND);
    scene(0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.depthMask(false);
    gl.bindVertexArray(dustVao);
    common(dustP, 0);
    gl.uniform1f(dustP.u.uPx, dpr);
    gl.drawArrays(gl.POINTS, 0, N);
    gl.depthMask(true);

    // photos: load ahead, release behind
    list.forEach((p, n) => {
      if (n > s - 2.5 && n < s + 5) hang(p);
      else if (p.tex && Math.abs(n - s) > 9) {
        gl.deleteTexture(p.tex);
        p.tex = null;
        p.on = 0;
      }
      p.hot += ((n === hover ? 1 : 0) - p.hot) * 0.12;
    });

    // words
    const near = Math.round(stop);
    if (title.dataset.n !== `${near}`) {
      title.dataset.n = near;
      title.textContent = list[near].title;
      place.textContent = list[near].where;
      for (const el of [title, place]) {
        el.classList.remove('turn');
        void el.offsetWidth;
        el.classList.add('turn');
      }
    }
    sec.style.setProperty('--end', endK.toFixed(3));
    sec.style.setProperty('--say', Math.max(0, 1 - Math.abs(s - near) * 2.1).toFixed(3));
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
      title.dataset.n = '';
      scrollTo({ top: sec.offsetTop, behavior: 'instant' });
    },
  };
}

/* ---- the sound of the place: air, leaves and a little water, made here, off until asked for ---- */
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

/* A room rendered one light at a time. Each lamp is its own picture in linear light, so turning one up or down is a
   simple sum and every fade is what that lamp would really do. Depth gives the camera a little real movement. */
import { ROOM } from './roomdata.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const VS = `#version 300 es
layout(location=0) in vec2 a; out vec2 q; void main(){ q = a; gl_Position = vec4(a * 2. - 1., 0., 1.); }`;
const FS = `#version 300 es
precision highp float;
in vec2 q; out vec4 o;
uniform sampler2D uA, uB, uC, uD, uZ; uniform vec4 uW, uS; uniform vec3 uView; uniform vec2 uAsp, uPar; uniform float uRise, uT, uExp;
vec3 lin(sampler2D t, vec2 uv, float s){ return pow(texture(t, uv).rgb, vec3(2.4)) * s; }
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
  vec2 uv = uView.xy + (vec2(q.x, 1. - q.y) - .5) * uAsp / uView.z;
  // a few steps into the depth: near things move more than far ones
  vec2 d = uPar; vec2 p = uv;
  for (int i = 0; i < 3; i++) p = uv - d * (texture(uZ, p).r - .35);
  uv = clamp(p, .001, .999);
  vec3 c = lin(uA, uv, uS.x) * uW.x + lin(uB, uv, uS.y) * uW.y + lin(uC, uv, uS.z) * uW.z;
  float lift = smoothstep(-.28, .06, uRise - (1. - uv.y) * 1.1);
  c += lin(uD, uv, uS.w) * uW.w * lift;
  c *= uExp * vec3(1.05, 1., .94);
  c = c * (c * 2.51 + .03) / (c * (c * 2.43 + .59) + .14);
  float l = dot(c, vec3(.2126, .7152, .0722)); c = clamp(l + (c - l) * .97, 0., 1.);
  c = mix(c * 12.92, 1.055 * pow(max(c, vec3(1e-5)), vec3(1. / 2.4)) - .055, step(.0031308, c));
  o = vec4(c + (hash(gl_FragCoord.xy + fract(uT) * 61.) - .5) / 180., 1.);
}`;

export async function createRoom(canvas, name) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  const prog = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]]) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    gl.attachShader(prog, s);
  }
  gl.linkProgram(prog);
  const small = innerWidth * Math.min(2, devicePixelRatio || 1) < 1500;
  const load = async (f) => {
    const r = await fetch(new URL(`../img/room/${f}.avif`, import.meta.url));
    return createImageBitmap(await r.blob()); // decoded away from the page's own thread
  };
  const pics = await Promise.all([0, 1, 2, 3].map((g) => load(`${name}-${g}${small ? '-s' : ''}`)).concat(load(`${name}-d`)));
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`room shader ${gl.getProgramInfoLog(prog)}`);
  gl.useProgram(prog);
  const u = {};
  for (let i = 0; i < gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS); i++) {
    const a = gl.getActiveUniform(prog, i);
    u[a.name] = gl.getUniformLocation(prog, a.name);
  }
  let asp = 0;
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  for (let i = 0; i < pics.length; i++) {
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pics[i]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(u[['uA', 'uB', 'uC', 'uD', 'uZ'][i]], i);
    pics[i].width > 1000 && (asp ||= pics[i].width / pics[i].height);
    pics[i].close();
    await new Promise((r) => { requestAnimationFrame(() => requestAnimationFrame(r)); });
  }
  gl.uniform4fv(u.uS, ROOM[name]);
  let dpr = Math.min(1.75, devicePixelRatio || 1);
  let key = '';
  const R = {
    w: [0, 0, 0, 0], // how far up each light is
    view: [0.5, 0.5, 1], // where the camera looks, and how close
    par: [0, 0],
    rise: 2, // how far up the last light has climbed
    exp: 0.95,
    slower() {
      dpr = Math.max(0.75, dpr - 0.25);
    },
    draw(t) {
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      const k = [w, h, ...R.w.map((v) => v.toFixed(3)), ...R.view.map((v) => v.toFixed(4)), R.par[0].toFixed(4), R.par[1].toFixed(4), R.rise.toFixed(3)].join();
      if (k === key) return;
      key = k;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      const a = w / h;
      // the picture always covers the canvas
      const cov = a > asp ? [1, asp / a] : [a / asp, 1];
      const z = R.view[2];
      const hx = cov[0] / z / 2 + 0.008;
      const hy = cov[1] / z / 2 + 0.008;
      const fit = (v, half) => (half >= 0.5 ? 0.5 : Math.min(1 - half, Math.max(half, v)));
      gl.uniform2f(u.uAsp, ...cov);
      gl.uniform3f(u.uView, fit(R.view[0], hx), fit(R.view[1], hy), z * 1.012);
      gl.uniform4fv(u.uW, R.w);
      gl.uniform2f(u.uPar, ...R.par);
      gl.uniform1f(u.uRise, R.rise);
      gl.uniform1f(u.uExp, R.exp);
      gl.uniform1f(u.uT, t / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    /* runs while the section is on screen */
    run(sec, each) {
      let live = false;
      let then = 0;
      let slow = 8;
      const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
      sec.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        mouse.tx = e.clientX / innerWidth - 0.5;
        mouse.ty = e.clientY / innerHeight - 0.5;
      }, { passive: true });
      const loop = (t) => {
        if (!live) return;
        const dt = Math.min(60, t - then || 16);
        then = t;
        slow = slow * 0.95 + dt * 0.05;
        if (slow > 22) {
          R.slower();
          slow = 10;
        }
        const k = 1 - Math.exp(-dt / 380);
        mouse.x += (mouse.tx - mouse.x) * k;
        mouse.y += (mouse.ty - mouse.y) * k;
        R.par = [mouse.x * 0.011, mouse.y * 0.008];
        each(dt, t);
        R.draw(t);
        requestAnimationFrame(loop);
      };
      new IntersectionObserver(([e]) => {
        const was = live;
        live = e.isIntersecting;
        if (live && !was) requestAnimationFrame(loop);
      }).observe(sec);
    },
  };
  return R;
}

/* ---- come home to it: dusk, then the lamps, one after another, the way a house wakes ---- */
export async function nightRoom(sec) {
  const canvas = sec.querySelector('[data-room]');
  const sw = sec.querySelector('[data-switch]');
  const R = await createRoom(canvas, 'night');
  let on = false;
  let touched = false;
  let since = 0;
  const to = [1, 0, 0, 0];
  R.w = [0.2, 0, 0, 0];
  const place = () => {
    const tall = canvas.clientWidth < canvas.clientHeight;
    R.view[0] = tall ? 0.66 : 0.5;
    R.view[1] = tall ? 0.5 : 0.52;
  };
  const set = (v) => {
    on = v;
    since = 0;
    sw.setAttribute('aria-pressed', v);
    sec.classList.toggle('is-lit', v);
  };
  sw.addEventListener('click', () => {
    touched = true;
    set(!on);
    if (reduced) still();
  });
  function still() {
    place();
    R.w = on ? [0.55, 1.25, 1, 1.9] : [1, 0, 0, 0];
    R.view[2] = 1;
    R.draw(0);
  }
  sec.classList.add('wall-ready');
  if (reduced) {
    set(true);
    still();
    new ResizeObserver(still).observe(canvas);
    return;
  }
  let zoom = 1.1;
  R.run(sec, (dt) => {
    const r = sec.getBoundingClientRect();
    if (!on && !touched && r.top < innerHeight * 0.22 && r.bottom > innerHeight * 0.6) set(true);
    since += dt;
    // floor lamp, then the globes, then the wall itself
    to[0] = on ? 0.55 : 1;
    to[3] = on && since > 120 ? 1.9 : 0;
    to[1] = on && since > 620 ? 1.25 : 0;
    to[2] = on && since > 1250 ? 1 : 0;
    const slow = [900, 520, 1100, 420];
    for (let i = 0; i < 4; i++) R.w[i] += (to[i] - R.w[i]) * (1 - Math.exp(-dt / (on ? slow[i] : slow[i] * 0.7)));
    place();
    const p = Math.min(1, Math.max(0, 1 - r.top / innerHeight));
    zoom += (1.1 - p * 0.07 - zoom) * (1 - Math.exp(-dt / 500));
    R.view[2] = zoom;
    sec.style.setProperty('--lit', R.w[2].toFixed(3));
  });
}

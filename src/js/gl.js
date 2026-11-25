/* Getting things on to the graphics card without the page ever waiting for it. */
import { page } from './frame.js';

/* programs are compiled by the driver in the background and only asked for once they are done */
export async function programs(gl, list, name) {
  const raw = [];
  for (const [vs, fs] of list) {
    await slot();
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    raw.push(p);
  }
  const ext = gl.getExtension('KHR_parallel_shader_compile');
  while (ext && raw.some((p) => !gl.getProgramParameter(p, ext.COMPLETION_STATUS_KHR))) await new Promise((r) => { setTimeout(r, 8); });
  return raw.map((p) => {
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`${name} shader ${gl.getAttachedShaders(p).map((s) => gl.getShaderInfoLog(s)).join(' ')}`);
    const u = {};
    for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) {
      const a = gl.getActiveUniform(p, i);
      u[a.name.replace('[0]', '')] = gl.getUniformLocation(p, a.name);
    }
    return { p, u };
  });
}

/* one piece of heavy work to a frame, whoever asks */
let queue = Promise.resolve();
const next = (r) => (document.hidden ? setTimeout(r, 30) : requestAnimationFrame(() => r()));
export function slot() {
  queue = queue.then(() => new Promise(next));
  return queue;
}

/* decoded away from the page's own thread */
export async function picture(url, exact = false) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url);
  const b = await r.blob();
  return exact ? createImageBitmap(b, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }) : createImageBitmap(b);
}

/* a texture sent across in strips, a strip to a frame */
const STRIP = 1 << 17; // pixels
export async function texture(gl, img, { mip = false, near = false, wrap = '', sharp = 0 } = {}) {
  const t = gl.createTexture();
  const w = img.width;
  const h = img.height;
  const T = gl.TEXTURE_2D;
  const on = () => {
    gl.activeTexture(gl.TEXTURE15);
    gl.bindTexture(T, t);
  };
  on();
  gl.texStorage2D(T, mip ? Math.floor(Math.log2(Math.max(w, h))) + 1 : 1, gl.RGBA8, w, h);
  gl.texParameteri(T, gl.TEXTURE_MIN_FILTER, near ? gl.NEAREST : mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
  gl.texParameteri(T, gl.TEXTURE_MAG_FILTER, near ? gl.NEAREST : gl.LINEAR);
  gl.texParameteri(T, gl.TEXTURE_WRAP_S, wrap ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  gl.texParameteri(T, gl.TEXTURE_WRAP_T, wrap === 'both' ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  const x = sharp && gl.getExtension('EXT_texture_filter_anisotropic');
  if (x) gl.texParameterf(T, x.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(sharp, gl.getParameter(x.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  const rows = Math.max(16, Math.floor(STRIP / w));
  for (let y = 0; y < h;) {
    await slot();
    on();
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    const t0 = performance.now();
    const [most, ms] = page.busy ? [2, 1.6] : [6, 6]; // nothing is moving yet: hurry
    for (let n = 0; n < most && y < h && performance.now() - t0 < ms; n++, y += rows) {
      gl.pixelStorei(gl.UNPACK_SKIP_ROWS, y);
      gl.texSubImage2D(T, 0, 0, y, w, Math.min(rows, h - y), gl.RGBA, gl.UNSIGNED_BYTE, img);
    }
    gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
  }
  if (mip) {
    await slot();
    on();
    gl.generateMipmap(T);
  }
  return t;
}

/* how big a canvas is, kept without asking the page while it moves; fit() sizes the drawing to the screen */
export function sized(canvas, cap, onChange) {
  const s = { w: canvas.clientWidth, h: canvas.clientHeight, cw: 0, ch: 0, dpr: 1 };
  new ResizeObserver(([e]) => {
    s.w = e.contentRect.width;
    s.h = e.contentRect.height;
    onChange?.();
  }).observe(canvas);
  s.fit = () => {
    s.dpr = Math.min(cap, devicePixelRatio || 1) * page.sharp;
    s.cw = Math.round(s.w * s.dpr);
    s.ch = Math.round(s.h * s.dpr);
    if (!s.cw || !s.ch) return false;
    if (canvas.width !== s.cw || canvas.height !== s.ch) {
      canvas.width = s.cw;
      canvas.height = s.ch;
    }
    return true;
  };
  return s;
}

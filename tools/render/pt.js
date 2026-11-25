// WebGPU path tracer: two-level BVH, GGX + diffuse + diffuse transmission, quad/spot lights with MIS, sun, sky, 4 light groups, AOVs
const WG = /* wgsl */`
struct Node { mn: vec3f, a: u32, mx: vec3f, n: u32 };
struct Inst { w0: vec4f, w1: vec4f, w2: vec4f, i0: vec4f, i1: vec4f, i2: vec4f, root: u32, seed: f32, id: f32, mat: f32 };
struct Vert { p: vec3f, t: f32, n: vec3f, leaf: f32, uv: vec2f, tint: f32, back: f32 };
struct Mat { base: vec3f, rough: f32, trans: vec3f, metal: f32, emit: vec3f, spec: f32,
  tBase: i32, tNorm: i32, tRough: i32, flags: u32, scale: vec2f, nStr: f32, vary: f32, egroup: u32, alpha: f32, coat: f32, pad: f32 };
struct Light { p: vec3f, focus: f32, u: vec3f, area: f32, v: vec3f, grp: f32, e: vec3f, vis: f32, n: vec3f, pick: f32 };
struct U { eye: vec4f, r: vec4f, u: vec4f, f: vec4f, size: vec4u, misc: vec4f, sun: vec4f, sunE: vec4f, skyA: vec4f, skyB: vec4f, skyC: vec4f, tile: vec4u, lens: vec4f };
@group(0) @binding(0) var<uniform> uu: U;
@group(0) @binding(1) var<storage, read> nodes: array<Node>;
@group(0) @binding(2) var<storage, read> insts: array<Inst>;
@group(0) @binding(3) var<storage, read> verts: array<Vert>;
@group(0) @binding(4) var<storage, read> tris: array<vec4u>;
@group(0) @binding(5) var<storage, read> mats: array<Mat>;
@group(0) @binding(6) var<storage, read> lights: array<Light>;
@group(0) @binding(7) var<storage, read_write> acc: array<vec4f>;
@group(0) @binding(8) var tx: texture_2d_array<f32>;
@group(0) @binding(9) var sm: sampler;
@group(0) @binding(10) var env: texture_2d<f32>;
var<private> rs: u32;
fn rnd() -> f32 { rs = rs * 747796405u + 2891336453u; let w = ((rs >> ((rs >> 28u) + 4u)) ^ rs) * 277803737u; return f32(((w >> 22u) ^ w) >> 8u) / 16777216.; }
fn hashu(x: u32) -> u32 { var h = x; h = (h ^ 61u) ^ (h >> 16u); h *= 9u; h ^= h >> 4u; h *= 0x27d4eb2du; h ^= h >> 15u; return h; }
struct Hit { t: f32, u: f32, v: f32, tri: u32, inst: u32 };
fn boxT(mn: vec3f, mx: vec3f, o: vec3f, inv: vec3f, tmax: f32) -> f32 {
  let a = (mn - o) * inv; let b = (mx - o) * inv; let lo = min(a, b); let hi = max(a, b);
  let t0 = max(max(lo.x, lo.y), max(lo.z, 0.)); let t1 = min(min(hi.x, hi.y), min(hi.z, tmax));
  return select(1e30, t0, t0 <= t1);
}
fn alphaAt(k: vec4u, b: vec2f) -> bool {
  let m = mats[k.w]; if ((m.flags & 1u) == 0u) { return true; }
  let uv = verts[k.x].uv * (1. - b.x - b.y) + verts[k.y].uv * b.x + verts[k.z].uv * b.y;
  return textureSampleLevel(tx, sm, uv * m.scale, m.tBase, 0.).a > m.alpha;
}
var<private> stk: array<u32, 72>;
fn trace(o0: vec3f, d0: vec3f, tmax0: f32, any: bool) -> Hit {
  var h: Hit; h.t = tmax0; h.inst = 0xffffffffu; var sp = 0; var o = o0; var d = d0; var inv = 1. / d0;
  var cur = 0u; var base = -1; var ci = 0u;
  loop {
    let nd = nodes[cur]; var popn = true;
    if (nd.n == 0u) {
      var l = nd.a; var r = nd.a + 1u;
      var tl = boxT(nodes[l].mn, nodes[l].mx, o, inv, h.t); var tr = boxT(nodes[r].mn, nodes[r].mx, o, inv, h.t);
      if (tl > tr) { let q = l; l = r; r = q; let qt = tl; tl = tr; tr = qt; }
      if (tl < 1e30) { cur = l; popn = false; if (tr < 1e30) { stk[sp] = r; sp++; } }
    } else if (base < 0) {
      ci = nd.a; let I = insts[ci]; base = sp;
      let po = vec4f(o0, 1.); o = vec3f(dot(I.i0, po), dot(I.i1, po), dot(I.i2, po));
      d = vec3f(dot(I.i0.xyz, d0), dot(I.i1.xyz, d0), dot(I.i2.xyz, d0)); inv = 1. / d; cur = I.root; popn = false;
      if (boxT(nodes[cur].mn, nodes[cur].mx, o, inv, h.t) >= 1e30) { popn = true; }
    } else {
      for (var i = nd.a; i < nd.a + nd.n; i++) {
        let k = tris[i]; let a = verts[k.x].p; let e1 = verts[k.y].p - a; let e2 = verts[k.z].p - a;
        let pv = cross(d, e2); let det = dot(e1, pv); if (abs(det) < 1e-14) { continue; }
        let id = 1. / det; let tv = o - a; let u = dot(tv, pv) * id; if (u < 0. || u > 1.) { continue; }
        let q = cross(tv, e1); let v = dot(d, q) * id; if (v < 0. || u + v > 1.) { continue; }
        let t = dot(e2, q) * id;
        if (t > 1e-5 && t < h.t && alphaAt(k, vec2f(u, v))) { h.t = t; h.u = u; h.v = v; h.tri = i; h.inst = ci; if (any) { return h; } }
      }
    }
    if (popn) {
      if (base >= 0 && sp == base) { base = -1; o = o0; d = d0; inv = 1. / d0; }
      if (sp == 0) { break; }
      sp--; cur = stk[sp];
    }
  }
  return h;
}
struct Surf { p: vec3f, ng: vec3f, n: vec3f, base: vec3f, rough: f32, metal: f32, spec: f32, trans: vec3f, emit: vec3f, eg: u32, t: f32, leaf: f32, uv: vec2f, mat: u32, coat: f32, id: f32 };
fn surf(h: Hit, o: vec3f, d: vec3f) -> Surf {
  var s: Surf; let k = tris[h.tri]; let I = insts[h.inst]; let A = verts[k.x]; let B = verts[k.y]; let C = verts[k.z];
  let w = 1. - h.u - h.v; let lp = A.p * w + B.p * h.u + C.p * h.v; let l4 = vec4f(lp, 1.);
  s.p = vec3f(dot(I.w0, l4), dot(I.w1, l4), dot(I.w2, l4));
  let gn = cross(B.p - A.p, C.p - A.p); let sn = A.n * w + B.n * h.u + C.n * h.v;
  s.ng = normalize(gn.x * I.i0.xyz + gn.y * I.i1.xyz + gn.z * I.i2.xyz);
  s.n = normalize(sn.x * I.i0.xyz + sn.y * I.i1.xyz + sn.z * I.i2.xyz);
  let front = dot(s.ng, d) < 0.; if (!front) { s.ng = -s.ng; } if (dot(s.n, s.ng) < 0.) { s.n = -s.n; }
  var mi = k.w; if (I.mat > .5) { mi = u32(I.mat) - 1u; } let m = mats[mi]; s.mat = mi; s.id = I.id;
  s.uv = (A.uv * w + B.uv * h.u + C.uv * h.v) * m.scale; s.t = A.t * w + B.t * h.u + C.t * h.v; s.leaf = A.leaf; let tint = A.tint;
  let an = abs(s.ng); let bm = (m.flags & 2u) != 0u;
  if (bm) {
    if (an.y > an.x && an.y > an.z) { s.uv = s.p.xz; } else if (an.x > an.z) { s.uv = s.p.zy; } else { s.uv = s.p.xy; }
    if ((m.flags & 8u) != 0u) { s.uv = s.uv.yx; } s.uv *= m.scale;
  }
  s.base = m.base; if (m.tBase >= 0) { let c = textureSampleLevel(tx, sm, s.uv, m.tBase, 0.).rgb; s.base *= pow(c, vec3f(2.2)); }
  let rv = fract(sin((I.seed + s.leaf * .137) * 91.7) * 4375.85); let rv2 = fract(rv * 37.31);
  if (m.vary > 0.) { s.base *= 1. + (rv - .5) * m.vary; s.base = mix(s.base, s.base * vec3f(1.35, 1.12, .7), clamp((rv2 - .6) * m.vary * 1.6, 0., 1.)); }
  s.base *= 1. + tint;
  s.trans = m.trans * s.base; s.rough = m.rough; s.metal = m.metal; s.spec = m.spec; s.emit = m.emit; if (m.tBase >= 0) { s.emit *= s.base; } s.eg = m.egroup; s.coat = m.coat;
  if (m.tRough >= 0) { s.rough = clamp(s.rough * textureSampleLevel(tx, sm, s.uv, m.tRough, 0.).g * 2., .03, 1.); }
  if (m.tNorm >= 0) {
    var T: vec3f; var Bt: vec3f;
    if (bm) { if (an.y > an.x && an.y > an.z) { T = vec3f(1., 0., 0.); Bt = vec3f(0., 0., 1.); } else if (an.x > an.z) { T = vec3f(0., 0., 1.); Bt = vec3f(0., 1., 0.); } else { T = vec3f(1., 0., 0.); Bt = vec3f(0., 1., 0.); } if ((m.flags & 8u) != 0u) { let q = T; T = Bt; Bt = q; } }
    else { let e1 = B.p - A.p; let e2 = C.p - A.p; let d1 = B.uv - A.uv; let d2 = C.uv - A.uv; let r = d1.x * d2.y - d2.x * d1.y; let rr = select(0., 1. / r, abs(r) > 1e-12);
      let lt = (e1 * d2.y - e2 * d1.y) * rr; let lb = (e2 * d1.x - e1 * d2.x) * rr; T = vec3f(dot(I.w0.xyz, lt), dot(I.w1.xyz, lt), dot(I.w2.xyz, lt)); Bt = vec3f(dot(I.w0.xyz, lb), dot(I.w1.xyz, lb), dot(I.w2.xyz, lb)); }
    if (dot(T, T) > 1e-12 && dot(Bt, Bt) > 1e-12) {
      var q = textureSampleLevel(tx, sm, s.uv, m.tNorm, 0.).xyz * 2. - 1.; q = vec3f(q.xy * m.nStr * select(-1., 1., front || bm), max(q.z, .05));
      let TT = normalize(T - s.n * dot(T, s.n)); let BB = normalize(Bt - s.n * dot(Bt, s.n));
      let nn = normalize(TT * q.x + BB * q.y + s.n * q.z); if (dot(nn, d) < -.02) { s.n = nn; }
    }
  }
  if (!front && m.trans.x > 0.) { s.rough = min(1., s.rough + .25); s.base = mix(s.base, s.base * 1.25 + vec3f(.012, .016, .01), .6); s.spec *= .6; }
  if (dot(s.n, d) > -.001) { s.n = normalize(s.n - d * (dot(s.n, d) + .02)); }
  return s;
}
fn onb(n: vec3f) -> mat3x3f { let sg = select(-1., 1., n.z >= 0.); let a = -1. / (sg + n.z); let b = n.x * n.y * a; return mat3x3f(vec3f(1. + sg * n.x * n.x * a, sg * b, -sg * n.x), vec3f(b, sg + n.y * n.y * a, -n.y), n); }
fn cosS() -> vec3f { let a = 6.2831853 * rnd(); let r = sqrt(rnd()); return vec3f(r * cos(a), r * sin(a), sqrt(max(0., 1. - r * r))); }
fn sky(d: vec3f) -> vec3f {
  if (uu.skyC.w > .5) { let p = vec2f(atan2(d.z, d.x) / 6.2831853 + .5 + uu.lens.z, acos(clamp(d.y, -1., 1.)) / 3.14159265); return textureSampleLevel(env, sm, p, 0.).rgb * uu.skyA.w; }
  let k = d.y; return uu.skyA.w * select(mix(uu.skyB.rgb, uu.skyC.rgb, min(1., -k * 3.)), mix(uu.skyB.rgb, uu.skyA.rgb, pow(max(k, 0.), .55)), k > 0.);
}
fn DD(nh: f32, a: f32) -> f32 { let q = nh * nh * (a * a - 1.) + 1.; return a * a / (3.14159265 * q * q); }
fn G1(nx: f32, a: f32) -> f32 { return 2. * nx / (nx + sqrt(a * a + (1. - a * a) * nx * nx)); }
struct Ev { f: vec3f, pdf: f32 };
fn lobes(s: Surf, v: vec3f) -> vec3f {
  let F0 = mix(vec3f(.08 * s.spec), s.base, s.metal); let nv = max(dot(s.n, v), .01);
  let F = F0 + (1. - F0) * pow(1. - nv, 5.) * (1. - s.rough * .7); let ps = max(F.x, max(F.y, F.z)) * 1.2 + .04;
  let df = dot(s.base, vec3f(.333)) * (1. - s.metal); let tr = dot(s.trans, vec3f(.333)); let sum = ps + df + tr + 1e-5; return vec3f(ps, df, tr) / sum;
}
fn eval(s: Surf, v: vec3f, l: vec3f) -> Ev {
  var e: Ev; let nl = dot(s.n, l); let nv = max(dot(s.n, v), 1e-3); let p = lobes(s, v);
  if (nl <= 0. || dot(s.ng, l) <= 0.) { if (nl < 0. && dot(s.ng, l) < 0. && p.z > 0.) { e.f = s.trans / 3.14159265 * -nl; e.pdf = p.z * -nl / 3.14159265; } return e; }
  let a = max(s.rough * s.rough, .0012); let h = normalize(v + l); let nh = max(dot(s.n, h), 0.); let vh = max(dot(v, h), 0.);
  let F0 = mix(vec3f(.08 * s.spec), s.base, s.metal); let F = F0 + (1. - F0) * pow(1. - vh, 5.);
  let d = DD(nh, a); let g1 = G1(nv, a); let sp = F * d * g1 * G1(nl, a) / (4. * nv * nl);
  let df = s.base * (1. - s.metal) * (1. - F) / 3.14159265;
  e.f = (sp + df) * nl; e.pdf = p.x * d * g1 / (4. * nv) + p.y * nl / 3.14159265; return e;
}
fn sampleDir(s: Surf, v: vec3f) -> vec3f {
  let p = lobes(s, v); let x = rnd(); let B = onb(s.n);
  if (x < p.x) {
    let a = max(s.rough * s.rough, .0012); let lv = transpose(B) * v; let vh = normalize(vec3f(a * lv.x, a * lv.y, lv.z));
    let len = vh.x * vh.x + vh.y * vh.y; var T1 = vec3f(1., 0., 0.); if (len > 0.) { T1 = vec3f(-vh.y, vh.x, 0.) / sqrt(len); } let T2 = cross(vh, T1);
    let r = sqrt(rnd()); let ph = 6.2831853 * rnd(); let t1 = r * cos(ph); var t2 = r * sin(ph); let q = .5 * (1. + vh.z); t2 = (1. - q) * sqrt(max(0., 1. - t1 * t1)) + q * t2;
    let nh = t1 * T1 + t2 * T2 + sqrt(max(0., 1. - t1 * t1 - t2 * t2)) * vh; let h = B * normalize(vec3f(a * nh.x, a * nh.y, max(0., nh.z))); return reflect(-v, h);
  }
  let c = B * cosS(); if (x < p.x + p.y) { return c; } return c - 2. * dot(c, s.n) * s.n;
}
fn lightPdf(i: u32, o: vec3f, d: vec3f, t: f32) -> f32 { let L = lights[i]; let c = abs(dot(L.n, d)); return L.pick * t * t / max(c * L.area, 1e-6); }
fn focusOf(L: Light, c: f32) -> f32 { return select(1., pow(max(c, 1e-4), abs(L.focus)), L.focus != 0.); }
fn hitLight(o: vec3f, d: vec3f, tmax: f32, vis: bool) -> vec2f {
  var r = vec2f(tmax, -1.);
  for (var i = 0u; i < u32(uu.misc.y); i++) { let L = lights[i]; if (vis && L.vis <= 0.) { continue; } let c = dot(L.n, d); if (c >= 0.) { continue; }
    let t = dot(L.p - o, L.n) / c; if (t < 1e-4 || t > r.x) { continue; } let q = o + d * t - L.p; let a = dot(q, L.u) / dot(L.u, L.u); let b = dot(q, L.v) / dot(L.v, L.v);
    if (a >= 0. && a <= 1. && b >= 0. && b <= 1.) { if (L.focus >= 0. || (a - .5) * (a - .5) + (b - .5) * (b - .5) < .25) { r = vec2f(t, f32(i)); } } }
  return r;
}
@compute @workgroup_size(8, 8) fn main(@builtin(global_invocation_id) gid: vec3u) {
  let px = gid.xy + uu.tile.xy; if (px.x >= uu.size.x || px.y >= uu.size.y || gid.x >= uu.tile.z || gid.y >= uu.tile.w) { return; }
  let idx = (px.y * uu.size.x + px.x) * 4u; rs = hashu(px.x + px.y * 8192u + uu.size.z * 67108859u + 17u);
  let aov = uu.size.w == 1u; let j = select(vec2f(rnd(), rnd()) + vec2f(rnd(), rnd()) * .5 - .25, vec2f(.5), aov);
  let q = (vec2f(px) + j) / vec2f(uu.size.xy) * 2. - 1.; var o = uu.eye.xyz; var d: vec3f;
  if (uu.eye.w > .5) { o += uu.r.xyz * q.x - uu.u.xyz * q.y; d = uu.f.xyz; }
  else { d = uu.f.xyz + uu.r.xyz * (q.x + uu.r.w) + uu.u.xyz * (uu.u.w - q.y);
    if (uu.lens.x > 0. && !aov) { let fp = o + d * uu.lens.y; let a = 6.2831853 * rnd(); let rr = sqrt(rnd()) * uu.lens.x; o += normalize(uu.r.xyz) * cos(a) * rr + normalize(uu.u.xyz) * sin(a) * rr; d = fp - o; } }
  d = normalize(d);
  var thr = vec3f(1.); var G: array<vec3f, 4>; var bp = 1e9; var alpha = 1.;
  for (var b = 0; b < i32(uu.misc.x); b++) {
    var h = trace(o, d, 1e6, false);
    if (b == 0 && uu.f.w > .5 && h.inst != 0xffffffffu) { let first = insts[h.inst].id; var k = 0; loop { o = o + d * (h.t + 2e-4); h = trace(o, d, 1e6, false); k++; if (h.inst == 0xffffffffu || k > 40 || insts[h.inst].id != first) { break; } } }
    let lt = hitLight(o, d, h.t, b == 0);
    if (lt.y >= 0. && !aov) { let L = lights[u32(lt.y)]; let c = -dot(L.n, d); var w = 1.; if (b > 0) { let lp = lightPdf(u32(lt.y), o, d, lt.x); w = bp * bp / (bp * bp + lp * lp); }
      var e = L.e * focusOf(L, c) * w; if (b == 0) { e = min(L.e * L.vis, vec3f(30.)); } else if (b > 1) { e = min(e * thr, vec3f(uu.misc.z)) / max(thr, vec3f(1e-5)); } G[u32(L.grp)] += thr * e; break; }
    if (h.inst == 0xffffffffu) { if (aov) { acc[idx] = vec4f(0., 0., 0., 1e6); return; } if (b == 0) { alpha = 0.; if (uu.misc.w < .5) { break; } } G[u32(uu.skyB.w)] += thr * sky(d); break; }
    var s = surf(h, o, d);
    if (aov) {
      let ng = vec3f(dot(s.n, normalize(uu.r.xyz)), dot(s.n, normalize(uu.u.xyz)), -dot(s.n, normalize(uu.f.xyz)));
      acc[idx] = vec4f(ng, h.t); acc[idx + 1u] = vec4f(s.base, s.rough); acc[idx + 2u] = vec4f(s.id, s.leaf, s.t, f32(s.mat)); acc[idx + 3u] = vec4f(s.p, 1.); return; }
    if (max(s.emit.x, max(s.emit.y, s.emit.z)) > 0.) { G[s.eg] += thr * s.emit; }
    let v = -d; let eps = s.ng * (1e-4 + 1e-5 * h.t);
    if (uu.misc.y > .5) {
      var x = rnd(); var li = 0u; for (; li < u32(uu.misc.y) - 1u; li++) { x -= lights[li].pick; if (x < 0.) { break; } }
      let L = lights[li]; var a = rnd(); var c2 = rnd();
      if (L.focus < 0.) { let r = sqrt(a) * .5; let ph = c2 * 6.2831853; a = .5 + r * cos(ph); c2 = .5 + r * sin(ph); }
      let lp = L.p + L.u * a + L.v * c2; let ld = lp - s.p; let dist = length(ld); let l = ld / dist; let c = -dot(L.n, l);
      if (c > 0.) { let e = eval(s, v, l); if (dot(e.f, vec3f(1.)) > 0.) { let pd = L.pick * dist * dist / (c * L.area); let fo = focusOf(L, c);
        if (fo > 1e-4) { let side = select(-1., 1., dot(s.ng, l) > 0.); if (trace(s.p + eps * side, l, dist - 3e-4, true).inst == 0xffffffffu) { let w = pd * pd / (pd * pd + e.pdf * e.pdf); var k = thr * e.f * L.e * fo * w / pd; if (b > 0) { k = min(k, vec3f(uu.misc.z)); } G[u32(L.grp)] += k; } } } }
    }
    if (uu.sunE.w > 0.) { let B = onb(uu.sun.xyz); let a = 6.2831853 * rnd(); let r = sqrt(rnd()) * uu.sun.w; let l = normalize(uu.sun.xyz + (B[0] * cos(a) + B[1] * sin(a)) * r); let e = eval(s, v, l);
      if (dot(e.f, vec3f(1.)) > 0.) { let side = select(-1., 1., dot(s.ng, l) > 0.); if (trace(s.p + eps * side, l, 1e6, true).inst == 0xffffffffu) { var k = thr * e.f * uu.sunE.rgb; if (b > 0) { k = min(k, vec3f(uu.misc.z)); } G[u32(uu.sunE.w) - 1u] += k; } } }
    let l = sampleDir(s, v); let e = eval(s, v, l); if (e.pdf <= 1e-7) { break; }
    thr *= e.f / e.pdf; bp = e.pdf; o = s.p + eps * select(-1., 1., dot(s.ng, l) > 0.); d = l;
    if (b > 2) { let p = clamp(max(thr.x, max(thr.y, thr.z)), .05, .97); if (rnd() > p) { break; } thr /= p; }
    let mm = max(thr.x, max(thr.y, thr.z)); if (mm > 6.) { thr *= 6. / mm; }
  }
  for (var g = 0u; g < 4u; g++) { var c = G[g]; if (!(dot(c, c) < 1e12)) { c = vec3f(0.); } acc[idx + g] += vec4f(min(c, vec3f(uu.lens.w)), alpha); }
}`;

const get = async (u, T) => new T(await (await fetch(u)).arrayBuffer());
function buildBVH(n, boxes, first = 0, leafMax = 4) {
  const order = new Uint32Array(n); for (let i = 0; i < n; i++) order[i] = i;
  const cx = new Float32Array(n * 3); for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) cx[i * 3 + k] = (boxes[i * 6 + k] + boxes[i * 6 + 3 + k]) * .5;
  const N = new Float32Array(Math.max(2, n * 2 + 4) * 8), NU = new Uint32Array(N.buffer); let used = 2;
  const BINS = 16, bb = new Float64Array(BINS * 6), bc = new Uint32Array(BINS), ra = new Float64Array(BINS);
  const area = (x) => { const a = x[3] - x[0], b = x[4] - x[1], c = x[5] - x[2]; return a < 0 ? 0 : a * b + b * c + c * a; };
  const st = [[0, 0, n, 0]];
  while (st.length) {
    const [ni, a, b, dep] = st.pop(); const m = [1e30, 1e30, 1e30, -1e30, -1e30, -1e30], c = [1e30, 1e30, 1e30, -1e30, -1e30, -1e30];
    for (let i = a; i < b; i++) { const o = order[i]; for (let k = 0; k < 3; k++) { const l = boxes[o * 6 + k], h = boxes[o * 6 + 3 + k], q = cx[o * 3 + k]; if (l < m[k]) m[k] = l; if (h > m[k + 3]) m[k + 3] = h; if (q < c[k]) c[k] = q; if (q > c[k + 3]) c[k + 3] = q; } }
    for (let k = 0; k < 3; k++) { N[ni * 8 + k] = m[k] - 1e-5; N[ni * 8 + 4 + k] = m[k + 3] + 1e-5; }
    const cnt = b - a; let ax = -1, bi = 0, best = 1e300;
    if (cnt > leafMax) for (let k = 0; k < 3; k++) {
      const w = c[k + 3] - c[k]; if (w < 1e-9) continue; const s = BINS / w; bc.fill(0); for (let i = 0; i < BINS; i++) { bb[i * 6] = bb[i * 6 + 1] = bb[i * 6 + 2] = 1e30; bb[i * 6 + 3] = bb[i * 6 + 4] = bb[i * 6 + 5] = -1e30; }
      for (let i = a; i < b; i++) { const o = order[i]; const q = Math.min(BINS - 1, ((cx[o * 3 + k] - c[k]) * s) | 0); bc[q]++; for (let j = 0; j < 3; j++) { const l = boxes[o * 6 + j], h = boxes[o * 6 + 3 + j]; if (l < bb[q * 6 + j]) bb[q * 6 + j] = l; if (h > bb[q * 6 + 3 + j]) bb[q * 6 + 3 + j] = h; } }
      let x0 = [1e30, 1e30, 1e30, -1e30, -1e30, -1e30], nn = 0;
      for (let i = BINS - 1; i > 0; i--) { nn += bc[i]; for (let j = 0; j < 3; j++) { x0[j] = Math.min(x0[j], bb[i * 6 + j]); x0[3 + j] = Math.max(x0[3 + j], bb[i * 6 + 3 + j]); } ra[i] = area(x0) * nn; }
      x0 = [1e30, 1e30, 1e30, -1e30, -1e30, -1e30]; nn = 0;
      for (let i = 0; i < BINS - 1; i++) { nn += bc[i]; for (let j = 0; j < 3; j++) { x0[j] = Math.min(x0[j], bb[i * 6 + j]); x0[3 + j] = Math.max(x0[3 + j], bb[i * 6 + 3 + j]); } const cost = area(x0) * nn + ra[i + 1]; if (nn > 0 && nn < cnt && cost < best) { best = cost; ax = k; bi = i; } }
    }
    let mid;
    if (ax >= 0 && dep < 40) { const s = BINS / (c[ax + 3] - c[ax]); let i = a, j = b - 1; while (i <= j) { const q = Math.min(BINS - 1, ((cx[order[i] * 3 + ax] - c[ax]) * s) | 0); if (q <= bi) i++; else { const t = order[i]; order[i] = order[j]; order[j] = t; j--; } } mid = i; }
    if (mid === undefined || mid === a || mid === b) { if (leafMax === 1 && cnt > 1) mid = (a + b) >> 1; else { NU[ni * 8 + 3] = a + first; NU[ni * 8 + 7] = cnt; continue; } }
    const L = used; used += 2; NU[ni * 8 + 3] = L; NU[ni * 8 + 7] = 0; st.push([L, a, mid, dep + 1], [L + 1, mid, b, dep + 1]);
  }
  return { nodes: N.slice(0, used * 8), order };
}
async function setup(dir) {
  const S = await (await fetch(`/${dir}/scene.json`)).json();
  const verts = await get(`/${dir}/verts.bin`, Float32Array), tris = await get(`/${dir}/tris.bin`, Uint32Array), inst = await get(`/${dir}/inst.bin`, Float32Array);
  const t0 = performance.now(); const outT = new Uint32Array(tris.length), blas = []; let total = 0;
  for (const m of S.meshes) {
    const bx = new Float32Array(m.nt * 6);
    for (let i = 0; i < m.nt; i++) { const k = (m.t0 + i) * 4; for (let a = 0; a < 3; a++) { let lo = 1e30, hi = -1e30; for (let c = 0; c < 3; c++) { const v = verts[tris[k + c] * 12 + a]; if (v < lo) lo = v; if (v > hi) hi = v; } bx[i * 6 + a] = lo; bx[i * 6 + 3 + a] = hi; } }
    const r = buildBVH(m.nt, bx, m.t0); for (let i = 0; i < m.nt; i++) outT.set(tris.subarray((m.t0 + r.order[i]) * 4, (m.t0 + r.order[i]) * 4 + 4), (m.t0 + i) * 4);
    blas.push(r.nodes); total += r.nodes.length / 8; m.lo = [...r.nodes.slice(0, 3)]; m.hi = [...r.nodes.slice(4, 7)];
  }
  const ni = inst.length / 16, ib = new Float32Array(ni * 6);
  for (let i = 0; i < ni; i++) { const m = S.meshes[inst[i * 16 + 12]]; const lo = [1e30, 1e30, 1e30], hi = [-1e30, -1e30, -1e30];
    for (let c = 0; c < 8; c++) { const p = [c & 1 ? m.hi[0] : m.lo[0], c & 2 ? m.hi[1] : m.lo[1], c & 4 ? m.hi[2] : m.lo[2]]; for (let a = 0; a < 3; a++) { const v = inst[i * 16 + a * 4] * p[0] + inst[i * 16 + a * 4 + 1] * p[1] + inst[i * 16 + a * 4 + 2] * p[2] + inst[i * 16 + a * 4 + 3]; lo[a] = Math.min(lo[a], v); hi[a] = Math.max(hi[a], v); } }
    ib.set(lo, i * 6); ib.set(hi, i * 6 + 3); }
  const tl = buildBVH(ni, ib, 0, 1); let off = tl.nodes.length / 8; const starts = [];
  const nodes = new Float32Array((off + total) * 8), nu = new Uint32Array(nodes.buffer); nodes.set(tl.nodes, 0);
  blas.forEach((b, k) => { starts[k] = off; nodes.set(b, off * 8); for (let i = 0; i < b.length / 8; i++) if (nu[(off + i) * 8 + 7] === 0) nu[(off + i) * 8 + 3] += off; off += b.length / 8; });
  const IN = new Float32Array(ni * 28), IU = new Uint32Array(IN.buffer);
  for (let q = 0; q < ni; q++) { const i = tl.order[q], w = inst.subarray(i * 16, i * 16 + 16); IN.set(w.subarray(0, 12), q * 28);
    const [a, b, c, x, d, e, f, y, g, h, k, z] = w; const A = e * k - f * h, B = -(d * k - f * g), C = d * h - e * g, det = 1 / (a * A + b * B + c * C);
    const m = [A * det, (c * h - b * k) * det, (b * f - c * e) * det, B * det, (a * k - c * g) * det, (c * d - a * f) * det, C * det, (b * g - a * h) * det, (a * e - b * d) * det];
    for (let r = 0; r < 3; r++) { IN[q * 28 + 12 + r * 4] = m[r * 3]; IN[q * 28 + 13 + r * 4] = m[r * 3 + 1]; IN[q * 28 + 14 + r * 4] = m[r * 3 + 2]; IN[q * 28 + 15 + r * 4] = -(m[r * 3] * x + m[r * 3 + 1] * y + m[r * 3 + 2] * z); }
    IU[q * 28 + 24] = starts[w[12]]; IN[q * 28 + 25] = w[13]; IN[q * 28 + 26] = w[14]; IN[q * 28 + 27] = w[15]; }
  const mats = new Float32Array(S.materials.length * 24), mu = new Uint32Array(mats.buffer), ms = new Int32Array(mats.buffer);
  S.materials.forEach((m, i) => { const o = i * 24; mats.set([...m.base, m.rough, ...m.trans, m.metal, ...m.emit, m.spec], o); ms[o + 12] = m.tBase; ms[o + 13] = m.tNorm; ms[o + 14] = m.tRough; mu[o + 15] = m.flags; mats.set([...m.scale, m.nStr, m.vary], o + 16); mu[o + 20] = m.egroup; mats[o + 21] = m.alpha; });
  const nl = S.lights.length, li = new Float32Array(Math.max(1, nl) * 20);
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; let pw = 0;
  const P = S.lights.map((l) => { const n = cr(l.u, l.v), q = Math.hypot(...n), ar = q * (l.focus < 0 ? Math.PI / 4 : 1); const w = (l.e[0] + l.e[1] + l.e[2]) * ar / (Math.abs(l.focus) > 1 ? Math.sqrt(Math.abs(l.focus)) : 1) * (l.boost || 1); pw += w; return { n: n.map((x) => x / q), ar, w }; });
  S.lights.forEach((l, i) => li.set([...l.p, l.focus, ...l.u, P[i].ar, ...l.v, l.group, ...l.e, l.vis ?? 1, ...P[i].n, P[i].w / pw], i * 20));
  const ad = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  const dev = await ad.requestDevice({ requiredFeatures: ['float32-filterable'], requiredLimits: { maxStorageBufferBindingSize: ad.limits.maxStorageBufferBindingSize, maxBufferSize: ad.limits.maxBufferSize, maxStorageBuffersPerShaderStage: 10 } });
  dev.addEventListener('uncapturederror', (e) => console.error(e.error.message));
  const sb = (d) => { const b = dev.createBuffer({ size: Math.max(160, Math.ceil(d.byteLength / 16) * 16), usage: 128 | 8 }); dev.queue.writeBuffer(b, 0, d.buffer, d.byteOffset, d.byteLength); return b; };
  const nt = Math.max(2, S.textures.length), R = S.texSize || 1024;
  const tex = dev.createTexture({ size: [R, R, nt], format: 'rgba8unorm', usage: 6 });
  for (let i = 0; i < S.textures.length; i++) { const d = await get(`/${S.textures[i]}`, Uint8Array); dev.queue.writeTexture({ texture: tex, origin: [0, 0, i] }, d, { bytesPerRow: R * 4 }, [R, R, 1]); }
  const es = S.env ? [S.env.w, S.env.h] : [1, 1]; const env = dev.createTexture({ size: es, format: 'rgba32float', usage: 6 });
  if (S.env) dev.queue.writeTexture({ texture: env }, await get(`/${S.env.file}`, Float32Array), { bytesPerRow: es[0] * 16 }, es);
  const mod = dev.createShaderModule({ code: WG }); const info = await mod.getCompilationInfo(); for (const m of info.messages) if (m.type === 'error') console.error(m.lineNum, m.message);
  const bgl = dev.createBindGroupLayout({ entries: [{ binding: 0, visibility: 4, buffer: { type: 'uniform' } }, ...[1, 2, 3, 4, 5, 6].map((b) => ({ binding: b, visibility: 4, buffer: { type: 'read-only-storage' } })), { binding: 7, visibility: 4, buffer: { type: 'storage' } }, { binding: 8, visibility: 4, texture: { viewDimension: '2d-array' } }, { binding: 9, visibility: 4, sampler: {} }, { binding: 10, visibility: 4, texture: {} }] });
  const pipe = await dev.createComputePipelineAsync({ layout: dev.createPipelineLayout({ bindGroupLayouts: [bgl] }), compute: { module: mod, entryPoint: 'main' } });
  return { S, dev, pipe, bufs: [sb(nodes), sb(IN), sb(verts), sb(outT), sb(mats), sb(li)], tex, env, bgl, nl, build: performance.now() - t0, ni, nt: tris.length / 4 };
}
window.load = async (dir) => { window.X = await setup(dir); return { build: Math.round(X.build), inst: X.ni, tris: X.nt }; };
window.render = async (cam, out) => {
  const { dev, S } = X; const { w, h, spp } = cam; const acc = dev.createBuffer({ size: w * h * 64, usage: 128 | 4 | 8 });
  const ub = dev.createBuffer({ size: 13 * 16, usage: 64 | 8 });
  const bg = dev.createBindGroup({ layout: X.bgl, entries: [{ binding: 0, resource: { buffer: ub } }, ...X.bufs.map((b, i) => ({ binding: i + 1, resource: { buffer: b } })), { binding: 7, resource: { buffer: acc } }, { binding: 8, resource: X.tex.createView({ dimension: '2d-array' }) }, { binding: 9, resource: dev.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'repeat', addressModeV: 'repeat' }) }, { binding: 10, resource: X.env.createView() }] });
  const sub = (a, b) => a.map((x, i) => x - b[i]), nm = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); }, cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const f = nm(sub(cam.at, cam.eye)), r = nm(cr(f, cam.up || [0, 1, 0])), up = cr(r, f); const k = cam.ortho ? cam.ortho / 2 : Math.tan(cam.fov * Math.PI / 360); const kw = k * w / h;
  const write = (seed, aov, tile) => { const u = new Float32Array(52), i = new Uint32Array(u.buffer);
    u.set([...cam.eye, cam.ortho ? 1 : 0, ...r.map((x) => x * kw), cam.shiftX || 0, ...up.map((x) => x * k), cam.shiftY || 0, ...f, cam.peel ? 1 : 0]); i.set([w, h, seed, aov ? 1 : 0], 16);
    u.set([cam.bounces || 7, X.nl, cam.clamp || 4, cam.bg ? 1 : 0], 20); const s = S.sun; u.set(s ? [...nm(s.dir), s.size ?? .01, ...s.e, s.group + 1] : [0, 1, 0, 0, 0, 0, 0, 0], 24);
    const k2 = S.sky || { up: [0, 0, 0], hor: [0, 0, 0], down: [0, 0, 0], e: 0, group: 0 }; u.set([...k2.up, k2.e, ...k2.hor, k2.group || 0, ...k2.down, S.env ? 1 : 0], 32); i.set(tile, 44); u.set([cam.aperture || 0, cam.focus || 1, k2.rot || 0, cam.maxv || 60], 48); dev.queue.writeBuffer(ub, 0, u); };
  const T = cam.tile || 384;
  const pass = async (seed, aov) => { for (let y = 0; y < h; y += T) for (let x = 0; x < w; x += T) { write(seed, aov, [x, y, Math.min(T, w - x), Math.min(T, h - y)]); const e = dev.createCommandEncoder(), p = e.beginComputePass(); p.setPipeline(X.pipe); p.setBindGroup(0, bg); p.dispatchWorkgroups(Math.ceil(T / 8), Math.ceil(T / 8)); p.end(); dev.queue.submit([e.finish()]); await dev.queue.onSubmittedWorkDone(); } };
  const read = async (name) => { const rb = dev.createBuffer({ size: w * h * 64, usage: 1 | 8 }); const e = dev.createCommandEncoder(); e.copyBufferToBuffer(acc, 0, rb, 0, w * h * 64); dev.queue.submit([e.finish()]); await rb.mapAsync(1); const full = new Uint8Array(rb.getMappedRange()); for (let o = 0, q = 0; o < full.length; o += 6.4e7, q++) await fetch(`/put/${name}?part=${q}`, { method: 'POST', body: full.slice(o, Math.min(full.length, o + 6.4e7)) }); rb.unmap(); rb.destroy(); };
  if (cam.aov) { await pass(0, true); await read(`${out}.aov`); const e = dev.createCommandEncoder(); e.clearBuffer(acc); dev.queue.submit([e.finish()]); }
  const t0 = performance.now(); let done = 0; for (let s = 0; s < spp; s++) { await pass(s + 1 + (cam.seed || 0), false); done = s + 1; if (cam.maxsec && performance.now() - t0 > cam.maxsec * 1000) break; }
  if (spp) await read(`${out}.rgb`); acc.destroy(); return { spp: done, sec: (performance.now() - t0) / 1000 };
};
window.ready = true;

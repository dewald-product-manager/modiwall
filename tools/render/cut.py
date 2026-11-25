"""The wall cut through the middle of a channel: the CAD parts, clipped and capped, planted, over a steel reservoir.
    python cut.py parts.npz stldir 1800 200      one unit = 100 mm, y up, z out of the wall, the cut is x = 0"""
import sys
from collections import defaultdict
import numpy as np
import rt, plants2
from roomlib import *
from roomb import *
from roomc import rbox
from scipy.spatial import Delaunay

NPZ, STL, W, SPP = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
Z = np.load(NPZ)
PITCH = 5.2


def stl(f):
    b = open(f, 'rb').read(); n = int.from_bytes(b[80:84], 'little')
    return np.frombuffer(b[84:84 + 50 * n], dtype=np.dtype([('n', '<f4', 3), ('v', '<f4', (3, 3)), ('a', '<u2')]))['v'].astype(float)


def loops(v, c):
    """closed outlines where the part is cut at x = c: lists of (y, z)"""
    g = defaultdict(list)
    for t in v:
        d = t[:, 0] - c
        if d.min() >= 0 or d.max() <= 0: continue
        p = [tuple(np.round((t[i] + (t[(i + 1) % 3] - t[i]) * d[i] / (d[i] - d[(i + 1) % 3]))[1:], 2)) for i in range(3) if (d[i] < 0) != (d[(i + 1) % 3] < 0)]
        if len(p) == 2 and p[0] != p[1]: g[p[0]].append(p[1]); g[p[1]].append(p[0])
    seen, out = set(), []
    for st in list(g):
        if st in seen: continue
        l = [st]; seen.add(st); cur = st
        while True:
            n = [t for t in g[cur] if t not in seen]
            if not n: break
            cur = n[0]; seen.add(cur); l.append(cur)
        if len(l) > 2: out.append(np.array(l))
    return out


def inside(poly, P):
    x, y = P[:, 0], P[:, 1]; r = np.zeros(len(P), bool); j = len(poly) - 1
    for i in range(len(poly)):
        (xi, yi), (xj, yj) = poly[i], poly[j]
        hit = ((yi > y) != (yj > y)) & (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi); r ^= hit; j = i
    return r


def fill(poly, step=1.6):
    P = []
    for a, b in zip(poly, np.roll(poly, -1, 0)):
        n = max(1, int(np.hypot(*(b - a)) / step))
        P += [a + (b - a) * k / n for k in range(n)]
    P = np.array(P); lo, hi = P.min(0), P.max(0)
    gx, gy = np.meshgrid(np.arange(lo[0], hi[0], step * 2.2), np.arange(lo[1], hi[1], step * 2.2)); G = np.stack([gx.ravel(), gy.ravel()], 1); G = G[inside(poly, G)]
    Q = np.concatenate([P, G + np.random.default_rng(1).normal(0, .01, G.shape)]) if len(G) else P
    D = Delaunay(Q); c = Q[D.simplices].mean(1); return Q, D.simplices[inside(poly, c)]


def clip(P, F, N):
    """what lies at x >= 0"""
    d = P[:, 0]; k = d[F] >= 0; keep = F[k.all(1)]; V, NN, out = [P], [N], [keep]; n = len(P)
    for f in F[k.any(1) & ~k.all(1)]:
        poly, pn = [], []
        for i in range(3):
            a, b = f[i], f[(i + 1) % 3]
            if d[a] >= 0: poly.append(P[a]); pn.append(N[a])
            if (d[a] >= 0) != (d[b] >= 0):
                t = d[a] / (d[a] - d[b]); poly.append(P[a] + (P[b] - P[a]) * t); pn.append(N[a] + (N[b] - N[a]) * t)
        V.append(np.array(poly)); NN.append(np.array(pn)); out.append(np.array([(n, n + i, n + i + 1) for i in range(1, len(poly) - 1)])); n += len(poly)
    return np.concatenate(V), np.concatenate(out), np.concatenate(NN)


s = Scene('cut', tex=1024)
pp = s.mat('pp', (.030, .033, .032), .36, spec=.5)
face = s.mat('cutface', (.36, .56, .05), .5, spec=.3)
soilm = s.mat('soilc', (.045, .028, .017), .95, spec=.12, tNorm='ph/rough_linen_n.jpg', scale=3., box=True, nStr=1.6)
steel = s.mat('brushed', (.52, .53, .525), .34, metal=1, tNorm='ph/rough_linen_n.jpg', scale=(.2, 4.), box=True, nStr=.12)
plaster = s.mat('plast', (.018, .060, .047), .85, spec=.2, tNorm='ptex/wash_n.png', scale=1 / 5., box=True, nStr=.6)
cutp = s.mat('cutplast', (.10, .15, .12), .9, spec=.1)
pipe = s.mat('pipe', (.014, .015, .0145), .30, spec=.5)
wick = s.mat('wick', (.66, .60, .47), .9, spec=.15)
waterm = s.mat('waterc', (.010, .060, .052), .04, spec=.6, tNorm='ptex/water_n.png', scale=1 / 4., box=True, nStr=.05)

pan, grd, tra = (stl(f'{STL}/{n} Rev 7.STL') for n in ('Pannel', 'Grid', 'Tray'))
lp, lg, lt = loops(pan, 268.99), loops(grd, 230.75), loops(tra, 51.338)


def cap(ls, dy, dz, mat, x=0., biggest=False):
    for l in ls:
        if len(l) < 3: continue
        Q, F = fill(l)
        if not len(F): continue
        P = np.stack([np.full(len(Q), x), (Q[:, 0] + dy) / 100, (Q[:, 1] + dz) / 100], 1)
        n = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])[:, 0]; F = F.copy(); F[n > 0] = F[n > 0][:, ::-1]
        s.add(s.mesh(P, F, mat, N=np.tile([-1., 0, 0], (len(P), 1))))


def grab(k): return Z[k + 'P'] / 100, Z[k + 'F'], Z[k + 'N']


PP, PF, PN = grab('panel'); GP, GF, GN = grab('grid'); VP, VF, VN = grab('vessel')
cp = s.mesh(*(lambda a: (a[0], a[1], pp))(clip(PP, PF, PN)), N=clip(PP, PF, PN)[2])
wp = s.mesh(PP, PF, pp, N=PN)
cg = s.mesh(*(lambda a: (a[0], a[1], pp))(clip(GP, GF, GN)), N=clip(GP, GF, GN)[2])
wg = s.mesh(GP, GF, pp, N=GN)
cv = s.mesh(*(lambda a: (a[0], a[1], pp))(clip(VP, VF, VN)), N=clip(VP, VF, VN)[2])
wv = s.mesh(VP, VF, pp, N=VN)
K, M = plants2.kit(s, ['heart', 'lime', 'mica', 'sche', 'fern', 'draco', 'spider', 'agl'])
r = np.random.default_rng(6)
soil = Z['soil'] / 100
at = lambda x, y, z: xf(t=(x, y, z))
ROWS = (2.6, -2.6)
for j, py in enumerate(ROWS):
    for i in range(0, 3):
        s.add(cp if i == 0 else wp, at(PITCH * i, py, 0)); s.add(cg if i == 0 else wg, at(PITCH * i, py, .40))
    cap(lp, -279.75 + py * 100, 0, face); cap(lg, -230.75 + py * 100, 40, face)
    for rr in range(4):
        y = py + 2.1275 - 1.16 * rr
        for i in range(0, 3):
            for c in range(5):
                x = PITCH * i - 1.95 + .975 * c
                if x < -.01: continue
                cutv = abs(x) < .01
                s.add(cv if cutv else wv, at(x, y, .50))
                # soil
                R = soil * [1, 1]
                P = np.concatenate([[(0, -.04, .26)], np.stack([R[:, 0], np.full(len(R), -.07), R[:, 1]], 1)]); F = np.array([(0, 1 + k, 1 + (k + 1) % len(R)) for k in range(len(R))])
                if cutv: P[:, 0] = np.maximum(P[:, 0], 0)
                s.add(s.mesh(P, F, soilm), at(x, y, .50))
                kind = list(K)[int(abs(np.sin(x * 1.1 + y * .7) * 1.7 + np.sin(x * .6 - y * 1.3) * 1.6) * 1.9 + .2) % len(K)]
                v = K[kind][int(r.integers(len(K[kind])))]
                if cutv and (j, rr) not in ((0, 1), (1, 2)): continue
                if .5 < x < 1.2 and r.random() < .45: continue
                f = 1. if r.random() < .5 else -1.
                s.add(v[0], xf(rotz(r.uniform(-.2, .2)) @ roty((.55 if x < 1.2 else .25 if x < 2.2 else 0)) @ np.diag([f, 1, 1.]), (x + (.1 if cutv else 0), y + .02, .95 if cutv else .86), r.uniform(8.6, 10.6) * (.72 if cutv else .8 if x < 1.2 else 1)), seed=r.random(), id=1)
        if True:
            cap(lt, (y * 100) - 91.287, 25, face)
            # the soil in section: inside the vessel, a little off its walls
            q = np.array([(y * 100 - 6.5, 52.), (y * 100 - 6.0, 115.), (y * 100 - 78, 98.), (y * 100 - 86, 92.), (y * 100 - 87.2, 86), (y * 100 - 87.4, 56), (y * 100 - 84, 52.2)])
            cap([q], 0, 0, soilm, x=.004)
            # the wick: out of the soil, through the hook, down to the water
            pts = np.array([(.018, y - .42, .86), (.018, y - .30, .74), (.018, y - .17, .60), (.018, y - .125, .50), (.018, y - .125, .40), (.018, y - .128, .30), (.018, y - .165, .235), (.018, y - .26, .16), (.018, y - .40, .10), (.018, y - .52, .085)])
            tt = np.linspace(0, 1, len(pts)); fine = np.linspace(0, 1, 60); C = np.stack([np.interp(fine, tt, pts[:, c]) for c in range(3)], 1)
            for _ in range(6): C[1:-1] = (C[:-2] + 2 * C[1:-1] + C[2:]) / 4
            for ph in range(3):   # three strands, plaited
                an = fine * 46 + ph * 2.094; off = np.stack([np.cos(an) * .012, np.sin(an) * .012, np.cos(an + 1) * .004], 1)
                P, F = plants2.tube(C + off, .016, .016, 8); s.add(s.mesh(P, F, wick))
# the wall behind
s.box((.0, -9, -.72), (16, 9, -.12), plaster); s.box((-.004, -9, -.72), (0., 9, -.12), cutp); s.box((.0, -9, -1.1), (16, 9, -.80), cutp)
# the feed along the head: one nozzle to every second channel
TOP = 2.6 + 3.02
P, F, UV = lathe([(.11, 0), (.11, 16), (.085, 16), (.085, 0)], 48); P = np.stack([P[:, 1], P[:, 0], P[:, 2]], 1); s.add(s.mesh(P, F[:, ::-1], pipe), at(0, TOP, .25))
Q = [(np.cos(a) * .11, np.sin(a) * .11) for a in np.linspace(0, 6.283, 64, endpoint=False)]; q = [(np.cos(a) * .085, np.sin(a) * .085) for a in np.linspace(0, 6.283, 64, endpoint=False)]
P = np.array([(0, b, a) for a, b in Q] + [(0, b, a) for a, b in q]); F = []
for k in range(64): k2 = (k + 1) % 64; F += [(k, k2, 64 + k), (k2, 64 + k2, 64 + k)]
s.add(s.mesh(P, np.array(F), face), at(0, TOP, .25))
for k in range(0, 40):
    x = k * .39
    P, F, UV = lathe([(.045, -.40), (.045, 0.), (.030, 0.), (.030, -.40), (.045, -.40)], 24)
    if k == 0: P[:, 0] = np.maximum(P[:, 0], 0)
    s.add(s.mesh(P, F, pipe), at(x, TOP - .08, .25))
for k, sx in enumerate((-1, 1)):  # the cut nozzle
    P = np.array([(0, -.48, .25 + sx * .030), (0, -.48, .25 + sx * .045), (0, -.06, .25 + sx * .045), (0, -.06, .25 + sx * .030)]); F = np.array([(0, 1, 2), (0, 2, 3)]) if sx > 0 else np.array([(0, 2, 1), (0, 3, 2)]); s.add(s.mesh(P, F, face), at(0, TOP, 0))
# the reservoir: folded steel, the foot of the wall hanging inside it
by, ty, z0, z1 = -6.55, -5.02, -.08, 1.55
for lo, hi in (((0, by, z0), (16, by + .03, z1)), ((0, by, z0), (16, ty - .25, z0 + .03)), ((0, by, z1 - .03), (16, ty, z1)), ((0, ty - .03, z1 - .22), (16, ty, z1))):
    s.box(lo, hi, steel, .006)
    P = np.array([(0, lo[1], lo[2]), (0, hi[1], lo[2]), (0, hi[1], hi[2]), (0, lo[1], hi[2])]); s.add(s.mesh(P + [-.003, 0, 0], np.array([(0, 2, 1), (0, 3, 2)]), face))
s.box((0.0, by + .03, z0 + .03), (16, -5.62, z1 - .03), waterm)
# light
s.spot((-7, 8, 9), (.6, -.55, -.62), 3.2, (12, 11.4, 10.4), 0, 1); s.spot((9, 7, 8), (-.62, -.5, -.6), 2.4, (7.5, 8, 7.8), 0, 1); s.spot((-11, 1, 4), (.97, -.05, -.22), 3., (9.5, 9.6, 9.0), 0, 1); s.spot((-9, -7, 4), (.9, .35, -.35), 2., (6, 6.2, 6.), 0, 1)
s.sky = dict(up=[.05, .07, .062], hor=[.03, .05, .044], down=[.02, .025, .022], e=1., group=0)
s.save()
AZ, EL, HT = np.radians(60), np.radians(8), 13.6
d = np.array([np.sin(AZ) * np.cos(EL), -np.sin(EL), -np.cos(AZ) * np.cos(EL)])
AT = np.array([2.15, -.48, .9]); eye = AT - d * 24
H = int(W * 13.6 / 7.6)
import json
rv = np.cross(d, [0, 1, 0]); rv /= np.linalg.norm(rv); uv = np.cross(rv, d)
json.dump(dict(at=AT.tolist(), r=rv.tolist(), u=uv.tolist(), h=HT, w=HT * W / H), open('out/cut_cam.json', 'w'))
rt.render('cut', [('cut', dict(dict(CAM, tile=96, bg=1), eye=eye.tolist(), at=AT.tolist(), ortho=HT, w=W, h=H, spp=SPP, aov=True))])
a, _, _ = rt.load('cut')
from export import denoise
x = denoise(a.sum(2), rt.aov('cut'), kl=2.4, keep=.14); np.save('out/cut_lin.npy', x.astype(np.float32)); rt.save('out/cut.png', x, 1.15)

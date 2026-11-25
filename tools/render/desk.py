"""The journal's desk: rustic oak boards in window light, with the things that lie about on it. z is up, 1 unit is a page.
    python desk.py 3200 300"""
import sys
import numpy as np
import rt, plants2
from roomlib import *
from roomb import *
from roomc import rbox

W, SPP = int(sys.argv[1]), int(sys.argv[2])
U = 1 / .21  # units to a metre


def Rz(a): return np.array([[np.cos(a), -np.sin(a), 0], [np.sin(a), np.cos(a), 0], [0, 0, 1.]])


UP = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0.]])  # y-up models on to a z-up desk


def put(R, t, k=1.):
    M = np.zeros((3, 4)); M[:, :3] = np.asarray(R) * k; M[:, 3] = t; return M


def lathez(s, mat, prof, t, n=96, R=None):
    P, F, UV = lathe(prof, n); s.add(s.mesh(P, F, mat), put(UP if R is None else R, t))


s = Scene('desk', tex=2048)
wood = [s.mat(f'oak{k}', tuple(np.array([.93, .60, .345]) * v), 1., spec=.5, tBase='ph/rough_wood_d.jpg', tNorm='ph/rough_wood_n.jpg', tRough='ph/rough_wood_r.jpg', scale=1., nStr=1.1) for k, v in enumerate((.92, 1.06, .84, 1.0, .9))]
r = np.random.default_rng(4)
y = -3.4
for k in range(9):
    h = r.uniform(.70, 1.02)
    lo, hi = (-5., y + .006, -.12), (5., y + h - .006, 0.)
    P, F, N = rbox(lo, hi, .014, .05)
    u0, v0 = r.random(2)
    UV = np.stack([(P[:, 1] - y) / 2.6 + u0, P[:, 0] / 4.6 + v0], 1)
    s.add(s.mesh(P, F, wood[k % 5], UV=UV, N=N)); y += h
s.box((-6, -5, -.5), (6, 6, -.16), s.mat('gap', (.006, .004, .003), .9))
blk = s.mat('blk2', (.012, .012, .013), .34, spec=.5); brass = s.mat('brs', (.80, .57, .27), .24, metal=1); steel = s.mat('stl', (.6, .6, .6), .22, metal=1)
cream = s.mat('cer', (.70, .67, .61), .30, spec=.5); dkc = s.mat('cerd', (.035, .075, .058), .26, spec=.5)
coffee = s.mat('cof', (.030, .013, .006), .05, spec=.6); crema = s.mat('crm', (.24, .115, .045), .35, spec=.4)
leather = s.mat('lth', (.20, .105, .05), .8, spec=.45, tBase='ph/fabric_leather_01_d.jpg', tNorm='ph/fabric_leather_01_n.jpg', scale=1.4, box=True, nStr=.9)
linen = s.mat('lin2', (.62, .57, .48), .95, spec=.15, tNorm='ph/rough_linen_n.jpg', scale=2.2, nStr=1., box=True)
# linen under the coffee
P, F, N = rbox((-.43, -.43, 0.004), (.43, .43, .022), .008, .02)
w = .006 * np.sin(P[:, 0] * 9 + P[:, 1] * 4) + .006 * np.sin(P[:, 1] * 11 - P[:, 0] * 3); P[:, 2] += w + .004
s.add(s.mesh(P, F, linen), put(Rz(.34), (-1.50, .40, 0)))
cx, cy = -1.48, .40
lathez(s, dkc, [(1e-4, .008), (.17, .008), (.20, .012), (.33, .050), (.335, .054), (.32, .054), (.20, .022), (1e-4, .020)], (cx, cy, .022))
prof = [(1e-4, .02), (.105, .02), (.112, .03), (.165, .115), (.196, .25), (.2, .305), (.196, .31), (.188, .305), (.184, .25), (.155, .125), (.10, .04), (1e-4, .036)]
lathez(s, dkc, prof, (cx, cy, .04))
a_ = np.linspace(0, 2 * np.pi, 97)[:-1]; P = np.concatenate([[[0, 0, 0]], np.stack([.186 * np.cos(a_), .186 * np.sin(a_), 0 * a_], 1)]); F = np.array([[0, 1 + i, 1 + (i + 1) % 96] for i in range(96)]); rot = .5
UV = np.stack([.5 + .5 * (P[:, 0] * np.cos(rot) - P[:, 1] * np.sin(rot)) / .186, .5 - .5 * (P[:, 0] * np.sin(rot) + P[:, 1] * np.cos(rot)) / .186], 1)
flat = s.mat('flat', (1, 1, 1), .32, spec=.35, tBase='ph/flatwhite.png'); s.add(s.mesh(P, F, flat, N=np.tile([0, 0, 1.], (97, 1)), UV=UV), put(np.eye(3), (cx, cy, .285)))
th = np.linspace(-1.15, 1.15, 26)
P, F = plants2.tube(np.stack([.185 + .105 * np.cos(th), .0 * th, .17 + .085 * np.sin(th)], 1), .021, .021, 14)
s.add(s.mesh(P, F, dkc), put(Rz(-.5), (cx, cy, .04)))
# spoon
P, F = plants2.tube(np.array([[0, -.28, .01], [0, 0, .016], [0, .16, .012]]), .010, .013, 10); s.add(s.mesh(P, F, steel), put(Rz(-1.1), (cx + .02, cy - .285, .062)))
g = np.linspace(0, 2 * np.pi, 49)[:-1]; rr = np.linspace(0, 1, 9)[1:]; P = [[0, .215, .004]]; F = []
for rk in rr: P += [[.040 * rk * np.cos(t) * (1 - .16 * np.sin(t)), .215 + .070 * rk * np.sin(t), .004 + .017 * rk ** 2] for t in g]
F += [[0, 1 + i, 1 + (i + 1) % 48] for i in range(48)]
for k in range(7):
    for i in range(48): a0, b0 = 1 + k * 48 + i, 1 + k * 48 + (i + 1) % 48; F += [[a0, a0 + 48, b0 + 48], [a0, b0 + 48, b0]]
s.add(s.mesh(np.array(P), np.array(F), steel), put(Rz(-1.1), (cx + .02, cy - .285, .062)))
# ---- a white phone, face down; a laptop, open
def outline(w, h, rad, n=14):
    o = []
    for q, (sx, sy) in enumerate(((1, 1), (-1, 1), (-1, -1), (1, -1))):
        for a in np.linspace(0, np.pi / 2, n): t = a + q * np.pi / 2; o.append((sx * (w / 2 - rad) + rad * np.cos(t), sy * (h / 2 - rad) + rad * np.sin(t)))
    return np.array(o)


def slab(w, h, z0, z1, rad, bev, mat, top=None, uv=False, M=None):
    """a rounded plate with soft edges; its top can carry a picture"""
    rings = [(bev * .9, z0), (bev * .25, z0 + bev * .3), (0, z0 + bev), (0, z1 - bev), (bev * .12, z1 - bev * .45), (bev * .45, z1 - bev * .12), (bev, z1)]; P = []
    for d, z in rings: o = outline(w - 2 * d, h - 2 * d, max(rad - d, .002)); P.append(np.column_stack([o, np.full(len(o), z)]))
    n = len(P[0]); V = np.concatenate(P); F = []
    for k in range(len(rings) - 1):
        for i in range(n): a, b = k * n + i, k * n + (i + 1) % n; F += [[a, b, b + n], [a, b + n, a + n]]
    s.add(s.mesh(V, np.array(F), mat), M)
    c = np.concatenate([[[0, 0, z1]], P[-1]]); F = np.array([[0, 1 + i, 1 + (i + 1) % n] for i in range(n)]); UV = np.stack([c[:, 0] / w + .5, .5 - c[:, 1] / h], 1) if uv else None
    s.add(s.mesh(c, F, mat if top is None else top, N=np.tile([0, 0, 1.], (n + 1, 1)), UV=UV), M)


def disc(x, y, z0, z1, rad, mat, M, lens=None):
    P, F, UV = lathe([(rad, z0), (rad, z1), (rad * .86, z1), (1e-4, z1)], 40); P = np.stack([P[:, 0] + x, P[:, 2] + y, P[:, 1]], 1); s.add(s.mesh(P, F[:, ::-1], mat), M)
    if lens is not None: P, F, UV = lathe([(rad * .8, z1 + .0012), (1e-4, z1 + .003)], 40); P = np.stack([P[:, 0] + x, P[:, 2] + y, P[:, 1]], 1); s.add(s.mesh(P, F[:, ::-1], lens), M)


alu = s.mat('alu', (.60, .60, .605), .42, spec=.9); white = s.mat('wglass', (.90, .895, .88), .20, spec=.55); back = s.mat('wback', (1, 1, 1), .22, spec=.55, tBase='ph/phoneback.png'); dark = s.mat('lens', (.004, .005, .008), .04, spec=.9); band = s.mat('band', (.86, .85, .83), .22, metal=1)
Mp = put(Rz(.16), (1.50, -.52, .003)); slab(.352, .724, 0, .038, .056, .007, band, back, True, Mp)
slab(.172, .176, .037, .050, .046, .005, white, None, False, put(Rz(.16), np.array([1.50, -.52, .003]) + Rz(.16) @ np.array([-.077, .258, 0])))
for lx, ly in ((-.118, .300), (-.118, .214), (-.038, .257)): disc(lx, ly, .048, .058, .034, band, Mp, dark)
disc(-.038, .318, .048, .0515, .011, s.mat('flash', (.95, .9, .78), .4), Mp)
LX, LY, LR = 2.02, .40, -.13; Ml = put(Rz(LR), (LX, LY, .004)); slab(1.52, 1.06, .006, .056, .055, .010, alu, None, False, Ml)
well = s.mat('well', (.018, .0185, .019), .6); P, F, N = rbox((-.665, -.02, .0545), (.665, .395, .0562), .0008, .004); s.add(s.mesh(P, F, well, N=N), Ml)
keym = s.mat('keys', (1, 1, 1), .52, spec=.35, tBase='ph/keys.png')
from desk_up import ROWS
for r_, row in enumerate(ROWS):
    tot = sum(w for _, w in row); x_ = 0
    for t_, w_ in row:
        x0, x1 = -.655 + 1.31 * x_ / tot + .005, -.655 + 1.31 * (x_ + w_) / tot - .005; y1, y0 = .386 - r_ * .0665 - .004, .386 - (r_ + 1) * .0665 + .004; P, F, N = rbox((x0, y0, .0555), (x1, y1, .0625), .004, .003); UV = np.stack([(P[:, 0] + .655) / 1.31, (.386 - P[:, 1]) / .399], 1); s.add(s.mesh(P, F, keym, N=N, UV=UV), Ml); x_ += w_
P, F, N = rbox((-.30, -.46, .0555), (.30, -.075, .0567), .0006, .012); s.add(s.mesh(P, F, s.mat('pad', (.565, .565, .57), .38, spec=.8), N=N), Ml)
tilt = np.array([[1, 0, 0], [0, np.cos(1.92), -np.sin(1.92)], [0, np.sin(1.92), np.cos(1.92)]]); Mh = np.zeros((3, 4)); Mh[:, :3] = Rz(LR) @ tilt; Mh[:, 3] = np.array([LX, LY, .06]) + Rz(LR) @ np.array([0, .515, 0]) + Rz(LR) @ tilt @ np.array([0, .50, 0])
slab(1.52, .99, -.012, .010, .05, .006, alu, dark, False, Mh); scr = s.mat('scr', (1, 1, 1), .25, spec=.4, tBase='ph/screen.png'); P = np.array([[-.73, -.45, .0112], [.73, -.45, .0112], [.73, .46, .0112], [-.73, .46, .0112]]); s.add(s.mesh(P, np.array([[0, 1, 2], [0, 2, 3]]), scr, UV=np.array([[0, 1], [1, 1], [1, 0], [0, 0.]])), Mh)
# fountain pen
R = np.array([[0, 0, 1], [0, 1, 0], [-1, 0, 0.]])  # lathe axis along x
pen = put(Rz(1.12), (-1.36, -.42, .036))
for mat, prof in ((blk, [(1e-4, -.36), (.020, -.355), (.030, -.30), (.034, -.1), (.035, 0.)]), (brass, [(.0365, 0.), (.0365, .022)]), (blk, [(.0375, .022), (.0375, .20), (.034, .27), (.022, .30), (1e-4, .305)]), (brass, [(.0378, .20), (.0378, .212)])):
    P, F, UV = lathe(prof, 48); P = np.stack([P[:, 1], P[:, 0], P[:, 2]], 1); s.add(s.mesh(P, F[:, ::-1], mat), pen)
P, F, N = rbox((.06, -.010, .036), (.27, .010, .044), .0035, .006); s.add(s.mesh(P, F, brass, N=N), pen)
# CC0 objects
def obj(name, size, t, yaw):
    for q in (gltf(s, name, put(Rz(yaw) @ UP, t, U * size)) or []): pass
# a plant reaching in from the corner
K, M = plants2.kit(s, ['heart', 'mica', 'fern'])
for k, (kind, x, yy, zz, yaw, sc) in enumerate((('heart', -2.05, 1.02, .34, -.5, 2.3), ('mica', -1.78, 1.10, .30, .2, 2.1), ('heart', -2.22, .78, .30, -1.0, 2.2), ('fern', -2.3, 1.12, .28, -.9, 2.4), ('mica', -2.0, .70, .22, -.8, 1.9), ('heart', 2.44, -1.12, .3, 2.3, 2.1), ('mica', 2.26, -1.28, .28, 2.7, 2.1))):
    s.add(K[kind][k % len(K[kind])][0], put(Rz(yaw), (x, yy, zz), sc), seed=.3 + k * .1, id=1)
# window light from the left, broken by its bars and by leaves outside; a warm lamp on the right
s.quad((-7.6, -1.6, 2.2), (0, 4.6, 0), (2.1, 0, 3.6), tuple(np.array([17., 13.6, 9.6]) * 1.5), 0)
bar = s.mat('bar', (.02, .02, .02), .8)
for yb in (-.15, 1.35): s.box((-6.5, yb - .05, 1.2), (-6.2, yb + .05, 6.), bar)
for k in range(26): s.add(K['heart'][k % 4][0], put(Rz(r.uniform(0, 6)) @ UP, (-5.4 + r.uniform(-.6, .6), r.uniform(-1.8, 3.2), r.uniform(1.6, 4.2)), r.uniform(3.2, 5.)), seed=r.random(), id=1)
s.spot((2.9, 2.5, 2.6), (-.45, -.55, -.75), .34, (95, 62, 30), 0, 3)
s.sun = dict(dir=[-.74, .20, .64], size=.02, e=[5.2, 4.1, 2.75], group=0)
for zb in (1.5, 2.9, 4.3): s.box((-4.4, -4, zb), (-4.3, 5, zb + .13), bar)
for yb in (-2.4, -1.0, .4, 1.8, 3.2): s.box((-4.4, yb, 0), (-4.3, yb + .13, 6), bar)
s.box((-4.4, -4, -.2), (-4.3, 5, .75), bar)
s.sky = dict(up=[.10, .095, .085], hor=[.12, .10, .08], down=[.02, .02, .02], e=1., group=0)
s.save()
FOV, LIFT, D = .95, .22, 3.89
H = W // 2
eye = [.12, -D * np.sin(LIFT), D * np.cos(LIFT)]
cam = dict(dict(CAM, tile=96, bg=1), eye=eye, at=[.12, 0, 0], up=[0, 1, 0], fov=float(np.degrees(FOV)), shiftY=0., w=W, h=H, spp=SPP, aov=True)
rt.render('desk', [('desk', cam)])
a, _, _ = rt.load('desk')
from export import denoise
x = denoise(a.sum(2), rt.aov('desk'), kl=2.4, keep=.14)
np.save('out/desk_lin.npy', x.astype(np.float32))
rt.save('out/desk.png', x, 1.)

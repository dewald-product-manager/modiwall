"""For every leaf of every planting: is it ever seen once the wall has closed, and how much shade do its neighbours throw
on it? Written beside the plantings as one byte a leaf (0 hidden, otherwise its light), so a wall never has to change
its look after it has grown."""
import os, sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, maximum_filter
D = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')) + '/src/wall/'
SIZE = {'forest': (3.6, 2.4, 2304), 'fern': (2.4, 1.6, 1536), 'jungle': (2.4, 1.6, 1536)}
OWN = 600.

A = np.asarray(Image.open(D + 'plants-id.webp').convert('RGB')).astype(int)
A = A[..., 0] + A[..., 1] * 256
b = np.fromfile(D + 'plants.bin', '<i2')
ns = int(b[0])
kinds = b[4:4 + ns * 4].reshape(-1, 4).astype(int)
leaves = b[4 + ns * 4:].reshape(-1, 6).astype(float)


def stamps(name):
    W, H, pw = SIZE[name]
    ph = round(pw * H / W)
    t = np.fromfile(D + name + '.bin', '<i2')
    n, np_ = int(t[0]), int(t[1])
    P = t[2 + n * 8:2 + n * 8 + np_ * 6].reshape(-1, 6).astype(float)
    out = []
    k2 = pw / W / OWN
    for x, y, kind, rot, size, z in P:
        first, cnt, rx, ry = kinds[int(kind)]
        s = size / 1000 * k2
        c, q = np.cos(rot / 10000), np.sin(rot / 10000)
        for k in range(cnt):
            l = leaves[first + k]
            zz = z + l[4]
            cor = np.array([(l[i], l[j]) for i in (0, 2) for j in (1, 3)]) * abs(s)
            cor[:, 0] *= np.sign(s)
            cor = np.stack([cor[:, 0] * c + cor[:, 1] * q, cor[:, 1] * c - cor[:, 0] * q], 1)
            x0, y0 = np.floor(cor.min(0) + (x, y)).astype(int) - 1
            x1, y1 = np.ceil(cor.max(0) + (x, y)).astype(int) + 1
            X, Y = np.meshgrid(np.arange(x0, x1) + .5 - x, np.arange(y0, y1) + .5 - y)
            u, v = X * c - Y * q, X * q + Y * c
            u = u * np.sign(s) / abs(s) + rx
            v = v / abs(s) + ry
            ui, vi = np.floor(u).astype(int), np.floor(v).astype(int)
            ok = (ui >= 0) & (vi >= 0) & (ui < A.shape[1]) & (vi < A.shape[0])
            m = np.zeros_like(ok)
            m[ok] = A[vi[ok], ui[ok]] == first + k + 1
            yy, xx = np.nonzero(m)
            out.append((yy + y0, xx + x0, zz))
    return out, pw, ph, pw / W


def run(name):
    S, w, h, ppm = stamps(name)
    seen = np.zeros(len(S), int)
    Hm = None
    for par in ((0, 0), (.5, 0), (-.5, 0), (0, .5), (0, -.5)):
        I = np.full((h, w), -1)
        Z = np.full((h, w), -60.)
        for i, (yy, xx, z) in enumerate(S):
            sh = z / 1000 * ppm * .34
            a, c = (yy + round(par[1] * sh)) % h, (xx + round(par[0] * sh)) % w
            I[a, c] = i
            Z[a, c] = z
        seen = np.maximum(seen, np.bincount(I[I >= 0], minlength=len(S)))
        if Hm is None:
            Hm = Z
    soft = gaussian_filter(Hm, 2., mode='wrap')
    wide = gaussian_filter(maximum_filter(Hm, 9, mode='wrap'), 16., mode='wrap')
    sun = np.zeros(Hm.shape)
    for d in (5, 9, 14, 21, 30, 42):
        o = np.roll(soft, (int(d * .9), int(d * .42)), (0, 1))     # light comes from above and a little to the left
        sun = np.maximum(sun, o - d / ppm * 1000 * .62)
    lit = np.zeros(len(S))
    for i, (yy, xx, z) in enumerate(S):
        if not len(yy):
            continue
        a, c = yy % h, xx % w
        ao = np.clip((wide[a, c] - z) / 95., 0, 1).mean()
        shade = np.clip((sun[a, c] - z) / 34., 0, 1).mean()
        lit[i] = np.clip(1.06 - .62 * ao - .46 * shade, .12, 1)
    out = np.where(seen >= 9, np.clip(np.round(lit * 255), 1, 255), 0).astype('u1')
    raw = np.clip(np.round(lit * 255), 1, 255).astype('u1')
    open(D + name + '-lit.bin', 'wb').write(raw.tobytes() + (out > 0).astype('u1').tobytes())
    print(name, 'leaves', len(S), 'ever seen', int((out > 0).sum()), 'light', np.percentile(lit, [5, 25, 50, 75, 95]).round(2))


for n in (sys.argv[1] if len(sys.argv) > 1 else 'forest,fern,jungle').split(','):
    run(n)

# the outline of every leaf, row by row, so the card only looks where there is leaf
ROWS = 4
out = np.zeros((len(leaves), ROWS + 1, 2), 'u1')
for kind in kinds:
    first, cnt, rx, ry = kind
    for k in range(cnt):
        l = leaves[first + k]
        x0, y0, x1, y1 = (int(v) for v in (rx + l[0], ry + l[1], rx + l[2], ry + l[3]))
        m = np.zeros((y1 - y0, x1 - x0), bool)
        sub = A[max(y0, 0):y1, max(x0, 0):x1] == first + k + 1
        m[max(0, -y0):max(0, -y0) + sub.shape[0], max(0, -x0):max(0, -x0) + sub.shape[1]] = sub
        h, w = m.shape
        ext = []
        for r in range(ROWS):
            a, b = int(np.floor(h * r / ROWS)), int(np.ceil(h * (r + 1) / ROWS))
            c = np.nonzero(m[a:b].any(0))[0]
            ext.append((max(0, (c[0] - 1.5) / w), min(1, (c[-1] + 2.5) / w)) if len(c) else (0.5, 0.5))
        for r in range(ROWS + 1):
            lo = min(ext[max(0, r - 1)][0], ext[min(ROWS - 1, r)][0])
            hi = max(ext[max(0, r - 1)][1], ext[min(ROWS - 1, r)][1])
            out[first + k, r] = np.floor(lo * 255), np.ceil(hi * 255)
open(D + 'plants-hull.bin', 'wb').write(out.tobytes())
print('outlines', len(leaves), 'area kept', round(float((out[..., 1].astype(float) - out[..., 0]).mean() / 255), 3))

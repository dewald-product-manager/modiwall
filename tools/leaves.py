"""The shape of every leaf, for the living wall: python tools/leaves.py   (numpy, Pillow)
Each traced leaf keeps its normals (src/wall/plants-aux.png). From them this fits the leaf's surface as a gentle curved sheet,
h = A u + B v + C u^2 + D u v + E v^2 + F over its own box (u, v from -1 to 1, h in plant pixels, mean zero), so the engine can
lean, cup and fold the leaf in true depth: it shifts with the eye, casts and takes shadow, and turns its face to the light.
Writes src/wall/plants-shape.bin (six int16 to a leaf, in eighths of a pixel) and copies it beside the other plantings.
"""
import os
import shutil
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src', 'wall')
b = np.fromfile(os.path.join(SRC, 'plants.bin'), '<i2')
ns, nl, aw, ah = (int(v) for v in b[:4])
kinds = b[4:4 + ns * 4].reshape(-1, 4).astype(int)
rows = b[4 + ns * 4:].reshape(-1, 6).astype(float)
ids = np.asarray(Image.open(os.path.join(SRC, 'plants-id.webp')).convert('RGB')).astype(int)
ids = ids[..., 0] + ids[..., 1] * 256
aux = np.asarray(Image.open(os.path.join(SRC, 'plants-aux.png')).convert('RGB')).astype(np.float32) / 255
aux = np.asarray(Image.fromarray((aux * 255).astype('u1')).resize((aw, ah), Image.BILINEAR)).astype(np.float32) / 255
nx, ny = aux[..., 1] * 2 - 1, aux[..., 2] * 2 - 1
nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0.0225, 1))
gx = np.clip(-nx / nz, -2.2, 2.2)  # how the surface rises across the picture, right and down
gy = np.clip(ny / nz, -2.2, 2.2)
out = np.zeros((nl, 6))
for first, cnt, rx, ry in kinds:
    for k in range(cnt):
        x0, y0, x1, y1, z, _ = rows[first + k]
        X0, Y0, X1, Y1 = int(rx + x0), int(ry + y0), int(rx + x1), int(ry + y1)
        sub = ids[max(Y0, 0):Y1, max(X0, 0):X1] == first + k + 1
        inner = sub.copy()  # the rim of a leaf has its normals smeared with whatever lies behind it
        inner[1:] &= sub[:-1]; inner[:-1] &= sub[1:]; inner[:, 1:] &= sub[:, :-1]; inner[:, :-1] &= sub[:, 1:]
        if inner.sum() < 12: inner = sub
        yy, xx = np.nonzero(inner)
        if len(yy) < 6: continue
        yy, xx = yy + max(Y0, 0), xx + max(X0, 0)
        cx, cy, hx, hy = (X0 + X1) / 2, (Y0 + Y1) / 2, max((X1 - X0) / 2, 1), max((Y1 - Y0) / 2, 1)
        u, v = (xx + .5 - cx) / hx, (yy + .5 - cy) / hy
        w = nz[yy, xx]  # a face turned to the eye is read most surely
        # slopes of h: dh/dx = (A + 2Cu + Dv)/hx, dh/dy = (B + Du + 2Ev)/hy
        o, e = np.ones_like(u), np.zeros_like(u)
        M = np.concatenate([np.stack([o, e, 2 * u, v, e], 1) / hx, np.stack([e, o, e, u, 2 * v], 1) / hy]) * np.concatenate([w, w])[:, None]
        r = np.concatenate([gx[yy, xx], gy[yy, xx]]) * np.concatenate([w, w])
        A, B, C, D, E = np.linalg.lstsq(M.T @ M + np.diag([.05, .05, .4, .4, .4]) * len(u) / hx / hy, M.T @ r, rcond=None)[0]
        h = A * u + B * v + C * u * u + D * u * v + E * v * v
        F = -h.mean()
        # no leaf is deeper than about half its own length: blades seen edge on would otherwise stand out like spears
        span = np.ptp(h)
        lim = .55 * max(hx, hy)
        s = min(1, lim / max(span, 1e-3))
        out[first + k] = np.array([A, B, C, D, E, F]) * s
q = np.clip(np.round(out * 8), -32767, 32767).astype('<i2')
path = os.path.join(SRC, 'plants-shape.bin')
q.tofile(path)
shutil.copyfile(path, os.path.join(ROOT, 'public', 'img', 'wall', 'plants-shape.bin'))
amp = np.abs(out[:, :2]).sum(1)
print(nl, 'leaves', 'tilt px p50/p95', np.percentile(amp, [50, 95]).round(1), 'cup p50/p95', np.percentile(np.abs(out[:, 2:5]).sum(1), [50, 95]).round(1), os.path.getsize(path), 'bytes')

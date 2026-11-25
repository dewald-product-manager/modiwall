"""The moulded parts, from CAD to the web. Reads the STL exports (kept out of git) and writes img/system/parts.bin.

    python tools/cad.py "Pannel Rev 7.STL" "Grid Rev 7.STL" "Tray Rev 7.STL" [parts.npz]

Every sharp edge gets a fine rounded bevel, every corner its own baked shade, and the joint is drawn slightly free,
so what the page carries is a display model and not a tool drawing. Millimetres; y up, z out of the wall.
"""
import gzip
import os
import sys

import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

HERE = os.path.dirname(os.path.abspath(__file__))
OX, OY = 268.99, 279.75  # the middle of the grid, in the panel drawing
CREASE = np.cos(np.radians(33))


def stl(f):
    b = open(f, 'rb').read()
    n = int.from_bytes(b[80:84], 'little')
    v = np.frombuffer(b[84:84 + 50 * n], dtype=np.dtype([('n', '<f4', 3), ('v', '<f4', (3, 3)), ('a', '<u2')]))['v'].astype(float)
    u, i = np.unique(np.round(v.reshape(-1, 3), 3), axis=0, return_inverse=True)
    F = i.reshape(-1, 3)
    return u, F[(F[:, 0] != F[:, 1]) & (F[:, 1] != F[:, 2]) & (F[:, 2] != F[:, 0])]


def unit(n):
    return n / np.maximum(np.linalg.norm(n, axis=-1, keepdims=True), 1e-12)


def fnormals(P, F):
    return unit(np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]]))


def nxt(h):
    return h - h % 3 + (h + 1) % 3


def bevel(P, F, b, front):
    """split at sharp edges, draw each face in by b, and bridge the gaps; what lies behind front stays sharp, unseen"""
    N = fnormals(P, F)
    nf = len(F)
    e = np.stack([F, np.roll(F, -1, 1)], -1).reshape(-1, 2)  # half edges, three to a face
    key = e.min(1).astype(np.int64) * len(P) + e.max(1)
    o = np.argsort(key, kind='stable')
    k = key[o]
    st = np.r_[0, np.nonzero(np.diff(k))[0] + 1]
    two = st[np.diff(np.r_[st, len(k)]) == 2]
    h0, h1 = o[two], o[two + 1]
    ok = e[h0, 0] == e[h1, 1]
    h0, h1 = h0[ok], h1[ok]
    soft = np.einsum('ij,ij->i', N[h0 // 3], N[h1 // 3]) > CREASE
    twin = np.full(nf * 3, -1)
    twin[h0], twin[h1] = h1, h0
    hard = np.ones(nf * 3, bool)
    hard[h0[soft]] = hard[h1[soft]] = False
    # corners of neighbouring faces join across soft edges
    a, c = h0[soft], h1[soft]
    I, J = np.r_[a, nxt(a)], np.r_[nxt(c), c]
    n, lab = connected_components(coo_matrix((np.ones(len(I)), (I, J)), shape=(nf * 3, nf * 3)), directed=False)
    V = np.zeros((n, 3))
    V[lab] = P[F.reshape(-1)]
    c0 = P[F.reshape(-1)]
    c1 = P[np.roll(F, -1, 1).reshape(-1)] - c0
    c2 = P[np.roll(F, 1, 1).reshape(-1)] - c0
    ang = np.arccos(np.clip(np.einsum('ij,ij->i', unit(c1), unit(c2)), -1, 1))
    VN = np.zeros((n, 3))
    np.add.at(VN, lab, np.repeat(N, 3, 0) * ang[:, None])
    VN = unit(VN)
    # each split corner has one sharp edge leaving and one arriving: move inwards from both
    M = np.zeros((n, 2, 3))
    has = np.zeros((n, 2), int)
    for h in np.nonzero(hard)[0]:
        m = unit(np.cross(N[h // 3], P[e[h, 1]] - P[e[h, 0]]))
        for s, hh in ((0, h), (1, nxt(h))):
            M[lab[hh], s] += m
            has[lab[hh], s] += 1
    m = unit(M)
    off = (m[:, 0] + m[:, 1]) / np.maximum(1 + np.einsum('ij,ij->i', m[:, 0], m[:, 1]), .25)[:, None]
    off[~(has == 1).all(1)] = 0
    G = lab.reshape(-1, 3)
    amt = np.where(V[:, 2] < front, 0, b)
    for _ in range(14):
        W = V + off * amt[:, None]
        bad = np.einsum('ij,ij->i', fnormals(W, G), N) < .9
        if not bad.any():
            break
        amt[np.unique(G[bad])] *= .6
    W = V + off * amt[:, None]
    # strips along the sharp edges, and a cap on every corner
    T = []
    for a, c in zip(h0[~soft], h1[~soft]):
        p0, p1, q0, q1 = lab[a], lab[nxt(a)], lab[nxt(c)], lab[c]
        T += [(p0, q0, q1), (p0, q1, p1)]
    start = {}
    for h in np.nonzero(hard & (twin >= 0))[0]:
        start.setdefault(e[h, 0], {})[lab[h]] = lab[nxt(twin[h])]  # this copy, and the one across the edge
    for g in start.values():
        if len(g) < 3:
            continue
        s = next(iter(g))
        ring, c = [s], g[s]
        while c != s and c in g and len(ring) < 20:
            ring.append(c)
            c = g[c]
        if c == s:
            T += [(ring[0], ring[i + 1], ring[i]) for i in range(1, len(ring) - 1)]
    T = np.array(T)
    fl = np.einsum('ij,ij->i', np.cross(W[T[:, 1]] - W[T[:, 0]], W[T[:, 2]] - W[T[:, 0]]), VN[T].sum(1)) < 0
    T[fl] = T[fl][:, ::-1]
    A = np.concatenate([G, T])
    A = A[np.linalg.norm(np.cross(W[A[:, 1]] - W[A[:, 0]], W[A[:, 2]] - W[A[:, 0]]), axis=1) > 1e-7]
    return W, VN, A


def shade(P, N, occP, occF, n=110, res=900, lift=1.2):
    """how much of the room each corner sees, from depth maps taken all round the front"""
    tri = occP[occF]
    acc = np.zeros(len(P))
    wt = np.zeros(len(P))
    Q = P + N * lift
    for i in range(n):
        z = 1 - (i + .5) / n * 1.15  # nothing arrives through the wall behind
        ph = i * 2.399963 + .3
        r = np.sqrt(max(0, 1 - z * z))
        D = np.array([r * np.cos(ph), r * np.sin(ph), z])
        u = unit(np.cross(D, [0, 1, 0] if abs(D[1]) < .9 else [1, 0, 0]))
        R = np.stack([u, np.cross(D, u), D])
        t, q = tri @ R.T, Q @ R.T
        lo = np.minimum(t[..., :2].reshape(-1, 2).min(0), q[:, :2].min(0))
        hi = np.maximum(t[..., :2].reshape(-1, 2).max(0), q[:, :2].max(0))
        s = (res - 3) / (hi - lo).max()
        Z = np.full((res, res), -1e9)
        for (a, b, c), zz in zip((t[..., :2] - lo) * s + 1, t[..., 2]):
            d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
            if abs(d) < 1e-6:
                continue
            x0, x1 = int(min(a[0], b[0], c[0])), int(max(a[0], b[0], c[0])) + 1
            y0, y1 = int(min(a[1], b[1], c[1])), int(max(a[1], b[1], c[1])) + 1
            X = np.arange(x0, x1 + 1)[None, :]
            Y = np.arange(y0, y1 + 1)[:, None]
            k = ((b[1] - c[1]) * (X - c[0]) + (c[0] - b[0]) * (Y - c[1])) / d
            l = ((c[1] - a[1]) * (X - c[0]) + (a[0] - c[0]) * (Y - c[1])) / d
            zv = np.where((k >= 0) & (l >= 0) & (k + l <= 1), k * zz[0] + l * zz[1] + (1 - k - l) * zz[2], -1e9)
            S = Z[y0:y1 + 1, x0:x1 + 1]
            np.maximum(S, zv, out=S)
        xy = np.rint((q[:, :2] - lo) * s + 1).astype(int)
        cos = np.maximum(N @ D, 0)
        acc += cos * (Z[xy[:, 1], xy[:, 0]] < q[:, 2] + .9)
        wt += cos
    return np.where(wt > .5, acc / np.maximum(wt, .5), .12)


def oct8(n):
    n = n / np.abs(n).sum(1, keepdims=True)
    s = np.where(n[:, :2] >= 0, 1, -1)
    return np.rint(np.where(n[:, 2:] < 0, (1 - np.abs(n[:, 1::-1])) * s, n[:, :2]) * 127).astype(np.int8)


def inside(P, F, y):
    """the inside of the vessel at one height, in order round"""
    seg = []
    for t in P[F]:
        d = t[:, 1] - y
        if d.min() < 0 < d.max():
            seg += [t[i] + (t[(i + 1) % 3] - t[i]) * d[i] / (d[i] - d[(i + 1) % 3]) for i in range(3) if (d[i] < 0) != (d[(i + 1) % 3] < 0)]
    seg = np.array(seg)
    a, b = seg[0::2][:, [0, 2]], seg[1::2][:, [0, 2]]
    c = np.array([0., 24.])
    out = []
    for k in range(48):
        th = -np.pi + (k + .5) / 48 * 2 * np.pi
        d = np.array([np.cos(th), np.sin(th)])
        e = b - a
        det = d[0] * -e[:, 1] + e[:, 0] * d[1]
        det = np.where(np.abs(det) < 1e-9, 1e-9, det)
        w = a - c
        t = (w[:, 0] * -e[:, 1] + e[:, 0] * w[:, 1]) / det
        u = (d[0] * w[:, 1] - d[1] * w[:, 0]) / det
        out.append(c + d * (t[(t > 0) & (u >= -.01) & (u <= 1.01)].min() - .1))
    return np.array(out)


if __name__ == '__main__':
    panel, grid, tray = (stl(f) for f in sys.argv[1:4])
    P = panel[0].copy()
    for ax, at in ((0, 530.75), (1, 18.01)):  # the rods, a little slim
        m = np.abs(P[:, ax] - at) < 18.4
        P[m, ax] = at + (P[m, ax] - at) * .965
        P[m, 2] = 25 + (P[m, 2] - 25) * .965
    T = tray[0] - [51.338, 91.287, 25]  # origin on the back face, level with the rim
    parts = [('panel', P - [OX, OY, 0], panel[1], .85, .5), ('grid', grid[0] - [230.75, 230.75, 0], grid[1], .55, 4.5), ('vessel', T, tray[1], .55, -99)]
    blob, keep = [], {}
    for name, P, F, b, front in parts:
        W, N, A = bevel(P, F, b, front)
        ao = shade(W, N, P, F)
        print(name, len(F), '->', len(A), 'triangles', len(W), 'corners', W.min(0).round(1), W.max(0).round(1), 'shade', ao.min().round(2), ao.mean().round(2))
        flat = A.reshape(-1)
        _, first = np.unique(flat, return_index=True)  # corners in the order they are drawn
        o = flat[np.sort(first)]
        back = np.zeros(len(W), int)
        back[o] = np.arange(len(o))
        A = back[A]
        assert len(o) < 65536
        # a column at a time, each as steps from the last: it packs to a third
        step = lambda c, t: np.diff(c.astype(np.int64), prepend=0).astype(t).tobytes()
        pos = np.rint(W[o] * 50)  # fiftieths of a millimetre
        nor = oct8(N[o])
        pad = lambda b: b + b'\0' * (-len(b) % 4)
        blob += [np.array([len(o), A.size], '<u4').tobytes()] + [pad(step(pos[:, k], '<i2')) for k in range(3)]
        blob += [pad(step(nor[:, k], 'i1')) for k in range(2)] + [pad(step(np.rint(np.clip(ao[o], 0, 1) * 255), 'i1')), pad(step(A.reshape(-1), '<i2'))]
        keep.update({name + 'P': W[o], name + 'N': N[o], name + 'F': A})
    r = inside(T, tray[1], -5.)
    keep['soil'] = r
    blob.append(np.array([len(r)], '<u4').tobytes() + (r / 100).astype('<f4').tobytes())
    d = os.path.join(HERE, '..', 'src', 'static', 'img', 'system')
    os.makedirs(d, exist_ok=True)
    data = gzip.compress(b''.join(blob), 9, mtime=0)
    open(os.path.join(d, 'parts.bin'), 'wb').write(data)
    print(len(data) // 1024, 'KB')
    if len(sys.argv) > 4:
        np.savez(sys.argv[4], **keep)

"""Six plantings: three for inside, three for outside. python themes.py sprites|atlas|plates|pack [names] [quality]"""
import sys, json, os
import numpy as np
import rt, plants2
from wall import layout, drop, plantwall, backing
from scenelib import *
from PIL import Image
from scipy.ndimage import distance_transform_edt

PX = 600
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../src/wall')
T = {  # mix, size, drift
 'in-morning': dict(mix=dict(lime=5.2, marble=3.6, spider=3.4, schev=1.5, heart=2.8, syng=2.2, mica=2.6, drar=1.8, julii=1.2), density=4.2, ang=.62, str=2.6, mixin=.06, W=2.4, H=1.6, pw=1536, seed=61, keep=dict()),
 'in-midday': dict(mix=dict(heart=7, sche=3.4, draco=3, sello=1.6, mica=2.6, fern=3.2, lime=2.6, marble=1.0, spider=1.8, monstera=1.0), density=4.0, ang=.62, str=2.9, mixin=.06, W=3.6, H=2.4, pw=2304, seed=44, keep=dict(monstera=.75, sello=.34)),
 'in-evening': dict(mix=dict(fern=5, heart=3, monstera=1.6, purple=3.6, lily=2.4, pep=3, draco=2.2, lirio=2.4, sello=1.2), density=4.2, ang=-.55, str=2.5, mixin=.07, W=2.4, H=1.6, pw=1536, seed=23, keep=dict(monstera=.62, sello=.4, lily=.16)),
 'ex-morning': dict(mix=dict(fescue=2.6, helich=4, silver=3.2, spek=2.6, plect=2.4, sedum=1.6, spider=2.4), density=4.6, ang=.6, str=2.4, mixin=.07, W=2.4, H=1.6, pw=1536, seed=31, keep=dict()),
 'ex-midday': dict(mix=dict(bulb=4.4, crass=3.8, spek=4.2, sedum=3.4, fescue=1.6, plect=1.6, silver=1.2), density=4.6, ang=-.6, str=2.4, mixin=.07, W=2.4, H=1.6, pw=1536, seed=12, keep=dict()),
 'ex-evening': dict(mix=dict(setc=3.4, aspar=4.2, plect=4.6, lirio=2.6, fern=2.2, silver=1.2, helich=.9), density=4.2, ang=.5, str=2.3, mixin=.07, W=2.4, H=1.6, pw=1536, seed=52, keep=dict()),
}
LIGHT = dict(sun=dict(dir=[-.55, .78, .6], size=.07, e=[3.7, 3.45, 2.95], group=0), sky=dict(up=[1.25, 1.4, 1.6], hor=[.62, .68, .74], down=[.12, .13, .12], e=.85, group=1))
lum = lambda x: (x * [.2126, .7152, .0722]).sum(-1)


def key(a): return (a[..., 2, 0].round().astype(np.int64) * 512 + a[..., 2, 1].round().astype(np.int64)) * (a[..., 0, 3] < 1e5) * (a[..., 2, 0] > .5)


def merge(K, minA, cap):
    u, c = np.unique(K, return_counts=True); big = {}
    for k, n in zip(u.tolist(), c.tolist()):
        if k > 0: big.setdefault(k // 512, []).append((n, k))
    re = {0: 0}
    for p, l in big.items():
        l.sort(reverse=True); keep = [k for n, k in l if n >= minA][:cap] or [l[0][1]]
        for n, k in l: re[k] = k if k in keep else keep[0]
    ak = np.array(sorted(re)); av = np.array([re[k] for k in ak])
    return lambda Q: np.where(np.isin(Q, ak), av[np.searchsorted(ak, Q).clip(0, len(ak) - 1)], 0), np.array(sorted(set(re.values()) - {0}))


def sprites(q):
    s = Scene('spr2', tex=1024); K, M = plants2.kit(s); s.sun = LIGHT['sun']; s.sky = LIGHT['sky']
    P = np.concatenate(s.V)[:, :3]; jobs, meta, i = [], [], 0
    for k in K:
        for v in range(len(K[k])):
            m = K[k][v][0]; c = np.array([i * 4., 0, 0]); s.add(m, xf(t=c), seed=.5, id=1); tr = s.T[m]
            p = P[tr[:, :3].astype(int).ravel()]; lo, hi = p.min(0), p.max(0); pad = 6 / PX
            x0, x1, y0, y1 = lo[0] - pad, hi[0] + pad, lo[1] - pad, hi[1] + pad
            w, h = int(np.ceil((x1 - x0) * PX)), int(np.ceil((y1 - y0) * PX)); x1 = x0 + w / PX; y0 = y1 - h / PX
            cx, cy = (x0 + x1) / 2 + c[0], (y0 + y1) / 2
            jobs.append((f'sp2_{i}', dict(eye=[float(cx), float(cy), 6.], at=[float(cx), float(cy), 0.], ortho=h / PX, w=w, h=h, spp=int(260 * q), aov=True)))
            meta.append(dict(kind=k, v=v, w=w, h=h, rx=float(-x0 * PX), ry=float(y1 * PX))); i += 1
    s.save(); json.dump(meta, open('out/spr2.json', 'w')); rt.render('spr2', jobs, False)


def build(name):
    t = T[name]; s = Scene('pl_' + name, tex=1024)
    K, M = plants2.kit(s, list(dict.fromkeys(list(t['mix']) + ['heart'])))
    L, _, _ = layout(t['W'], t['H'], t, t['seed'], px=.098, py=.108)
    if t['keep']: L = drop(L, None, t['keep'])
    rec = plantwall(s, K, L, t['seed'] + 1, 1, wrap=(t['W'], t['H']), scale=1.06)
    backing(s, M, (-2, -2), (t['W'] + 2, t['H'] + 2)); s.sun = LIGHT['sun']; s.sky = LIGHT['sky']; s.save()
    json.dump([[r[1], r[8], *map(float, r[2]), float(r[3]), float(r[6]), float(r[7])] for r in rec], open(f'out/pl_{name}_plants.json', 'w'))


def plates(names, q):
    for n in names:
        t = T[n]; build(n); W, H, pw = t['W'], t['H'], t['pw']
        rt.render('pl_' + n, [(f'pl_{n}', dict(eye=[W / 2, H / 2, 6], at=[W / 2, H / 2, 0], ortho=H, w=pw, h=round(pw * H / W), spp=int(300 * q), aov=True))])
        a, _, _ = rt.load('pl_' + n); rt.save(f'out/pl_{n}.png', a.sum(2), 1.)


def atlas(exp=1.0):
    S = json.load(open('out/spr2.json')); order = sorted(range(len(S)), key=lambda i: -S[i]['h']); AW = 2048; x = y = rowh = 0; pos = {}
    for i in order:
        w, h = S[i]['w'], S[i]['h']
        if x + w > AW: x = 0; y += rowh; rowh = 0
        pos[i] = (x, y); x += w; rowh = max(rowh, h)
    AH = int(np.ceil((y + rowh) / 64) * 64); C = np.zeros((AH, AW, 3)); I = np.zeros((AH, AW), int); X = np.zeros((AH, AW, 3)); X[..., 1:] = .5; rows, off, base = [], [], 0
    for i, q in enumerate(S):
        a = rt.aov(f'sp2_{i}'); im, al, _ = rt.load(f'sp2_{i}'); K = key(a); m, g = merge(K, 60, 24); n = len(g); Mm = m(K); L = np.where(Mm > 0, np.searchsorted(g, Mm) + 1, 0)
        yy, xx = np.nonzero(L); l = L[yy, xx]; bb = np.zeros((n + 1, 4)); bb[:, :2] = 1e9; bb[:, 2:] = -1e9; dx, dy = xx - q['rx'], yy - q['ry']
        np.minimum.at(bb[:, 0], l, dx); np.minimum.at(bb[:, 1], l, dy); np.maximum.at(bb[:, 2], l, dx + 1); np.maximum.at(bb[:, 3], l, dy + 1)
        z = np.bincount(L.ravel(), weights=a[..., 3, 2].ravel(), minlength=n + 1) / np.maximum(np.bincount(L.ravel(), minlength=n + 1), 1)
        o = np.argsort(z[1:]) + 1; rank = np.zeros(n + 1, int); rank[o] = np.arange(1, n + 1)
        t = im.sum(2) / np.maximum(al[..., None], .05); c = rt.srgb(rt.film(t, exp)); ins = al > .9
        idx = distance_transform_edt(~ins, return_distances=False, return_indices=True); c = c[idx[0], idx[1]]
        px, py = pos[i]; h, w = K.shape; C[py:py + h, px:px + w] = c; rr = rank[L]; I[py:py + h, px:px + w] = np.where(rr > 0, rr + base, 0); N = a[..., 0, :3]
        X[py:py + h, px:px + w] = np.stack([lum(im[..., 0, :]) / np.maximum(lum(im.sum(2)), 1e-5), N[..., 0] * .5 + .5, N[..., 1] * .5 + .5], -1).clip(0, 1)
        off.append((base, n, round(px + q['rx']), round(py + q['ry'])))
        for k in o: rows.append([*np.floor(bb[k, :2]) - 1, *np.ceil(bb[k, 2:]) + 1, round(z[k] * 1000), 0])
        base += n
    Image.fromarray((C * 255 + .5).astype('u1')).save(f'{OUT}/plants.png')
    Image.fromarray(np.stack([I & 255, I >> 8, np.zeros_like(I)], -1).astype('u1')).save(f'{OUT}/plants-id.webp', lossless=True, quality=100, method=6)
    Image.fromarray((X * 255).astype('u1')).resize((AW // 2, AH // 2), Image.BOX).save(f'{OUT}/plants-aux.png')
    open(f'{OUT}/plants.bin', 'wb').write(np.array([len(S), base, AW, AH], '<i2').tobytes() + np.array(off, '<i2').tobytes() + np.array(rows, '<i2').tobytes())
    json.dump(dict(pos=pos, aw=AW, ah=AH), open('out/atlas.json', 'w')); print('atlas', AW, AH, len(S), 'plants', base, 'leaves')


def pack(names):
    S = json.load(open('out/spr2.json')); si = {(q['kind'], q['v']): i for i, q in enumerate(S)}
    At = np.asarray(Image.open(f'{OUT}/plants.png').convert('RGB')).astype(np.float32) / 255
    Id = np.asarray(Image.open(f'{OUT}/plants-id.webp').convert('RGB')).astype(int); Id = Id[..., 0] + Id[..., 1] * 256
    b = np.fromfile(f'{OUT}/plants.bin', '<i2'); ns = int(b[0]); kinds = b[4:4 + ns * 4].reshape(-1, 4).astype(int); leaves = b[4 + ns * 4:].reshape(-1, 6).astype(float)
    for name in names:
        t = T[name]; W, H, pw = t['W'], t['H'], t['pw']; ph = round(pw * H / W); px = pw / W; k2 = px / PX
        P = json.load(open(f'out/pl_{name}_plants.json'))
        Q = np.array([[x * px, (H - y) * px, si[(k, v)], ro * 10000, sc * 1000 * fl, zz * 1000] for k, v, x, y, zz, sc, ro, fl in P])
        perm = np.argsort(Q[:, 5], kind='stable'); Q = Q[perm].round().astype(np.int16)
        open(f'{OUT}/{name}.bin', 'wb').write(np.array([0, len(Q)], '<i2').tobytes() + Q.astype('<i2').tobytes())
        C = np.zeros((ph, pw, 3), np.float32); st = []
        for qi, (x, y, kind, rot, size, z) in enumerate(Q.astype(float)):
            first, cnt, rx, ry = kinds[int(kind)]; s = size / 1000 * k2; c, q = np.cos(rot / 10000), np.sin(rot / 10000)
            for k in range(cnt):
                l = leaves[first + k]; cor = np.array([(l[i], l[j]) for i in (0, 2) for j in (1, 3)]) * abs(s); cor[:, 0] *= np.sign(s)
                cor = np.stack([cor[:, 0] * c + cor[:, 1] * q, cor[:, 1] * c - cor[:, 0] * q], 1)
                x0, y0 = np.floor(cor.min(0) + (x, y)).astype(int) - 1; x1, y1 = np.ceil(cor.max(0) + (x, y)).astype(int) + 1
                Xg, Yg = np.meshgrid(np.arange(x0, x1) + .5 - x, np.arange(y0, y1) + .5 - y)
                u, v = Xg * c - Yg * q, Xg * q + Yg * c; u = u * np.sign(s) / abs(s) + rx; v = v / abs(s) + ry; ui, vi = np.floor(u).astype(int), np.floor(v).astype(int)
                ok = (ui >= 0) & (vi >= 0) & (ui < Id.shape[1]) & (vi < Id.shape[0]); m = np.zeros_like(ok); m[ok] = Id[vi[ok], ui[ok]] == first + k + 1
                yy, xx = np.nonzero(m); st.append((yy + y0, xx + x0, z + l[4], vi[m], ui[m], perm[qi] + 1))
        # the engine draws plants from the furthest to the nearest, and within a plant its leaves the same way
        seen = np.zeros(len(st), int); I = None; order = np.argsort([q[2] for q in st], kind='stable')
        for par in ((0, 0), (.5, 0), (-.5, 0), (0, .5), (0, -.5)):
            J = np.full((ph, pw), -1)
            for i in order:
                yy, xx, z, vi, ui, pid = st[i]
                sh = z / 1000 * px * .34; J[(yy + round(par[1] * sh)) % ph, (xx + round(par[0] * sh)) % pw] = i
            seen = np.maximum(seen, np.bincount(J[J >= 0], minlength=len(st)))
            if I is None: I = J
        Pid = np.zeros((ph, pw), int)
        for i, (yy, xx, z, vi, ui, pid) in enumerate(st):
            yy, xx = yy % ph, xx % pw; m = I[yy, xx] == i; C[yy[m], xx[m]] = At[vi[m], ui[m]]; Pid[yy[m], xx[m]] = pid
        im, _, _ = rt.load('pl_' + name); plate = rt.srgb(rt.film(im.sum(2), 1.06)).astype(np.float32)
        # the light on every leaf: what the traced wall shows, over what the leaf shows alone; smoothed only within its own leaf
        on = (I >= 0)[..., None]; aov = rt.aov('pl_' + name); same_plant = (aov[..., 2, 0].round().astype(int) == Pid) & (I >= 0)
        # the same point of the same leaf, not a neighbour's: colours must also agree once brightness is taken out
        cn, pn = C / (lum(C)[..., None] + .02), plate / (lum(plate)[..., None] + .02); ok = (same_plant & (np.abs(cn - pn).max(-1) < .55))[..., None].astype(np.float32)
        num, den = plate * ok, np.maximum(C, .02) * ok
        acc_n, acc_d = num.copy(), den.copy()
        for rad in (1, 1, 2, 3, 5, 8, 12):   # what is missing is carried across from the rest of its own leaf
            a = np.zeros_like(num); d = np.zeros_like(den)
            for oy in (-rad, 0, rad):
                for ox in (-rad, 0, rad):
                    same = (np.roll(I, (oy, ox), (0, 1)) == I)[..., None].astype(np.float32); a += np.roll(acc_n, (oy, ox), (0, 1)) * same; d += np.roll(acc_d, (oy, ox), (0, 1)) * same
            if rad <= 2: acc_n, acc_d = a, d
            else:
                w = np.clip(1 - acc_d.sum(-1, keepdims=True) / .4, 0, 1); acc_n = acc_n + a * w * .2; acc_d = acc_d + d * w * .2
        n = len(st); L_ = I.ravel() + 1; mn = np.stack([np.bincount(L_, weights=num[..., c].ravel(), minlength=n + 1) / np.maximum(np.bincount(L_, weights=den[..., c].ravel(), minlength=n + 1), 1e-3) for c in range(3)], 1); mn[mn.sum(1) == 0] = .42
        have = np.clip(acc_d.sum(-1, keepdims=True) / .12, 0, 1); R = (acc_n / np.maximum(acc_d, 1e-3)) * have + mn[I + 1] * (1 - have)
        R = np.where(on, R, .25).clip(0, 2.5); g = lum(R)[..., None]; R = (g + (R - g) * .15).clip(.04, 1.9)
        print(name, 'matched', round(float(ok.mean()), 3))
        idx = distance_transform_edt(I < 0, return_distances=False, return_indices=True); R = R[idx[0], idx[1]]
        Image.fromarray((np.sqrt(R / 2) * 255 + .5).astype('u1')).save(f'{OUT}/{name}-light.png')
        Image.fromarray((np.where(on, C * R, .02).clip(0, 1) * 255).astype('u1')).save(f'out/re_{name}.png')
        lit = np.array([R[yy % ph, xx % pw].mean() if len(yy) else .5 for yy, xx, *_ in st]); out = seen >= 9
        open(f'{OUT}/{name}-lit.bin', 'wb').write(np.clip(np.round(lit / 1.2 * 255), 1, 255).astype('u1').tobytes() + out.astype('u1').tobytes())
        print(name, len(Q), 'plants', len(st), 'leaves', int(out.sum()), 'seen', 'ratio', np.percentile(R, [2, 25, 50, 75, 98]).round(2), 'bare', round(float((I < 0).mean()), 3))
    ROWS = 4; o = np.zeros((len(leaves), ROWS + 1, 2), 'u1')
    for first, cnt, rx, ry in kinds:
        for k in range(cnt):
            l = leaves[first + k]; x0, y0, x1, y1 = (int(v) for v in (rx + l[0], ry + l[1], rx + l[2], ry + l[3])); m = np.zeros((y1 - y0, x1 - x0), bool)
            sub = Id[max(y0, 0):y1, max(x0, 0):x1] == first + k + 1; m[max(0, -y0):max(0, -y0) + sub.shape[0], max(0, -x0):max(0, -x0) + sub.shape[1]] = sub; h, w = m.shape; ext = []
            for r in range(ROWS):
                a, e = int(np.floor(h * r / ROWS)), int(np.ceil(h * (r + 1) / ROWS)); c = np.nonzero(m[a:e].any(0))[0]
                ext.append((max(0, (c[0] - 1.5) / w), min(1, (c[-1] + 2.5) / w)) if len(c) else (.5, .5))
            for r in range(ROWS + 1):
                o[first + k, r] = np.floor(min(ext[max(0, r - 1)][0], ext[min(ROWS - 1, r)][0]) * 255), np.ceil(max(ext[max(0, r - 1)][1], ext[min(ROWS - 1, r)][1]) * 255)
    open(f'{OUT}/plants-hull.bin', 'wb').write(o.tobytes())


if __name__ == '__main__':
    what = sys.argv[1]; names = sys.argv[2].split(',') if len(sys.argv) > 2 and sys.argv[2] != 'all' else list(T); q = float(sys.argv[3]) if len(sys.argv) > 3 else 1
    {'sprites': lambda: (sprites(q), atlas()), 'atlas': atlas, 'plates': lambda: plates(names, q), 'pack': lambda: pack(names)}[what]()

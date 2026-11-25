"""Every species on its own, for the plant pages: a small plant against pale plaster."""
import numpy as np, sys, rt, plants2
from scenelib import *
from PIL import Image
from export import denoise
s = Scene('spec', tex=1024); K, M = plants2.kit(s)
wall = s.mat('pl', (.80, .785, .75), .95, spec=.1); jobs = []
P0 = np.concatenate(s.V)[:, :3]
for n, k in enumerate(K):
    best = max(range(len(K[k])), key=lambda v: len(K[k][v][1])); m = K[k][best][0]; p = P0[s.T[m][:, :3].astype(int).ravel()]
    lo, hi = p.min(0), p.max(0); c = (lo + hi) / 2; size = max(hi[0] - lo[0], hi[1] - lo[1]) * 1.28
    x = n * 6.; s.add(m, xf(t=(x, 0, 0)), seed=.5, id=1); s.box((x - 2.5, -2.5, -.30), (x + 2.5, 2.5, -.24), wall)
    s.box((x - .05, -.10, -.05), (x + .05, -.005, .035), M['black'], .008)
    jobs.append((f'spc_{k}', dict(eye=[float(x + c[0]), float(c[1]), 6.], at=[float(x + c[0]), float(c[1]), 0.], ortho=float(size), w=720, h=720, spp=220, aov=True)))
s.sun = dict(dir=[-.5, .72, .62], size=.10, e=[2.6, 2.4, 2.05], group=0); s.sky = dict(up=[1.0, 1.08, 1.16], hor=[.74, .77, .80], down=[.34, .34, .33], e=.9, group=0)
s.save(); rt.render('spec', jobs, False)
import os
O = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../src/static/img/plants'); os.makedirs(O, exist_ok=True)
for k in K:
    a, _, _ = rt.load(f'spc_{k}'); x = denoise(a.sum(2), rt.aov(f'spc_{k}'), kl=2.2, keep=.12); im = Image.fromarray((np.clip(rt.srgb(rt.film(x, .92)), 0, 1) * 255 + .5).astype('u1')); im.save(f'{O}/{k}.avif', quality=62, speed=4); im.save(f'out/spc_{k}.png')
print(len(K))

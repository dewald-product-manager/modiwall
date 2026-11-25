"""Three pieces: the panel, the grid and the vessel, photographed from the CAD meshes (tools/cad.py writes parts.npz).

    python pieces.py parts.npz 1700 400
"""
import sys
import numpy as np
import rt
from roomlib import *
from roomb import *

Z = np.load(sys.argv[1])
W, SPP = int(sys.argv[2]), int(sys.argv[3])


def rot(ax, a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]] if ax == 'x' else [[c, 0, s], [0, 1, 0], [-s, 0, c]] if ax == 'y' else [[c, -s, 0], [s, c, 0], [0, 0, 1]])


def part(s, name, mat, R, x=0., z=0.):
    """set it down on the floor, turned"""
    P = Z[name + 'P'] / 100
    P = P - (P.min(0) + P.max(0)) / 2
    q = P @ R.T
    M = np.zeros((3, 4))
    M[:, :3] = R
    M[:, 3] = [x, -q[:, 1].min() + .002, z]
    s.add(s.mesh(P, Z[name + 'F'], mat, N=Z[name + 'N']), M)


def stage(name):
    s = Scene(name, tex=1024)
    sw = s.mat('sweep', (.0065, .027, .0205), .7, spec=.16)
    pts = [(18., 0.), (-6.5, 0.)] + [(-6.5 - 4 * np.sin(t), 4 - 4 * np.cos(t)) for t in np.linspace(.08, np.pi / 2, 24)] + [(-10.5, 22.)]
    P, F = [], []
    for z, y in pts:
        P += [(-40, y, z), (40, y, z)]
    for k in range(len(pts) - 1):
        F += [(2 * k, 2 * k + 1, 2 * k + 3), (2 * k, 2 * k + 3, 2 * k + 2)]
    s.add(s.mesh(np.array(P), np.array(F), sw))
    pp = s.mat('pp', (.016, .0175, .017), .40, spec=.5)
    # one large softbox above and left, a tall strip behind right, a low bounce
    s.spot((-5.5, 8.5, 5.), (.5, -.85, -.5), 2.6, (13, 12.4, 11.6), 0, 1)
    s.spot((7.5, 4., -3.), (-.92, -.22, .34), 1.5, (15, 16.5, 16.), 0, 1)
    s.spot((0., 10.5, -2.), (0, -1, .1), 2.2, (7, 7, 7), 0, 1)
    s.spot((-2.6, 7.4, -7.4), (.22, -.62, .75), 2.0, (9.5, 9.6, 9.2), 0, 1)  # the sheen across a flat face
    s.sky = dict(up=[.02, .03, .028], hor=[.015, .025, .022], down=[.01, .01, .01], e=1., group=0)
    return s, pp


def shoot(name, eye, at, fov):
    from PIL import Image
    from export import denoise
    H = round(W * 600 / 850)
    rt.render(name, [(name, dict(dict(CAM, tile=96, bg=1), eye=list(eye), at=list(at), fov=fov, shiftY=0., w=W, h=H, spp=SPP, aov=True))])
    a, _, _ = rt.load(name)
    img = rt.srgb(rt.film(denoise(a.sum(2), rt.aov(name), kl=2.2, keep=.12), 1.25))
    img += np.random.default_rng(1).normal(0, .004, img.shape[:2])[..., None]  # a little grain, so the sweep does not band
    Image.fromarray((np.clip(img, 0, 1) * 255 + .5).astype('u1')).save(f'out/{name}.png')


which = sys.argv[4].split(',') if len(sys.argv) > 4 else ['panel', 'grid', 'vessel']
FLAT = rot('x', -np.pi / 2)
if 'panel' in which:
    s, pp = stage('p_panel')
    part(s, 'panel', pp, rot('y', .62) @ FLAT)
    s.save()
    shoot('p_panel', (.1, 7.3, 8.9), (.0, .12, .2), 34)
if 'grid' in which:
    s, pp = stage('p_grid')
    part(s, 'grid', pp, rot('y', -.5) @ FLAT)
    s.save()
    shoot('p_grid', (-.1, 6.6, 7.6), (.0, .0, .1), 32)
if 'vessel' in which:
    s, pp = stage('p_vessel')
    s.spot((-2.4, 2.6, 4.6), (.45, -.4, -.8), .9, (17, 16.4, 15.6), 0, 1)
    part(s, 'vessel', pp, rot('y', .42), -.62, .45)
    part(s, 'vessel', pp, rot('y', -.55), .50, .62)
    part(s, 'vessel', pp, rot('y', np.pi - .62), .12, -.95)
    s.save()
    shoot('p_vessel', (-.05, 1.95, 4.9), (-.04, .40, -.05), 29)

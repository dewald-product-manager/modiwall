"""The dark hall: charcoal walls, slim bronze fins, planted bays under a concealed light, a polished floor, one thin line
of light overhead. Baked one bay pair at a time for src/js/corridor.js."""
from roomc import *
GAP = 3.6
HX = 2.15
FL = -1.35
CE = 1.75
P = 2 * GAP


def build(name='hall'):
    s = Scene(name, tex=2048)
    m = darks(s)
    wall = s.mat('hw', (.31, .318, .302), 1., spec=.3, tBase='ptex/cem_d.png', tNorm='ptex/cem_n.png', tRough='ptex/cem_r.png', scale=1 / 3.6, box=True, nStr=.8)
    ceil = s.mat('hc', (.105, .108, .103), 1., spec=.2, tBase='ptex/cem_d.png', scale=1 / 3.1, box=True)
    N = 2
    z0, z1 = -P * N - 1.8, P * N + 1.8
    s.box((-HX - 1, FL - .3, z0), (HX + 1, FL, z1), m['bas'])
    s.box((-HX - 1, CE + .30, z0), (HX + 1, CE + .6, z1), m['black'])
    K, M = plants.kit(s)
    L, _, _ = layout(2.96, 2.86, dict(WSTY, density=3.2, str=2.2, mix=dict(heart=8, lime=1.2, fern=5, spider=2.6, lily=2.6, monstera=2., pep=2.4, syng=1.2, lirio=1.6)), 91, px=.10, py=.11)
    L = drop(L, None, dict(monstera=.8, lily=.17))
    for k in range(-2 * N, 2 * N + 1):
        z = -k * GAP
        for side in (-1, 1):
            photo = (k % 2 == 0) == (side < 0)
            X = lambda a, b: (min(side * a, side * b), max(side * a, side * b))
            if photo:
                a = X(HX, HX + .6)
                s.box((a[0], FL + .04, z - 1.76), (a[1], CE + .2, z + 1.76), wall)
                a = X(HX + .02, HX + .6)
                s.box((a[0], FL, z - 1.76), (a[1], FL + .04, z + 1.76), m['black'])     # shadow gap at the foot
                # a concealed line at the foot and one at the head, washing the wall
                a = X(HX - .10, HX - .02)
                s.quad((a[0], CE + .03, z - 1.6), (a[1] - a[0], 0, 0), (0, 0, 3.2), (7.5, 6.4, 4.8), 0)
                a = X(HX + .005, HX + .03)
                s.quad((a[0], FL + .038, z - 1.6), (a[1] - a[0], 0, 0), (0, 0, 3.2), (15, 11.2, 7.0), 0)
                for dz in ((-.8, 0, .8) if abs(k) <= 2 else ()):
                    s.spot((side * (HX - .72), CE - .004, z + dz), (side * .56, -1, 0), .03, (1250, 1020, 720), 0, 9)
            else:
                a = X(HX + .16, HX + .7)
                s.box((a[0], FL, z - 1.76), (a[1], CE + .3, z + 1.76), M['black'])
                a = X(HX - .02, HX + .3)
                s.box((a[0], FL, z - 1.70), (a[1], FL + .09, z + 1.70), m['bz'], .003)
                F = np.zeros((3, 4))
                F[:, :3] = np.stack([np.array([0, 0, side * 1.]), np.array([0, 1, 0.]), np.array([-side * 1., 0, 0])], 1)
                F[:, 3] = [side * (HX + .15), FL + .10, z - side * 1.48]
                plantwall(s, K, L, 5, 1, frame=F)
                a = X(HX - .34, HX - .12)
                s.quad((a[0], CE + .10, z - 1.5), (a[1] - a[0], 0, 0), (0, 0, 3.0), (58, 50, 37), 0)
                for dz in (-.9, 0, .9) if abs(k) <= 2 else ():
                    s.spot((side * (HX - 1.0), CE - .004, z + dz), (side * .62, -1, 0), .03, (700, 600, 440), 0, 8)
        # slim bronze fins between one bay and the next
        zp = z - GAP / 2
        for side in (-1, 1):
            a = (min(side * (HX - .10), side * (HX + .7)), max(side * (HX - .10), side * (HX + .7)))
            s.box((a[0], FL, zp - .02), (a[1], CE + .25, zp + .02), m['bz'], .002)
    # a floating ceiling, dark, with open edges, and one thin line of light along it
    s.box((-HX + .42, CE, z0), (-.022, CE + .08, z1), ceil)
    s.box((.022, CE, z0), (HX - .42, CE + .08, z1), ceil)
    s.quad((-.020, CE + .012, z0), (.040, 0, 0), (0, 0, z1 - z0), (52, 45, 34), 0, 0, 1)
    s.save()
    return s


V = {'elev': dict(w=2016, h=868, eye=[0, (FL + CE) / 2, -GAP / 2], at=[-1, (FL + CE) / 2, -GAP / 2], ortho=CE - FL),
     'floor': dict(w=2016, h=1204, eye=[0, .2, -GAP / 2], at=[0, -1, -GAP / 2], up=[1, 0, 0], ortho=2 * HX),
     'ceil': dict(w=1512, h=903, eye=[0, .2, -GAP / 2], at=[0, 1.2, -GAP / 2], up=[1, 0, 0], ortho=2 * HX)}
if __name__ == '__main__':
    k = float(sys.argv[1])
    spp = int(sys.argv[2])
    build()
    js = []
    for n, v in V.items():
        v = dict(v)
        v['w'] = int(v['w'] * k) // 2 * 2
        v['h'] = int(v['h'] * k) // 2 * 2
        js.append((f'hall_{n}', dict(v, spp=spp, bounces=8, clamp=3, maxv=20, tile=160, aov=True)))
    if len(sys.argv) > 3:
        js.append(('hall_view', dict(w=1280, h=720, spp=spp, bounces=8, clamp=3, maxv=20, tile=160, eye=[0, .12, 2.35], at=[-.25, .12, -2], fov=56)))
    rt.render('hall', js)
    for n, _ in js:
        a, _, _ = rt.load(n)
        rt.save(f'out/{n}.png', a.sum(2), 1.)

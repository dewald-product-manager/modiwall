"""Come home to it: a living room at dusk. Groups: 0 what is left of the day, 1 the pendants, 2 the planted wall, 3 the floor lamp."""
from roomc import *


def cush(s, mat, lo, hi, b, M, step=.012, amp=0., seed=1, crown=.0):
    P, F, N = rbox(lo, hi, b, step)
    if crown:
        c = (np.array(lo) + np.array(hi)) / 2
        h = (np.array(hi) - np.array(lo)) / 2
        q = (P - c) / h
        P[:, 1] += np.where(q[:, 1] > 0, crown * (1 - q[:, 0] ** 2) * (1 - q[:, 2] ** 2), 0)
    if amp:
        P = nub(P, N, .0125, amp, seed)
    s.add(s.mesh(P, F, mat), M)


def low_sofa(s, m, mat, t, yaw, w=2.9, d=1.06):
    M = place(t, yaw)
    n = 3
    cush(s, mat, (-w / 2, .07, -d / 2), (w / 2, .25, d / 2), .05, M, .013, .0036, 21)
    cw = (w - .02) / n
    for k in range(n):
        x = -w / 2 + .01 + k * cw
        cush(s, mat, (x + .003, .24, -d / 2 + .20), (x + cw - .003, .43, d / 2 + .015), .062, M, .0125, .0036, 30 + k, .022)
        Rb = rotx(-.19)
        P, F, N = rbox((-cw / 2 + .004, 0, -.10), (cw / 2 - .004, .44, .10), .085, .0125)
        q = P / np.array([cw / 2, .44, .10])
        P[:, 2] += np.where(q[:, 2] > 0, .03 * (1 - q[:, 0] ** 2), 0)
        P = nub(P, N, .0125, .0036, 40 + k)
        M2 = np.zeros((3, 4))
        M2[:, :3] = M[:, :3] @ Rb
        M2[:, 3] = M[:, :3] @ np.array([x + cw / 2, .40, -d / 2 + .20]) + M[:, 3]
        s.add(s.mesh(P, F, mat), M2)
    cush(s, mat, (-w / 2, .07, -d / 2 - .05), (w / 2, .58, -d / 2 + .10), .06, M, .013, .0036, 51)
    cush(s, mat, (-w / 2 - .20, .07, -d / 2 - .05), (-w / 2 - .003, .50, d / 2), .07, M, .013, .0036, 52)
    P, F, UV, N = box_mesh((-w / 2 - .12, 0, -d / 2 + .06), (w / 2 - .08, .075, d / 2 - .08))
    s.add(s.mesh(P, F, m['black'], UV=UV, N=N), M)


def tube_pendant(s, m, x, z, y0, y1, drop, e):
    """a slim bronze stem that becomes a stick of opal glass"""
    r = .021
    op = s.mat('opal1', (.92, .90, .86), .35, spec=.4, emit=tuple(e * np.array([1., .80, .55])), egroup=1)
    P, F, UV = lathe([(1e-4, y0), (r * .7, y0 + .004), (r, y0 + .016), (r, y1)], 40)
    s.add(s.mesh(P, F, op), place((x, 0, z)))
    cyl(s, m['bz'], (x, y1, z), r * 1.12, .09, .003)
    cyl(s, m['bz'], (x, y1 + .09, z), .0042, drop - y1 - .09, .0)
    cyl(s, m['bz'], (x, drop - .02, z), .034, .022, .003)
    E = np.array([1., .77, .50]) * e * 11
    q = r * 1.75
    for k in range(4):
        a = k * np.pi / 2
        n = np.array([np.cos(a), 0, np.sin(a)])
        t = np.array([-np.sin(a), 0, np.cos(a)])
        p = np.array([x, y0 + .01, z]) + n * (r + .004) - t * q / 2
        u, v = t * q, np.array([0, y1 - y0 - .02, 0])
        if np.dot(np.cross(u, v), n) < 0:
            p, u = p + u, -u
        s.quad(p, u, v, E, 1, 0, 0)


def night2(name):
    s = Scene(name, tex=2048)
    m = darks(s)
    XL, XR, H, Z = -4.15, 4.5, 3.4, 12.
    s.box((XL - .02, -.2, -.6), (XR + .4, 0, Z), m['bas'])
    s.box((XL - .4, H, -.6), (XR + .4, H + .3, Z), m['cemd'])
    s.box((XL - .5, H - .10, -.6), (XL - .02, H + .3, Z), m['black'])
    s.box((XR, 0, -.6), (XR + .4, H + .3, Z), m['cemd'])
    s.box((XL - 1, 0, Z - .1), (XR + .4, H + .3, Z), m['black'])
    s.box((XL, 0, -.6), (XR + .4, H, -.36), m['black'])
    # glass wall: slim bronze frames, floor to ceiling
    for z in (-.02, 1.9, 3.82, 5.74, 7.66, 9.58):
        s.box((XL - .06, 0, z - .02), (XL + .02, H, z + .02), m['bz'], .002)
    s.box((XL - .06, 0, -.1), (XL + .02, .03, Z), m['bz'], .002)
    # outside: terrace, pool, trees, the last of the light
    s.box((-40, -.24, -30), (XL - .08, -.03, 30), m['lime'])
    w = s.mat('waterd', (.010, .040, .050), .03, spec=.6, tNorm='ptex/water_n.png', scale=1 / 3., box=True, nStr=.06)
    s.box((-11.5, -.05, -6), (-6.6, -.022, 9), w)
    for x, z, hh, y in ((-13.5, -3.2, 5.6, 0.), (-15, 2.6, 6.4, 2.), (-12.6, 6.8, 4.2, 1.2), (-19, -9, 7.5, .6), (-10.4, -9.5, 5.2, 2.6), (-21, 8, 7., 4.)):
        gltf(s, 'island_tree_01', place((x, -.03, z), y), height=hh, tint=(.55, .62, .5), vary=.2)
    s.box((-60, -.03, -14.6), (-9, 1.9, -14.2), m['wash'])
    s.quad((-11.4, .012, -5.9), (.03, 0, 0), (0, 0, 14.7), (9, 11, 12), 0)
    # the back wall: dark plaster, a long walnut console with a lit edge, then the planting
    px0 = -1.55
    s.box((XL, 0, -.36), (px0 - .10, H, -.12), m['cem'])
    s.box((px0 - .10, 0, -.36), (px0 - .06, H, .10), m['bz'], .002)
    s.box((XL + .45, .44, -.12), (px0 - .45, .50, .34), m['smokeb'], .003)
    s.quad((XL + .5, .436, -.10), (px0 - XL - 1.0, 0, 0), (0, 0, .05), (20, 13.5, 8.), 3)
    gltf(s, 'ceramic_vase_01', place((px0 - .95, .50, .10), .4), height=.42)
    gltf(s, 'ceramic_vase_04', place((px0 - 1.35, .50, .14), 1.4), height=.26)
    for k, (dx, c) in enumerate(((0, m['loop']), (.012, m['clay']), (-.01, m['cem']))):
        s.box((XL + .85 + dx, .50 + k * .03, -.02), (XL + 1.18 + dx, .528 + k * .03, .24), c, .003)
    tk = s.mat('tank', (.50, .51, .505), .34, metal=1); s.box((px0 - .05, .012, -.36), (XR, .27, .24), tk, .004); s.box((px0 - .062, .27, -.36), (XR, .282, .252), tk, .003)   # the steel reservoir the wall stands in, as wide as the wall
    K, M = plants.kit(s)
    W2 = XR - px0 - .02
    L, _, _ = layout(W2, H - .28, dict(WSTY, density=2.1, str=2.8, mix=dict(heart=8, lime=1.0, fern=5.5, spider=2., lily=2.6, monstera=3., pep=2.4, syng=1.2, lirio=1.6)), 71, px=.105, py=.12)
    L = drop(L, None, dict(monstera=.75, lily=.18))
    plantwall(s, K, L, 13, 1, frame=xf(t=(px0 - .03, .26, -.20)), scale=1.05)
    s.box((px0 - .06, .05, -.34), (XR, H, -.24), M['black'])
    # the room
    P, F, N = rbox((-1.75, .001, 1.35), (3.45, .020, 5.15), .009, .0086)
    Q = nub(P, N, .0165, .0062, 12)
    P = np.where((N[:, 1] > .2)[:, None], Q, P)
    s.add(s.mesh(P, F, m['pile']))
    low_sofa(s, m, m['loop'], (3.0, .022, 3.25), -np.pi / 2 + .04)
    cushion(s, m['hide'], (3.16, .64, 2.45), -np.pi / 2 + .2, .46, -.36)
    cushion(s, m['clay'], (3.12, .62, 4.0), -np.pi / 2 - .16, .44, -.36)
    tub(s, m, m['loop'], (-.62, .022, 2.35), .72)
    # one block of travertine, and a small bronze drum
    cush(s, m['tvb'], (.55, .022, 2.35), (1.75, .33, 3.75), .006, place((0, 0, 0)), .08)
    cyl(s, m['bz'], (.30, .022, 4.05), .24, .44, .004)
    gltf(s, 'ceramic_vase_02', place((1.0, .33, 2.75), .4), height=.30)
    gltf(s, 'wooden_bowl_01', place((1.35, .33, 3.35), 1.), height=.075)
    for k, (dx, c) in enumerate(((0, m['clay']), (.012, m['loop']))):
        s.box((.78 + dx, .33 + k * .03, 3.30), (1.06 + dx, .358 + k * .03, 3.62), c, .003)
    # floor lamp: a stem and one thin opal disc
    lx, lz = -1.15, 1.15
    cyl(s, m['bz'], (lx, 0, lz), .15, .016, .003)
    cyl(s, m['bz'], (lx, .016, lz), .008, 1.62, .0)
    disc = s.mat('disc', (.92, .9, .86), .4, spec=.3, emit=(5.2, 3.9, 2.4), egroup=3)
    P, F, UV = lathe([(1e-4, 1.612), (.205, 1.612), (.215, 1.619), (.215, 1.626), (1e-4, 1.627)], 90)
    s.add(s.mesh(P, F, disc), place((lx, 0, lz)))
    P, F, UV = lathe([(1e-4, 1.628), (.217, 1.628), (.217, 1.637), (1e-4, 1.64)], 90)
    s.add(s.mesh(P, F, m['bz']), place((lx, 0, lz)))
    s.quad((lx - .17, 1.604, lz - .17), (.34, 0, 0), (0, 0, .34), (74, 54, 32), 3)
    # pendants
    for x, z, y0 in ((.62, 2.05, 1.62), (.98, 2.45, 1.95), (1.28, 1.92, 1.36), (1.62, 2.40, 1.74), (.30, 2.6, 2.1)):
        tube_pendant(s, m, x, z, y0, y0 + .62, H, 5.5)
    # the planting: a slot above, and small heads set back
    s.quad((px0 + .05, H - .004, .14), (XR - px0 - .1, 0, 0), (0, 0, .30), (27, 23, 17), 2)
    for x in np.linspace(px0 + .5, XR - .5, 6):
        s.spot((x, H - .004, 1.7), (0, -.95, -.80), .035, (1150, 980, 730), 2, 12)
    s.sky = dict(up=[.30, .46, .86], hor=[1.05, .74, .62], down=[.05, .05, .06], e=.62, group=0)
    s.quad((-5.4, .2, -1.), (0, 4.2, 0), (0, 0, 12.), (.62, .88, 1.42), 0)
    s.save()
    return s


VN = dict(eye=[.0, 1.34, 8.5], at=[.0, 1.34, 0], fov=42, shiftY=.05)
if __name__ == '__main__':
    w, spp = int(sys.argv[1]), int(sys.argv[2])
    h = w * 9 // 16
    night2('rb_night')
    rt.render('rb_night', [('rb_night', dict(dict(CAM, tile=96, bg=1), **VN, w=w, h=h, spp=spp, aov=True))])
    a, _, _ = rt.load('rb_night')
    for g in range(4):
        rt.save(f'out/rb_night_{g}.png', a[..., g, :], .9)
    rt.save('out/rb_night.png', a.sum(2), .9)

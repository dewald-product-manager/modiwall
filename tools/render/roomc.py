"""The dark rooms: stone, timber and light (one room, lit one thing at a time), and the textures the dark hall shares."""
from roomb import *
from PIL import Image
from scipy.ndimage import map_coordinates, gaussian_filter
import plants


def dark_textures():
    d = ROOT + '/ptex'
    save = lambda n, c: Image.fromarray((np.clip(c, 0, 1) * 255).astype('u1')).save(f'{d}/{n}')
    n = R
    if not os.path.exists(d + '/nero_d.png'):   # polished charcoal marble, white and bronze veins
        y, x = np.mgrid[0:n, 0:n] / n
        wx = fb(n, 121, 5, 2) * .17 + fb(n, 123, 5, 6) * .05 + fb(n, 125, 4, 24) * .008
        wy = fb(n, 122, 5, 2) * .17 + fb(n, 124, 5, 6) * .05 + fb(n, 126, 4, 24) * .008
        X, Y = x + wx, y + wy
        c, q = np.cos(.95), np.sin(.95)
        U, V = X * c + Y * q, -X * q + Y * c

        def field(seed, base, k):
            return map_coordinates(fb(n, seed, 5, base), [(V * n) % n, (U * n * k) % n], order=1, mode='wrap')
        cl = field(130, 3, .4)
        cl2 = field(141, 7, .7)
        base = np.array([.150, .157, .150])
        col = base[None, None] * (1 + cl * .55 + cl2 * .3)[..., None]
        col += np.clip(field(142, 5, .5), 0, 1)[..., None] ** 2 * np.array([.06, .066, .06])
        mk = lambda sd, g=.3: np.clip(field(sd, 3, .5) * 2.6 + g, 0, 1)
        for sd, b, k, th, st, cc, g in ((131, 3, .34, .085, .30, (.36, .365, .35), .9), (133, 4, .3, .05, .22, (.38, .34, .28), .5), (131, 3, .34, .010, .95, (.90, .89, .85), .9), (143, 4, .42, .007, .9, (.84, .83, .79), .45), (133, 4, .3, .0075, .9, (.70, .54, .35), .6), (136, 7, .4, .0042, .62, (.74, .73, .70), .5), (137, 12, .5, .003, .5, (.62, .57, .48), .4), (138, 22, .6, .004, .3, (.57, .57, .54), .3)):
            r = np.exp(-np.abs(field(sd, b, k)) / th) * mk(sd + 20, g) * st
            col = col * (1 - r[..., None]) + np.array(cc) * r[..., None]
        save('nero_d.png', np.clip(col, 0, 1) ** (1 / 1.35))
    if not os.path.exists(d + '/trav_d.png'):   # silver travertine, cut along the vein: 3.4 m across
        y, x = np.mgrid[0:n, 0:n] / n
        warp = fb(n, 171, 5, 2) * .030 + fb(n, 172, 4, 7) * .010 + fb(n, 173, 4, 30) * .0022

        def lay(seed, base, stretch, kx=.0):
            f = fb(n, seed, 5, base)
            return map_coordinates(f, [((y + warp) * n) % n, (x * n / stretch + kx * n) % n], order=1, mode='wrap')
        big, mid, fine, hair = lay(174, 5, 5.), lay(175, 14, 9.), lay(176, 48, 14.), lay(177, 150, 18.)
        t = big * .75 + mid * .62 + fine * .42 + hair * .22
        light, dark, rust = np.array([.70, .67, .62]), np.array([.27, .25, .225]), np.array([.40, .315, .235])
        k = np.clip(t * 1.05 + .5, 0, 1)[..., None]
        col = dark * (1 - k) + light * k
        rr = np.clip(lay(178, 9, 8.) * 2 - .25, 0, 1)[..., None] * .45
        col = col * (1 - rr) + rust * rr
        seam = np.exp(-np.abs(lay(179, 11, 10.)) / .018)[..., None] * .5
        col = col * (1 - seam) + np.array([.19, .168, .145]) * seam
        ph = map_coordinates(fb(n, 180, 3, 220), [((y + warp) * n) % n, (x * n / 3.) % n], order=1, mode='wrap')
        pit = np.clip((ph * .9 + lay(181, 12, 8.) * .5 - .62) * 6, 0, 1)
        pit = gaussian_filter(pit, .7)
        col = col * (1 - pit[..., None] * .6)
        save('trav_d.png', col)
        Image.fromarray(plants.tonormal(-pit * 3.2 + fine * .35 + hair * .3, 1.2)).save(d + '/trav_n.png')
        save('trav_r.png', np.repeat((.40 + fine * .08 + pit * .45 + fb(n, 182, 4, 12) * .05)[..., None], 3, 2))
    if not os.path.exists(d + '/bas_d.png'):    # honed basalt floor, 1.2 m slabs, barely a joint
        a, b, c = fb(n, 151, 7, 4), fb(n, 152, 6, 20), fb(n, 153, 3, 200)
        y, x = np.mgrid[0:n, 0:n] / n
        gx, gy = (x * 2) % 1, (y * 2) % 1
        dd = np.minimum(np.minimum(gx, 1 - gx), np.minimum(gy, 1 - gy)) * 1200
        j = np.clip(1 - dd / 1.8, 0, 1)
        idn = (np.floor(x * 2) * 3 + np.floor(y * 2) * 7) % 5
        col = np.array([.215, .212, .203])[None, None] * (1 + a * .13 + b * .10 + c * .08 + (idn - 2) * .022)[..., None] * (1 - j * .55)[..., None]
        save('bas_d.png', col)
        Image.fromarray(plants.tonormal(-j * 3 + c * .12 + b * .12, 1.)).save(d + '/bas_n.png')
        save('bas_r.png', np.repeat((.36 + a * .16 + b * .10 + c * .06 + j * .4)[..., None], 3, 2))
    if not os.path.exists(d + '/cem_d.png'):    # trowelled microcement
        a, b = fb(n, 161, 6, 3), fb(n, 162, 6, 9)
        w = fb(n, 163, 4, 5) * 40
        y, x = np.mgrid[0:n, 0:n]
        st = gaussian_filter(np.random.default_rng(8).random((n, n)), (2, 22))
        st = (st - st.mean()) / st.std()
        st = map_coordinates(st, [(y + w * 2.2 + x * .16) % n, (x + w) % n], order=1, mode='wrap')
        t = 1 + a * .16 + b * .13 + st * .022
        save('cem_d.png', np.array([.50, .505, .49])[None, None] * t[..., None])
        Image.fromarray(plants.tonormal(b * .8 + st * .06 + a * .3, 1.4)).save(d + '/cem_n.png')
        save('cem_r.png', np.repeat((.55 + a * .12 + b * .12 + st * .03)[..., None], 3, 2))


def darks(s):
    dark_textures()
    m = std(s)
    m['nero'] = s.mat('nero', (1, 1, 1), .13, spec=.5, tBase='ptex/nero_d.png', scale=1.)
    m['trav'] = s.mat('trav', (.86, .86, .86), 1., spec=.45, tBase='ptex/trav_d.png', tNorm='ptex/trav_n.png', tRough='ptex/trav_r.png', scale=1., nStr=.8)
    m['travb'] = s.mat('travb', (.86, .86, .86), 1., spec=.45, tBase='ptex/trav_d.png', tNorm='ptex/trav_n.png', tRough='ptex/trav_r.png', scale=1 / 3.4, nStr=.8, box=True)
    m['bas'] = s.mat('bas', (.62, .62, .60), .55, spec=.5, tBase='ptex/bas_d.png', tNorm='ptex/bas_n.png', tRough='ptex/bas_r.png', scale=1 / 2.4, box=True, nStr=.25)
    m['cem'] = s.mat('cem', (.30, .305, .295), 1., spec=.35, tBase='ptex/cem_d.png', tNorm='ptex/cem_n.png', tRough='ptex/cem_r.png', scale=1 / 3.1, box=True, nStr=.7)
    m['cemd'] = s.mat('cemd', (.17, .172, .165), 1., spec=.35, tBase='ptex/cem_d.png', tNorm='ptex/cem_n.png', tRough='ptex/cem_r.png', scale=1 / 3.1, box=True, nStr=.6)
    m['smoke'] = s.mat('smoke', (.50, .455, .41), .85, spec=.45, tBase='ph/smoked_walnut_veneer_d.jpg', tNorm='ph/smoked_walnut_veneer_n.jpg', tRough='ph/smoked_walnut_veneer_r.jpg', scale=.8, nStr=.7)
    m['smokeb'] = s.mat('smokeb', (.50, .455, .41), .85, spec=.45, tBase='ph/smoked_walnut_veneer_d.jpg', tNorm='ph/smoked_walnut_veneer_n.jpg', tRough='ph/smoked_walnut_veneer_r.jpg', scale=.8, nStr=.6, box=True, swap=True)
    m['bz'] = s.mat('bz', (.21, .15, .098), .30, metal=1, spec=.5)
    m['boucle'] = s.mat('boucle', (.60, .57, .52), .95, spec=.12, tBase='ptex/teddy_d.png', tNorm='ph/curly_teddy_natural_n.jpg', scale=3.2, box=True, nStr=1.4)
    m['rugd'] = s.mat('rugd', (.27, .262, .245), .98, spec=.08, tBase='ptex/teddy_d.png', tNorm='ph/curly_teddy_natural_n.jpg', scale=2.2, box=True, nStr=1.7)
    return m


def halo(s, m, c, r, e, group, tilt=(0., 0.), hang=3.4, prof=(.016, .034)):
    """a slim bronze ring of light: the lamp itself is a diffuser let into the inner face"""
    w, h = prof
    glow = s.mat(f'halo{group}', (.9, .86, .8), .6, spec=.2, emit=tuple(e * np.array([1., .80, .55])), egroup=group)
    Rr = rotz(tilt[0]) @ rotx(tilt[1])
    def ring(prof, mat):
        # one closed extrusion, edges kept sharp by giving each side its own vertices
        for (a, b) in zip(prof, prof[1:] + prof[:1]):
            k = 160
            th = np.linspace(0, 2 * np.pi, k + 1)
            P = np.stack([np.r_[a[0] * np.cos(th), b[0] * np.cos(th)], np.r_[np.full(k + 1, a[1]), np.full(k + 1, b[1])], np.r_[a[0] * np.sin(th), b[0] * np.sin(th)]], 1)
            F = grid_faces(2, k + 1)
            mid = np.array([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])
            out = mid - np.mean(np.array(prof), 0)
            fn = np.cross(P[F[0, 1]] - P[F[0, 0]], P[F[0, 2]] - P[F[0, 0]])
            if fn[0] * out[0] + fn[1] * out[1] < 0:
                F = F[:, ::-1]
            s.add(s.mesh(P, F, mat), xf(Rr, c))
    ring([(r, -h / 2), (r + w, -h / 2), (r + w, h / 2), (r, h / 2)], m['bz'])
    ring([(r - .003, -h * .36), (r - .0004, -h * .36), (r - .0004, h * .36), (r - .003, h * .36)], glow)
    ring([(r + .003, -h / 2 - .003), (r + w - .003, -h / 2 - .003), (r + w - .003, -h / 2 - .0004), (r + .003, -h / 2 - .0004)], glow)
    n = 9
    E = np.array([1., .78, .51]) * e * 34
    for k in range(n):
        a0, a1 = 2 * np.pi * k / n, 2 * np.pi * (k + 1) / n
        p0, p1 = (np.array([r * np.cos(a), 0, r * np.sin(a)]) * .992 for a in (a0, a1))
        u = p1 - p0
        for v, nd, lift in ((np.array([0, h * .7, 0]), -(p0 + p1) / 2, 0), (-(p0 + p1) / 2 / r * w, np.array([0, -1., 0]), -h / 2 - .006)):
            uu = u
            if np.dot(np.cross(uu, v), nd) < 0:
                pp, uu = p1, -u
            else:
                pp = p0
            q = pp - (v / 2 if lift == 0 else v) + np.array([0, lift, 0])
            s.quad(Rr @ q + np.array(c), Rr @ uu, Rr @ v, E, group, 0, 0)
    for k in range(3):
        a = 2 * np.pi * k / 3 + .4
        p = Rr @ np.array([(r + w / 2) * np.cos(a), h / 2, (r + w / 2) * np.sin(a)]) + np.array(c)
        top = np.array([c[0] + .05 * np.cos(a), hang, c[2] + .05 * np.sin(a)])
        d = top - p
        L = np.linalg.norm(d)
        d /= L
        x = np.cross([0, 0, 1.], d)
        x /= np.linalg.norm(x)
        z = np.cross(x, d)
        M = np.zeros((3, 4))
        M[:, :3] = np.stack([x, d, z], 1)
        M[:, 3] = p
        P, F, UV = lathe([(.0016, 0), (.0016, L)], 8)
        s.add(s.mesh(P, F, m['bz']), M)
    cyl(s, m['bz'], (c[0], hang - .03, c[2]), .085, .035, .006)


def tub(s, m, mat, t, yaw):
    """a low upholstered tub chair: one swept shell, one round seat, a recessed plinth"""
    M = place(t, yaw)
    n = 60
    k = 28
    A = np.linspace(-2.02, 2.02, n)
    a = np.linspace(0, 2 * np.pi, k, endpoint=False)
    ex = 3.2
    P = []
    for i, th in enumerate(A):
        e = min(1., (1 - abs(th) / 2.02) / .07)
        e = np.sqrt(max(1e-3, 1 - (1 - e) ** 2))
        top = .55 + .15 * np.cos(np.clip(th * .80, -np.pi / 2, np.pi / 2)) ** 1.5
        lo = .07
        cx, cy = .37, (top + lo) / 2
        hw, hh = .062 * (.55 + .45 * e), (top - lo) / 2 - .05 * (1 - e)
        ca, sa = np.cos(a), np.sin(a)
        q = (np.abs(ca) ** ex + np.abs(sa) ** ex) ** (-1 / ex)
        rr = cx + ca * q * hw + .03 * (cy + sa * q * hh - .3)
        y = cy + sa * q * hh
        P.append(np.stack([rr * np.sin(th), y, -rr * np.cos(th)], 1))
    P = np.array(P).reshape(-1, 3)
    F = []
    for i in range(n - 1):
        for j in range(k):
            p0, p1 = i * k + j, i * k + (j + 1) % k
            F += [[p0, p1, p0 + k], [p1, p1 + k, p0 + k]]
    for base, flip in ((0, 1), ((n - 1) * k, 0)):
        for j in range(1, k - 1):
            f = [base, base + j, base + j + 1]
            F.append(f[::-1] if flip else f)
    F = np.array(F)
    N = normals(P, F)
    cen = P - np.array([[0, .33, 0]])
    ring = np.stack([P[:, 0], 0 * P[:, 0], P[:, 2]], 1)
    rad = np.linalg.norm(ring, axis=1, keepdims=True)
    outw = (P - ring / np.maximum(rad, 1e-6) * .37 - np.array([[0, .33, 0]]))
    if (N * outw).sum() < 0:
        F = F[:, ::-1]
        N = -N
    s.add(s.mesh(P, F, mat, N=N), M)
    c = [(1e-4, .10)]
    R0, H0, b = .335, .42, .07
    c += [(R0 - b + b * np.sin(q), .10 + b - b * np.cos(q)) for q in np.linspace(0, np.pi / 2, 8)]
    c += [(R0 - b + b * np.cos(q), H0 - b + b * np.sin(q)) for q in np.linspace(0, np.pi / 2, 8)]
    c += [(.16, H0 + .012), (1e-4, H0 + .016)]
    P, F, UV = lathe(c, 72)
    s.add(s.mesh(P, F, mat), M)
    P, F, UV = lathe([(1e-4, 0), (.30, 0), (.30, .08), (1e-4, .08)], 60)
    s.add(s.mesh(P, F, m['bz']), M)


def bench(s, m, mat, t, yaw, w=1.9, d=.74):
    M = place(t, yaw)
    for lo, hi, bv, mt in (((-w / 2, .15, -d / 2), (w / 2, .40, d / 2), .085, mat), ((-w / 2 + .12, .0, -d / 2 + .10), (w / 2 - .12, .16, d / 2 - .10), .004, m['bz'])):
        P, F, UV, N = box_mesh(lo, hi, bv)
        s.add(s.mesh(P, F, mt, UV=UV, N=N), M)


def mat_scene2(name):
    s = Scene(name, tex=2048)
    m = darks(s)
    X, HH, Z = 3.45, 3.35, 12.
    s.box((-X - .4, -.2, -.6), (X + .4, 0, Z), m['bas'])
    s.box((-X - .4, HH + .14, -.6), (X + .4, HH + .4, Z), m['cemd'])
    # a floating ceiling, with the room's edge left open for light
    s.box((-X + .34, HH, .62), (X - .34, HH + .10, Z), m['cemd'], .004)
    s.box((-X - .4, 0, -.6), (X + .4, HH + .4, -.35), m['black'])
    s.box((-X - .4, 0, Z - .1), (X + .4, HH + .4, Z), m['cemd'])
    # stone: the whole left wall, four slabs, matched at each joint
    s.box((-X - .4, 0, -.35), (-X - .02, HH + .4, Z), m['black'])
    sw, rows = 2.35, (0., 1.16, 2.32, HH + .14)
    for k in range(6):
        for q in range(3):
            z0, z1 = -.02 + k * sw, -.02 + (k + 1) * sw - .004
            y0, y1 = rows[q], rows[q + 1] - .004
            u0 = ((k * .37 + q * .61) % 1) * .30
            v0 = ((k * .41 + q * .34) % 1) * .6 + .02
            du, dv = (z1 - z0) / 3.4, (y1 - y0) / 3.4
            rect(s, m['trav'], (-X, y0, z1), (0, 0, z0 - z1), (0, y1 - y0, 0), [[u0, v0], [u0 + du, v0], [u0 + du, v0 + dv], [u0, v0 + dv]])
    # a floating shelf of the same stone, lit from beneath
    s.box((-X, .40, .9), (-X + .46, .465, 6.2), m['travb'], .003)
    gltf(s, 'ceramic_vase_02', place((-X + .22, .465, 1.55), .4), height=.40)
    for k, (dz, c) in enumerate(((0, m['boucle']), (.012, m['clay']), (-.01, m['cem']))):
        s.box((-X + .10, .465 + k * .03, 2.25 + dz), (-X + .36, .493 + k * .03, 2.60 + dz), c, .003)
    gltf(s, 'wooden_bowl_01', place((-X + .23, .465, 3.5), 1.), height=.075)
    # timber: smoked walnut battens over the whole right wall, with one lit niche
    bw, bg, bd = .034, .012, .030
    rr = np.random.default_rng(5)
    niche = (.85, 2.75, .92, 1.62)
    n = int(Z / (bw + bg))
    for a, b in (((0, -.35), (niche[2], Z)), ((niche[3], -.35), (HH + .4, Z)), ((niche[2], -.35), (niche[3], niche[0])), ((niche[2], niche[1]), (niche[3], Z))):
        s.box((X + .03, a[0], a[1]), (X + .4, b[0], b[1]), m['black'])

    def batten(y0, y1, z0, o):
        P, F, UV, N = box_mesh((0, y0, 0), (bd, y1, bw), .0025)
        UV = np.stack([P[:, 1] * .8 + o, (P[:, 2] + P[:, 0]) * .8 + o * 3.7], 1)
        s.add(s.mesh(P, F, m['smoke'], UV=UV, N=N), xf(t=(X, 0, z0)), seed=o)
    for k in range(n):
        z0 = k * (bw + bg)
        o = rr.random()
        if niche[0] - bw < z0 < niche[1]:
            batten(0.02, niche[2], z0, o)
            batten(niche[3], HH + .1, z0, o)
        else:
            batten(.02, HH + .1, z0, o)
    for a, b in (((X - .02, niche[2] - .03, niche[0] - .03), (X + .30, niche[2], niche[1] + .03)), ((X - .02, niche[3], niche[0] - .03), (X + .30, niche[3] + .03, niche[1] + .03)), ((X - .02, niche[2], niche[0] - .03), (X + .30, niche[3], niche[0])), ((X - .02, niche[2], niche[1]), (X + .30, niche[3], niche[1] + .03))):
        s.box(a, b, m['bz'], .002)
    s.box((X + .28, niche[2], niche[0]), (X + .30, niche[3], niche[1]), m['smokeb'])
    s.quad((X + .03, niche[3] - .005, niche[0] + .05), (.03, 0, 0), (0, 0, niche[1] - niche[0] - .1), (95, 66, 38), 1)
    gltf(s, 'ceramic_vase_04', place((X + .14, niche[2], 1.15), .4), height=.30)
    gltf(s, 'ceramic_vase_01', place((X + .15, niche[2], 2.4), 1.2), height=.36)
    gltf(s, 'wooden_bowl_01', place((X + .14, niche[2], 1.75), .3), height=.09)
    # the planted wall, floor to ceiling, in a slim bronze reveal
    s.box((-X + .10, 0, -.34), (X - .06, .10, .16), m['bz'], .004)
    s.box((-X + .06, 0, -.34), (-X + .10, HH + .14, .10), m['bz'], .002)
    s.box((X - .06, 0, -.34), (X - .02, HH + .14, .10), m['bz'], .002)
    K, M = plants.kit(s)
    W2 = 2 * X - .22
    L, _, _ = layout(W2, HH + .08, dict(WSTY, density=2.1, str=2.8, mix=dict(heart=8, lime=1.5, fern=5, spider=2.4, lily=2.4, monstera=2.6, pep=2.4, syng=1.4, lirio=2, purple=.5)), 64, px=.105, py=.12)
    L = drop(L, None, dict(monstera=.75, lily=.18))
    s.rec = [(r[0], *r[2]) for r in plantwall(s, K, L, 9, 1, frame=xf(t=(-X + .11, .10, -.20)), scale=1.05)]
    s.box((-X, .05, -.33), (X, HH + .3, -.24), M['black'])
    # a place to sit and look at it
    s.box((-2.1, 0, 1.75), (2.1, .022, 5.0), m['rugd'], .01)
    tub(s, m, m['boucle'], (1.5, .022, 2.75), -.95)
    tub(s, m, m['boucle'], (-1.5, .022, 2.95), .85)
    bench(s, m, m['boucle'], (.35, .022, 4.35), .0)
    cyl(s, m['nero'], (-.12, .022, 3.15), .50, .30, .012)
    cyl(s, m['bz'], (.50, .022, 2.72), .27, .44, .006)
    gltf(s, 'ceramic_vase_04', place((-.25, .322, 3.02), .4), height=.26)
    gltf(s, 'wooden_bowl_01', place((.10, .322, 3.28), 1.), height=.07)
    # the light
    halo(s, m, (.18, 2.20, 2.9), .80, 11., 2, (.045, -.03), HH)
    halo(s, m, (-.34, 2.62, 2.75), .50, 11., 2, (-.06, .04), HH)
    # what lights the stone
    s.quad((-X + .16, HH + .09, .4), (.14, 0, 0), (0, 0, 8.8), (24, 21.8, 18.8), 0)
    for z in (.8, 2.2, 3.6, 5.0, 6.4):
        s.spot((-X + .95, HH - .004, z), (-.50, -1, 0), .035, (6800, 6100, 5150), 0, 9)
    s.quad((-X + .03, .392, .95), (.05, 0, 0), (0, 0, 5.2), (26, 20, 13.5), 0)
    # the timber
    s.quad((X - .25, HH + .09, .5), (.20, 0, 0), (0, 0, 8.4), (15, 11.4, 7.7), 1)
    for z in (1.0, 2.4, 3.8, 5.2, 6.6):
        s.spot((X - .60, HH - .004, z), (.34, -1, 0), .03, (3600, 2750, 1850), 1, 16)
    # the planting: a slot above it, grazing down, and small heads set back
    s.quad((-X + .2, HH + .11, .16), (2 * X - .4, 0, 0), (0, 0, .34), (27, 23.5, 18), 3)
    for x in np.linspace(-2.7, 2.7, 6):
        s.spot((x, HH - .004, 1.75), (0, -.95, -.80), .035, (1250, 1080, 830), 3, 12)
    s.save()
    return s


V2 = dict(eye=[0., 1.36, 8.3], at=[0., 1.36, 0], fov=43, shiftY=.04)
if __name__ == '__main__':
    w, spp = int(sys.argv[1]), int(sys.argv[2])
    h = w * 9 // 16
    sc = mat_scene2('rb_mat')
    json.dump(sc.rec, open('out/rb_mat_rec.json', 'w'), default=float)
    rt.render('rb_mat', [('rb_mat', dict(dict(CAM, tile=144), **V2, w=w, h=h, spp=spp, aov=True))])
    a, _, _ = rt.load('rb_mat')
    for g in range(4):
        rt.save(f'out/rb_mat_{g}.png', a[..., g, :], .9)
    rt.save('out/rb_mat.png', a.sum(2), .9)

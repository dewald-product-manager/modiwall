"""The wider plant collection: Modiwall's indoor list, and exterior species seen on Modiwall walls."""
import numpy as np
import plants as B0
from plants import *

T = lambda a, b, c: A(a, b, c)
NEW = {
 'mica': dict(args=dict(dark=T(.026, .070, .020), mid=T(.050, .125, .030), vein=T(.09, .20, .05), nlat=8, slope=.75, curve=.15, quilt=.8, seed=33), rough=.29, trans=T(.8, 1, .38) * .55, vary=.28, stripe=(.40, .46, .075)),
 'marble': dict(args=dict(dark=T(.040, .105, .030), mid=T(.070, .165, .042), vein=T(.14, .25, .08), nlat=8, slope=.7, curve=.15, quilt=.7, seed=35, variegate=dict(t=.0, c=(.56, .58, .36))), rough=.32, trans=T(.85, 1, .5) * .5, vary=.22),
 'sche': dict(args=dict(dark=T(.026, .078, .022), mid=T(.050, .130, .032), vein=T(.10, .20, .06), nlat=9, slope=.4, curve=.1, quilt=.5, seed=36), rough=.25, trans=T(.75, 1, .4) * .42, vary=.32),
 'schev': dict(args=dict(dark=T(.032, .085, .024), mid=T(.056, .130, .034), vein=T(.2, .28, .08), nlat=9, slope=.4, curve=.1, quilt=.5, seed=37, variegate=dict(t=.03, c=(.52, .50, .17))), rough=.28, trans=T(.9, 1, .4) * .45, vary=.2),
 'draco': dict(args=dict(dark=T(.018, .055, .018), mid=T(.034, .094, .026), vein=T(.05, .13, .04), nlat=26, slope=.12, curve=.0, quilt=.7, seed=38, tert=50), rough=.20, trans=T(.7, 1, .4) * .35, vary=.26),
 'drar': dict(args=dict(dark=None, mid=T(.035, .105, .026), vein=None, streak=True, seed=39, variegate=dict(mode='edge', edge=.56, c=(.50, .50, .17))), rough=.30, trans=T(.85, 1, .4) * .45, vary=.2),
 'agl': dict(args=dict(dark=T(.045, .105, .050), mid=T(.075, .150, .075), vein=T(.12, .2, .11), nlat=12, slope=.5, curve=.1, quilt=1.0, seed=40, variegate=dict(t=-.10, c=(.36, .43, .30))), rough=.30, trans=T(.8, 1, .55) * .4, vary=.2),
 'julii': dict(args=dict(dark=T(.040, .095, .036), mid=T(.070, .145, .050), vein=T(.15, .2, .09), nlat=7, slope=.6, curve=.1, quilt=.6, seed=41, variegate=dict(t=.12, c=(.60, .60, .42))), rough=.28, trans=T(.95, .95, .55) * .4, vary=.2, edge=(.50, .16, .14)),
 'sello': dict(args=dict(dark=T(.020, .060, .022), mid=T(.040, .102, .032), vein=T(.08, .18, .06), nlat=8, slope=.55, curve=.0, quilt=1.1, seed=42), rough=.27, ns=4, trans=T(.75, 1, .4) * .4, vary=.2, alpha='sello'),
 'fescue': dict(args=dict(dark=None, mid=T(.19, .265, .215), vein=None, streak=True, seed=43), rough=.55, trans=T(.8, 1, .8) * .4, vary=.35),
 'bulb': dict(args=dict(dark=None, mid=T(.070, .170, .045), vein=None, streak=True, seed=44), rough=.30, trans=T(.8, 1, .4) * .5, vary=.28),
 'flower': dict(args=dict(dark=T(.55, .34, .012), mid=T(.80, .52, .025), vein=T(.6, .3, .02), nlat=3, slope=.4, curve=.1, quilt=.3, seed=45), rough=.5, trans=T(1, .8, .2) * .5, vary=.18),
 'crass': dict(args=dict(dark=T(.30, .075, .040), mid=T(.42, .170, .075), vein=T(.30, .22, .05), nlat=3, slope=.3, curve=.0, quilt=.2, seed=46), rough=.34, trans=T(1, .5, .25) * .4, vary=.55, base=(.135, .255, .060)),
 'silver': dict(args=dict(dark=T(.205, .255, .225), mid=T(.300, .350, .310), vein=T(.3, .34, .30), nlat=4, slope=.3, curve=.0, quilt=.2, seed=47), rough=.62, trans=T(.8, 1, .85) * .22, vary=.16),
 'helich': dict(args=dict(dark=T(.200, .235, .190), mid=T(.300, .335, .270), vein=T(.3, .33, .27), nlat=4, slope=.6, curve=.1, quilt=.5, seed=48), rough=.8, trans=T(.8, 1, .8) * .25, vary=.2),
 'spek': dict(args=dict(dark=T(.080, .185, .035), mid=T(.135, .270, .055), vein=T(.16, .28, .08), nlat=3, slope=.3, curve=.0, quilt=.2, seed=49), rough=.25, trans=T(.85, 1, .4) * .5, vary=.35),
 'sedum': dict(args=dict(dark=T(.190, .270, .035), mid=T(.290, .380, .060), vein=T(.3, .4, .1), nlat=3, slope=.3, curve=.0, quilt=.2, seed=50), rough=.34, trans=T(.95, 1, .35) * .5, vary=.35),
 'plect': dict(args=dict(dark=T(.040, .098, .032), mid=T(.072, .152, .046), vein=T(.13, .22, .09), nlat=6, slope=.75, curve=.2, quilt=1.3, seed=51), rough=.55, trans=T(.8, 1, .45) * .5, vary=.3),
 'aspar': dict(args=dict(dark=T(.075, .165, .035), mid=T(.130, .245, .050), vein=T(.12, .27, .05), nlat=3, slope=.3, curve=.1, quilt=.3, seed=52), rough=.5, trans=T(.85, 1, .35) * .6, vary=.3),
 'setc': dict(args=dict(dark=T(.042, .016, .036), mid=T(.084, .030, .066), vein=T(.13, .06, .10), nlat=24, slope=.1, curve=.0, quilt=.4, seed=53), rough=.40, trans=T(1, .4, .85) * .45, vary=.32),
 'spider': dict(args=dict(dark=None, mid=T(.075, .165, .036), vein=None, streak=True, seed=10, variegate=dict(mode='mid', edge=.34, c=(.58, .60, .36))), rough=.36, trans=T(.85, 1, .45) * .55, vary=.2),
}
B0.SPEC.update(NEW)


def sello_alpha():
    v, u = np.mgrid[0:R, 0:R] / (R - 1.); u = u * 2 - 1; au = np.abs(u); a = np.ones((R, R)); r = np.random.default_rng(8)
    n = 9; ph = (v - au * .50 * (1 - .3 * v)) * n
    for side in (-1, 1):
        m = u * side > 0
        for k in range(0, 9):
            c = k + .5 + r.uniform(-.08, .08) - .35; st = r.uniform(.20, .30); w = np.interp(au, [st, st + .1, .6, 1.], [0, .10, .2, .40]) * r.uniform(.8, 1.1)
            a[m & (np.abs(ph - c - .10 * np.sin(au * 7 + k)) < w) & (au > st)] = 0
    return gaussian_filter(a, 1.4)


def mats2(s, kinds):
    M = {}
    for k in kinds:
        p = B0.SPEC[k]
        f = f'{ROOT}/tex/leaf2_{k}.npz'
        if not os.path.exists(f):
            c, h = leaf_tex(k, **p['args'])
            v, u = np.mgrid[0:R, 0:R] / (R - 1.); u = u * 2 - 1
            if 'stripe' in p:   # a gold flame up the middle, broken along the veins
                n1 = fbm(R, 77, 6, 5, .5); e = np.clip((.36 - np.abs(u) + n1 * .42) / .05, 0, 1) * np.clip((v + .1) * 4, 0, 1) * np.clip((fbm(R, 78, 4, 9) + .30) * 5, 0, 1)
                c = c * (1 - e[..., None] * .95) + np.array(p['stripe']) * (1 + n1[..., None] * .2) * e[..., None] * .95
            if 'edge' in p:     # a blush at the rim
                e = np.clip((np.abs(u) - .90) / .07, 0, 1)[..., None]; c = c * (1 - e) + np.array(p['edge']) * e
            if 'base' in p:     # green at the heart, fire at the tip
                e = np.clip(1 - v * 1.5, 0, 1)[..., None]; c = c * (1 - e) + np.array(p['base']) * e
            np.savez(f, c=enc(c), n=tonormal(h, p.get('ns', 3.2)))
        d = np.load(f); cc = d['c']
        if k == 'monstera': cc = np.dstack([cc, (mon_alpha() * 255).astype('u1')])
        if k == 'sello': cc = np.dstack([cc, (sello_alpha() * 255).astype('u1')])
        s.texture('leafc2_' + k, cc); s.texture('leafn2_' + k, d['n'])
        M[k] = s.mat('leaf2_' + k, (1, 1, 1), p['rough'], spec=.5, trans=p['trans'], tBase='leafc2_' + k, tNorm='leafn2_' + k, nStr=1., vary=p['vary'], alpha=.5 if k in ('monstera', 'sello') else None)
    M['stem'] = s.mat('stem', (.10, .17, .04), .5, spec=.4, trans=(.2, .25, .1)); M['red'] = s.mat('redstem', (.16, .05, .03), .5, spec=.4)
    M['soil'] = s.mat('soil', (.016, .011, .008), .95, spec=.15); M['black'] = s.mat('vessel', (.012, .013, .012), .42, spec=.4)
    return M


def o_obov(s): return np.sin(np.pi * np.clip(s, 0, 1) ** 1.55) ** .85, s
def o_scal(s):
    x, y = o_heart(s); return x * (1 + .06 * np.sin(s * 46)) * np.clip(1.02 - .0 * s, 0, 2), y * .93 + .02 * np.sin(s * 46)
def o_club(s): return np.sin(np.pi * np.clip(s * .93 + .05, 0, 1) ** 1.25) ** .6, s


NEWK = ('mica', 'marble', 'sche', 'schev', 'draco', 'drar', 'agl', 'julii', 'sello', 'fescue', 'bulb', 'crass', 'silver', 'helich', 'spek', 'sedum', 'plect', 'aspar', 'setc')


def plant2(kind, rng, M):
    if kind not in NEWK: return B0.plant(kind, rng, M)
    b = Build(); U = rng.uniform; lm = M[kind]; st = M['stem']

    def heartlike(n, size, reach, outl=o_heart, spread=1., ar=.62, hang=1., nu=15, nv=9, stem=st):
        for i in range(n):
            k = (i + .5) / n; a = U(-1, 1) * 1.25 * spread; el = U(-.5, 1.1); L = size * U(.62, 1.12) * (1 - .25 * (k > .85)); rch = reach * U(.45, 1.1)
            d = np.array([np.sin(a), np.sin(el) * .75 - .1 * hang, .35 + U(0, .75)]); d /= np.linalg.norm(d); p0 = np.array([U(-.02, .02), U(-.02, .02), 0]); tip = p0 + d * rch; tip[1] -= .35 * hang * rch * U(.3, 1.)
            pid = b.leafid(p0); pts = bez(p0, p0 + d * rch * .6 + np.array([0, .25 * rch, 0]), tip); P, F = tube(pts, .0022, .0014); b.part(P, F, np.zeros((len(P), 2)), np.linspace(0, .35, len(pts)).repeat(6), pid, stem)
            face = np.array([np.sin(a) * .75 + U(-.35, .35), U(0, .75), U(.65, 1.1)]); dirv = np.array([np.sin(a) * .8 + U(-.35, .35), -U(.35, 1.1) * hang, U(-.05, .5)])
            P, F, UV, t = blade(outl, L, L * ar, nu, nv, bend=U(.2, .85), fold=U(.06, .32), wave=U(0, .09), wf=U(1, 2.5), twist=U(-.35, .35), ph=U(0, 6), curl=U(0, .35))
            b.part(P @ frame(dirv, face).T + tip, F, UV, .35 + .65 * t, pid, lm, U(-.16, .16) + (.3 if k > .88 and kind in ('mica', 'marble') else 0))

    def rosette(c, n, L, ar, outl, up, tint=0., open_=1., nu=11, nv=7, fold=.2, bend=.5, rmat=None):
        Rm = frame(np.array([1., 0, 0]) if abs(up[0]) < .8 else np.array([0, 1., 0]), up)
        X, Y = Rm[:, 0], Rm[:, 1]
        pid = b.leafid(c)
        for i in range(n):
            a = i * 2.39996 + U(-.15, .15); q = (i + .5) / n; th = (.25 + 1.15 * q) * open_
            d = (np.cos(a) * X + np.sin(a) * Y) * np.sin(th) + up * np.cos(th); l = L * (.45 + .55 * q) * U(.9, 1.08)
            P, F, UV, t = blade(outl, l, l * ar, nu, nv, bend=-bend * U(.5, 1), fold=fold * U(.6, 1.2), cup=.25, twist=U(-.1, .1))
            b.part(P @ frame(d, up * np.sin(th) - (np.cos(a) * X + np.sin(a) * Y) * np.cos(th)).T + c, F, UV, .3 + .7 * t, pid, lm if rmat is None else rmat, tint + U(-.12, .12) - .25 * (1 - q))

    if kind in ('mica', 'marble'): heartlike(int(U(17, 23)), .100 if kind == 'mica' else .110, .15)
    elif kind == 'plect': heartlike(int(U(28, 36)), .084, .15, o_scal, 1., .50, hang=.6, nu=24, nv=9)
    elif kind in ('sche', 'schev'):
        for i in range(int(U(11, 15))):
            a = U(-1, 1) * 1.25; rch = U(.10, .24); d = np.array([np.sin(a) * .9, U(-.25, 1.), U(.55, 1.1)]); d /= np.linalg.norm(d); p0 = np.array([U(-.02, .02), U(-.02, .02), 0]); tip = p0 + d * rch
            pid = b.leafid(p0); pts = bez(p0, p0 + d * rch * .6 + np.array([0, .2 * rch, 0]), tip); P, F = tube(pts, .0024, .0016); b.part(P, F, np.zeros((len(P), 2)), np.linspace(0, .4, len(pts)).repeat(6), pid, st)
            up = d * .55 + np.array([U(-.2, .2), U(.1, .7), .8]); up /= np.linalg.norm(up); Fr = frame(np.array([1., 0, 0]), up); n = int(U(7, 9.9)); ph = U(0, 6); L = U(.062, .092)
            for j in range(n):
                q = ph + j / n * 2 * np.pi; dd = (np.cos(q) * Fr[:, 0] + np.sin(q) * Fr[:, 1]) * .96 + up * U(-.12, .2); l = L * U(.82, 1.1)
                P, F, UV, t = blade(o_obov, l, l * .20, 12, 7, bend=U(.25, .7), fold=U(.15, .35), wave=.02, twist=U(-.15, .15))
                b.part(P @ frame(dd, up + U(-.15, .15, 3)).T + tip + dd * .006, F, UV, .45 + .55 * t, pid, lm, U(-.14, .14))
    elif kind in ('draco', 'drar', 'agl', 'julii'):
        n = dict(draco=(26, 34), drar=(26, 36), agl=(13, 18), julii=(16, 22))[kind]; Lr = dict(draco=(.15, .25), drar=(.17, .29), agl=(.15, .23), julii=(.10, .15))[kind]; W = dict(draco=.115, drar=.062, agl=.20, julii=.27)[kind]
        for i in range(int(U(*n))):
            q = U(0, 1); a = U(-1, 1) * 1.35; L = U(*Lr); lift = U(.15, 1.2); d = np.array([np.sin(a) * .85, lift, U(.45, 1.)]); d /= np.linalg.norm(d); h = U(0, .05 if kind != 'agl' else .09)
            p0 = np.array([U(-.02, .02), U(-.02, .02), 0]); tip = p0 + d * h; pid = b.leafid(p0); P, F = tube(bez(p0, p0 + d * h * .5, tip), .0026, .002); b.part(P, F, np.zeros((len(P), 2)), np.linspace(0, .2, 8).repeat(6), pid, st)
            P, F, UV, t = blade(o_ell(.9, .85) if kind in ('agl', 'julii') else o_ell(.75, .62), L, L * W, 18, 7, bend=U(.5, 1.3) if kind in ('draco', 'julii') else U(1., 2.), fold=U(.18, .42), wave=U(0, .05), wf=2, twist=U(-.35, .35), curl=U(0, .2))
            b.part(P @ frame(d + np.array([0, .15, 0]), np.array([-d[0] * .4, .9, .8])).T + tip, F, UV, .15 + .85 * t, pid, lm, U(-.16, .18))
    elif kind == 'sello':
        for i in range(int(U(8, 11))):
            a = U(-1, 1) * 1.25; L = U(.17, .27); rch = U(.16, .32); d = np.array([np.sin(a) * .9, U(-.2, 1.), U(.6, 1.)]); d /= np.linalg.norm(d); p0 = np.array([U(-.02, .02), U(-.02, .02), 0]); tip = p0 + d * rch; tip[1] -= .08 * rch
            pid = b.leafid(p0); pts = bez(p0, p0 + d * rch * .55 + np.array([0, .18 * rch, 0]), tip); P, F = tube(pts, .0036, .0024); b.part(P, F, np.zeros((len(P), 2)), np.linspace(0, .4, len(pts)).repeat(6), pid, st)
            P, F, UV, t = blade(o_mon, L, L * .46, 30, 17, bend=U(.3, .8), fold=U(.02, .2), wave=.06, wf=4, twist=U(-.25, .25), cup=-.1, curl=U(0, .25))
            b.part(P @ frame(np.array([d[0] * .8 + U(-.3, .3), -U(.35, .95), U(.1, .5)]), np.array([d[0] * .4, U(.35, .9), U(.6, 1.)])).T + tip, F, UV, .4 + .6 * t, pid, lm, U(-.12, .14))
    elif kind == 'fescue':
        for i in range(int(U(120, 150))):
            a = U(-1, 1) * 1.5; L = U(.13, .26); d = np.array([np.sin(a) * .85, U(.35, 1.2), U(.3, 1.)]); p0 = np.array([U(-.02, .02), U(-.02, .02), 0])
            P, F, UV, t = blade(o_strap, L, L * .0105, 12, 3, bend=U(.8, 2.1), fold=.6, twist=U(-.6, .6)); b.part(P @ frame(d, np.array([-d[0] * .4, .8, .55])).T + p0, F, UV, t, b.leafid(p0) if i % 6 == 0 else b.nl - 1, lm, U(-.2, .2))
    elif kind == 'bulb':
        for i in range(int(U(34, 44))):
            a = U(-1, 1) * 1.15; L = U(.13, .24); d = np.array([np.sin(a) * .7, U(.45, 1.2), U(.35, .9)]); p0 = np.array([U(-.025, .025), U(-.02, .02), 0])
            P, F, UV, t = blade(o_strap, L, L * .026, 14, 5, bend=U(.3, .95), fold=.75, cup=1.5, twist=U(-.3, .3)); b.part(P @ frame(d, np.array([-d[0] * .4, .8, .55])).T + p0, F, UV, t, b.leafid(p0), lm, U(-.16, .16))
        for i in range(int(U(3, 5.9))):
            a = U(-.8, .8); d = np.array([np.sin(a) * .6, 1.1, U(.35, .7)]); d /= np.linalg.norm(d); L = U(.24, .34); p0 = np.array([U(-.02, .02), 0, 0]); pid = b.leafid(p0); pts = bez(p0, p0 + d * L * .6, p0 + d * L + np.array([0, -.01, .02]), 12); P, F = tube(pts, .0017, .0009, 4)
            b.part(P, F, np.zeros((len(P), 2)), np.linspace(0, .8, 12).repeat(5), pid, st)
            for j in range(34):
                q = U(.58, 1.); c = p0 + d * L * q; aa = U(0, 6.28); dd = np.array([np.cos(aa), U(-.1, .5), np.sin(aa) * .8 + .2]); l = .011 * (1.25 - q * .5)
                P, F, UV, t = blade(o_ell(.7), l, l * .33, 5, 3, bend=.3, fold=.2); b.part(P @ frame(dd, U(-1, 1, 3) + np.array([0, .3, .6])).T + c + dd * .004, F, UV, .9 + 0 * t, pid, M['flower'], U(-.1, .1))
    elif kind in ('crass', 'silver'):
        n = int(U(15, 20)) if kind == 'crass' else int(U(5, 7.9))
        for i in range(n):
            a = U(-1, 1) * 1.3; rch = U(.02, .15) if kind == 'crass' else U(.02, .13); d = np.array([np.sin(a), U(-.5, .9), U(.4, 1.)]); d /= np.linalg.norm(d); c = d * rch; up = d * .5 + np.array([U(-.2, .2), U(.1, .6), .8]); up /= np.linalg.norm(up)
            P, F = tube(bez(np.zeros(3), c * .6, c), .003, .0022); b.part(P, F, np.zeros((len(P), 2)), np.linspace(0, .3, 8).repeat(6), b.leafid(np.zeros(3)), M['red'] if kind == 'crass' else st)
            if kind == 'crass': rosette(c, int(U(13, 18)), U(.048, .066), .26, o_ell(.85, .8), up, U(-.1, .15), .95, fold=.35, bend=.35)
            else: rosette(c, int(U(22, 30)), U(.080, .115), .25, o_club, up, 0., 1., fold=.15, bend=.5)
    elif kind in ('helich', 'spek', 'sedum'):
        n = dict(helich=(13, 17), spek=(14, 19), sedum=(22, 28))[kind]
        for i in range(int(U(*n))):
            a = U(-1, 1) * 1.45; L = dict(helich=U(.14, .28), spek=U(.13, .27), sedum=U(.09, .19))[kind]; d = np.array([np.sin(a) * 1., U(-.35, .75) if kind != 'spek' else U(-.2, 1.), U(.3, .95)]); d /= np.linalg.norm(d); p0 = np.array([U(-.02, .02), U(-.02, .02), 0]); drop_ = dict(helich=.55, spek=.15, sedum=.4)[kind]
            end = p0 + d * L; end[1] -= L * drop_ * U(.4, 1.); pts = bez(p0, p0 + d * L * .6 + np.array([0, .12 * L, 0]), end, 10); pid = b.leafid(p0); P, F = tube(pts, .0016, .0009, 4); b.part(P, F, np.zeros((len(P), 2)), np.linspace(0, 1, 10).repeat(5), pid, M['red'] if kind == 'spek' else st)
            m = dict(helich=22, spek=20, sedum=30)[kind]
            for j in range(m):
                q = .12 + .88 * (j + .5) / m; k = q * 9; i0 = int(min(8, k)); c = pts[i0] + (pts[i0 + 1] - pts[i0]) * (k - i0); tg = pts[min(9, i0 + 1)] - pts[max(0, i0 - 1)]; tg /= np.linalg.norm(tg) + 1e-9
                aa = j * 2.4 + U(-.3, .3); s1 = np.cross(tg, [0, 0, 1.]); s1 /= np.linalg.norm(s1) + 1e-9; s2 = np.cross(tg, s1); dd = (np.cos(aa) * s1 + np.sin(aa) * s2) * .9 + tg * .45
                l = dict(helich=.026, spek=.022, sedum=.018)[kind] * U(.75, 1.15) * (1.1 - .35 * q)
                P, F, UV, t = blade(o_round if kind != 'sedum' else o_ell(.7), l, l * (.5 if kind != 'sedum' else .34), 8, 5, bend=U(0, .4), fold=U(.05, .25), cup=.4 if kind == 'spek' else .1)
                b.part(P @ frame(dd, np.array([U(-.4, .4), U(.2, .9), U(.5, 1.)])).T + c, F, UV, q + 0 * t, pid, lm, U(-.16, .16) + .15 * (q > .85))
    elif kind == 'aspar':
        for i in range(int(U(17, 22))):
            a = U(-1, 1) * 1.45; L = U(.16, .32); d = np.array([np.sin(a) * .9, U(.05, 1.), U(.4, 1.)]); d /= np.linalg.norm(d); p0 = np.array([U(-.02, .02), U(-.02, .02), 0]); pid = b.leafid(p0); end = p0 + d * L; end[1] -= L * U(.25, .7); pts = bez(p0, p0 + d * L * .65 + np.array([0, .1 * L, 0]), end, 12); P, F = tube(pts, .0014, .0007, 4)
            b.part(P, F, np.zeros((len(P), 2)), np.linspace(0, 1, 12).repeat(5), pid, st); m = int(L / .0022)
            for j in range(m):
                q = .08 + .92 * (j + .5) / m; k = q * 11; i0 = int(min(10, k)); c = pts[i0] + (pts[i0 + 1] - pts[i0]) * (k - i0); tg = pts[i0 + 1] - pts[i0]; tg /= np.linalg.norm(tg) + 1e-9; s1 = np.cross(tg, [0, 0, 1.]); s1 /= np.linalg.norm(s1) + 1e-9; s2 = np.cross(tg, s1); aa = U(0, 6.28)
                dd = (np.cos(aa) * s1 + np.sin(aa) * s2 * .8) + tg * .5; l = .022 * np.sin(np.pi * min(1, .15 + q * .85)) ** .5 * U(.7, 1.15) + .003
                P, F, UV, t = blade(o_ell(.7), l, l * .055, 4, 3, bend=U(0, .4), fold=.2); b.part(P @ frame(dd, np.array([U(-.5, .5), U(0, .8), 1.])).T + c, F, UV, q + 0 * t, pid, lm, U(-.14, .14))
    elif kind == 'setc':
        for i in range(int(U(9, 12))):
            a = U(-1, 1) * 1.3; L = U(.12, .26); d = np.array([np.sin(a), U(-.4, .7), U(.4, 1.)]); d /= np.linalg.norm(d); p0 = np.array([U(-.02, .02), U(-.02, .02), 0]); end = p0 + d * L; end[1] -= L * U(.2, .6); pts = bez(p0, p0 + d * L * .6 + np.array([0, .12 * L, 0]), end, 10); pid = b.leafid(p0); P, F = tube(pts, .003, .002); b.part(P, F, np.zeros((len(P), 2)), np.linspace(0, 1, 10).repeat(6), pid, lm)
            for j in range(int(U(6, 8.9))):
                q = .15 + .85 * j / 7; q = min(q, 1); k = q * 9; i0 = int(min(8, k)); c = pts[i0] + (pts[i0 + 1] - pts[i0]) * (k - i0); tg = pts[min(9, i0 + 1)] - pts[max(0, i0 - 1)]; tg /= np.linalg.norm(tg) + 1e-9; sg = 1 if j % 2 else -1; s1 = np.cross(tg, [0, .2, 1.]); s1 /= np.linalg.norm(s1) + 1e-9
                dd = s1 * sg * .8 + tg * .7 + np.array([0, U(-.1, .2), U(0, .4)]); l = U(.075, .125) * (1.1 - .25 * q); lid = b.leafid(p0)
                P, F, UV, t = blade(o_ell(.85, .7), l, l * .19, 14, 7, bend=U(.2, .9), fold=U(.25, .5), twist=U(-.3, .3)); b.part(P @ frame(dd, np.array([U(-.3, .3), U(.3, 1.), U(.5, 1.)])).T + c, F, UV, q + 0 * t, lid, lm, U(-.16, .18))
    return b


ALL = ('heart', 'lime', 'monstera', 'lily', 'pep', 'fern', 'spider', 'lirio', 'syng', 'purple') + NEWK
VN2 = {k: (4 if k in ('heart', 'lime') else 3) for k in ALL}


def kit(s, kinds=None, seed=11):
    kinds = kinds or ALL
    M = mats2(s, set(kinds) | {'flower', 'heart'}); K = {}
    for k in kinds:
        K[k] = []
        for j in range(VN2[k]):
            b = plant2(k, np.random.default_rng(seed * 100 + hash_(k) + j), M); P = np.concatenate(b.P); F = np.concatenate(b.F); m = np.concatenate(b.mat)
            i = s.mesh(P, F, 0, UV=np.concatenate(b.UV), t=np.concatenate(b.t), leaf=np.concatenate(b.leaf), tint=np.concatenate(b.tint)); s.T[-1][:, 3] = m.astype(np.uint32)
            K[k].append((i, np.array(b.root), len(F)))
    return K, M


if __name__ == '__main__':
    import rt, sys, json
    from scenelib import *
    s = Scene('gal', tex=1024); K, M = kit(s)
    s.sun = dict(dir=[-.55, .78, .6], size=.07, e=[3.7, 3.45, 2.95], group=0); s.sky = dict(up=[1.25, 1.4, 1.6], hor=[.62, .68, .74], down=[.12, .13, .12], e=.85, group=1)
    for n, k in enumerate(ALL): s.add(K[k][0][0], xf(t=((n % 8) * .62, -(n // 8) * .62, 0)), seed=.5, id=1)
    s.box((-1, -3, -.4), (6, 1, -.35), s.mat('w', (.5, .5, .48), .9))
    s.save(); rt.render('gal', [('gal', dict(eye=[2.17, -.93, 6.], at=[2.17, -.93, 0.], ortho=2.6, w=2000, h=1040, spp=90, aov=False))]); a, _, _ = rt.load('gal'); rt.save('out/gal.png', a.sum(2), 1.)

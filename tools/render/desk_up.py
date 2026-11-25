"""textures for the desk: the keyboard's legends and the phone's back; and the changes to desk.py"""
from playwright.sync_api import sync_playwright
APPLE = 'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701'
ROWS = [[('esc', 1.5)] + [(f'F{i}', 1) for i in range(1, 13)] + [('', 1)], [('§', 1)] + [(c, 1) for c in '1234567890-='] + [('⌫', 1.5)], [('⇥', 1.5)] + [(c, 1) for c in 'QWERTYUIOP[]'] + [('↵', 1)], [('⇪', 1.75)] + [(c, 1) for c in "ASDFGHJKL;'\\"] + [('', .75)], [('⇧', 1.25), ('`', 1)] + [(c, 1) for c in 'ZXCVBNM,./'] + [('⇧', 2.25)], [('fn', 1), ('⌃', 1), ('⌥', 1), ('⌘', 1.25), ('', 5), ('⌘', 1.25), ('⌥', 1), ('‹', 1), ('↕', 1), ('›', 1)]]
if __name__ == '__main__':
    keys = []
    for r, row in enumerate(ROWS):
        tot = sum(w for _, w in row); x = 0
        for t, w in row: keys.append((t, x / tot, r / 6, w / tot)); x += w
    svg = ''.join(f'<text x="{(x + w / 2) * 2600:.0f}" y="{(y + 1 / 12) * 1120 + 24:.0f}" font-size="{46 if len(t) > 1 else 62}" text-anchor="middle" fill="#cfd1d2" font-family="Helvetica,Arial" font-weight="300">{t.replace("<", "")}</text>' for t, x, y, w in keys)
    with sync_playwright() as p:
        b = p.chromium.launch(channel='chrome'); g = b.new_page()
        for name, w, h, body in (('keys', 2600, 1120, f'<rect width="2600" height="1120" fill="#141516"/>{svg}'), ('phoneback', 700, 1440, f'<rect width="700" height="1440" fill="#f4f3f0"/><g transform="translate(350 612) scale(9) translate(-12 -12)"><path d="{APPLE}" fill="#b9b8b4"/></g>')):
            g.set_viewport_size(dict(width=w, height=h)); g.set_content(f'<body style="margin:0"><svg width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'); g.screenshot(path=f'ph/{name}.png')
        b.close()
    s = open('desk.py', encoding='utf8').read()
    if 'def slab' not in s:
        i = s.index('# a phone, face up and asleep'); j = s.index('# fountain pen')
        s = s[:i] + '''# ---- a white phone, face down; a laptop, open
def outline(w, h, rad, n=14):
    o = []
    for q, (sx, sy) in enumerate(((1, 1), (-1, 1), (-1, -1), (1, -1))):
        for a in np.linspace(0, np.pi / 2, n): t = a + q * np.pi / 2; o.append((sx * (w / 2 - rad) + rad * np.cos(t), sy * (h / 2 - rad) + rad * np.sin(t)))
    return np.array(o)


def slab(w, h, z0, z1, rad, bev, mat, top=None, uv=False, M=None):
    """a rounded plate with soft edges; its top can carry a picture"""
    rings = [(bev * .9, z0), (bev * .25, z0 + bev * .3), (0, z0 + bev), (0, z1 - bev), (bev * .12, z1 - bev * .45), (bev * .45, z1 - bev * .12), (bev, z1)]; P = []
    for d, z in rings: o = outline(w - 2 * d, h - 2 * d, max(rad - d, .002)); P.append(np.column_stack([o, np.full(len(o), z)]))
    n = len(P[0]); V = np.concatenate(P); F = []
    for k in range(len(rings) - 1):
        for i in range(n): a, b = k * n + i, k * n + (i + 1) % n; F += [[a, b, b + n], [a, b + n, a + n]]
    s.add(s.mesh(V, np.array(F), mat), M)
    c = np.concatenate([[[0, 0, z1]], P[-1]]); F = np.array([[0, 1 + i, 1 + (i + 1) % n] for i in range(n)]); UV = np.stack([c[:, 0] / w + .5, .5 - c[:, 1] / h], 1) if uv else None
    s.add(s.mesh(c, F, mat if top is None else top, N=np.tile([0, 0, 1.], (n + 1, 1)), UV=UV), M)


def disc(x, y, z0, z1, rad, mat, M, lens=None):
    P, F, UV = lathe([(rad, z0), (rad, z1), (rad * .86, z1), (1e-4, z1)], 40); P = np.stack([P[:, 0] + x, P[:, 2] + y, P[:, 1]], 1); s.add(s.mesh(P, F[:, ::-1], mat), M)
    if lens is not None: P, F, UV = lathe([(rad * .8, z1 + .0012), (1e-4, z1 + .003)], 40); P = np.stack([P[:, 0] + x, P[:, 2] + y, P[:, 1]], 1); s.add(s.mesh(P, F[:, ::-1], lens), M)


alu = s.mat('alu', (.80, .80, .81), .34, metal=1); white = s.mat('wglass', (.90, .895, .88), .20, spec=.55); back = s.mat('wback', (1, 1, 1), .22, spec=.55, tBase='ph/phoneback.png'); dark = s.mat('lens', (.004, .005, .008), .04, spec=.9); band = s.mat('band', (.86, .85, .83), .22, metal=1)
Mp = put(Rz(.16), (1.50, -.52, .003)); slab(.352, .724, 0, .038, .056, .007, band, back, True, Mp)
slab(.172, .176, .037, .050, .046, .005, white, None, False, put(Rz(.16), np.array([1.50, -.52, .003]) + Rz(.16) @ np.array([-.077, .258, 0])))
for lx, ly in ((-.118, .300), (-.118, .214), (-.038, .257)): disc(lx, ly, .048, .058, .034, band, Mp, dark)
disc(-.038, .318, .048, .0515, .011, s.mat('flash', (.95, .9, .78), .4), Mp)
LX, LY, LR = 2.02, .40, -.13; Ml = put(Rz(LR), (LX, LY, .004)); slab(1.52, 1.06, .006, .056, .055, .010, alu, None, False, Ml)
well = s.mat('well', (.018, .0185, .019), .6); P, F, N = rbox((-.665, -.02, .0545), (.665, .395, .0562), .0008, .004); s.add(s.mesh(P, F, well, N=N), Ml)
keym = s.mat('keys', (1, 1, 1), .52, spec=.35, tBase='ph/keys.png')
from desk_up import ROWS
for r_, row in enumerate(ROWS):
    tot = sum(w for _, w in row); x_ = 0
    for t_, w_ in row:
        x0, x1 = -.655 + 1.31 * x_ / tot + .005, -.655 + 1.31 * (x_ + w_) / tot - .005; y1, y0 = .386 - r_ * .0665 - .004, .386 - (r_ + 1) * .0665 + .004; P, F, N = rbox((x0, y0, .0555), (x1, y1, .0625), .004, .003); UV = np.stack([(P[:, 0] + .655) / 1.31, (.386 - P[:, 1]) / .399], 1); s.add(s.mesh(P, F, keym, N=N, UV=UV), Ml); x_ += w_
P, F, N = rbox((-.30, -.46, .0555), (.30, -.075, .0567), .0006, .012); s.add(s.mesh(P, F, s.mat('pad', (.74, .74, .75), .30, metal=1), N=N), Ml)
tilt = np.array([[1, 0, 0], [0, np.cos(1.92), -np.sin(1.92)], [0, np.sin(1.92), np.cos(1.92)]]); Mh = np.zeros((3, 4)); Mh[:, :3] = Rz(LR) @ tilt; Mh[:, 3] = np.array([LX, LY, .06]) + Rz(LR) @ np.array([0, .515, 0]) + Rz(LR) @ tilt @ np.array([0, .50, 0])
slab(1.52, .99, -.012, .010, .05, .006, alu, dark, False, Mh); scr = s.mat('scr', (1, 1, 1), .25, spec=.4, tBase='ph/screen.png'); P = np.array([[-.73, -.45, .0112], [.73, -.45, .0112], [.73, .46, .0112], [-.73, .46, .0112]]); s.add(s.mesh(P, np.array([[0, 1, 2], [0, 2, 3]]), scr, UV=np.array([[0, 1], [1, 1], [1, 0], [0, 0.]])), Mh)
''' + s[j:]
        i = s.index('# a card wallet and a brass ruler'); j = s.index('# CC0 objects'); s = s[:i] + s[j:]
        s = s.replace("obj('Camera_01', 1.0, (2.15, .34, .0), -.6)\n", '')
        open('desk.py', 'w', encoding='utf8').write(s)
    from PIL import Image
    Image.open('out/re_in-midday.png').convert('RGB').crop((200, 100, 1700, 1040)).save('ph/screen.png'); print('ready')

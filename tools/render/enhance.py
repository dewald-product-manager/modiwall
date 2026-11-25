"""Every photograph on the site, rebuilt from its true original, registered to the crop and grade in use, enlarged and brought into focus.
   python enhance.py [names]      -> out/<name>.png (long edge up to 2880)"""
import cv2, numpy as np, json, os, sys, time
from PIL import Image, ImageOps
from scipy.ndimage import gaussian_filter
from sr import Sr
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')) + '/'; sp = json.load(open(R + 'tools/images.json', encoding='utf8')); MT = json.load(open('match.json'))
SRC = 'orig/'                                   # the site's photographs as they were before this pass
LONG = 2880
sift = cv2.SIFT_create(4000)


def g8(a): return cv2.cvtColor(a, cv2.COLOR_RGB2GRAY)
def blur(a, s):
    k = max(1, int(s / 6)); h, w = a.shape[:2]; q = cv2.resize(a, (max(1, w // k), max(1, h // k)), interpolation=cv2.INTER_AREA); q = cv2.GaussianBlur(q, (0, 0), s / k); return cv2.resize(q, (w, h), interpolation=cv2.INTER_CUBIC)


def register(site, rawf):
    """the raw original, warped on to the site's framing at its own density; None when it does not sit exactly"""
    raw = np.asarray(ImageOps.exif_transpose(Image.open(rawf)).convert('RGB')); n = 1500
    ks, kr = min(1, n / max(site.shape[:2])), min(1, n / max(raw.shape[:2])); f = lambda a, k: cv2.resize(g8(a), None, fx=k, fy=k, interpolation=cv2.INTER_AREA)
    ps, ds = sift.detectAndCompute(f(site, ks), None); pr, dr = sift.detectAndCompute(f(raw, kr), None); bf = cv2.FlannBasedMatcher(dict(algorithm=1, trees=5), dict(checks=64))
    m = [a for a, b in bf.knnMatch(ds, dr, k=2) if a.distance < .75 * b.distance]
    if len(m) < 60: return None, 0
    A = np.float32([ps[a.queryIdx].pt for a in m]) / ks; B = np.float32([pr[a.trainIdx].pt for a in m]) / kr; H, inl = cv2.findHomography(A, B, cv2.RANSAC, 4.0)
    if H is None or inl.sum() < 60: return None, 0
    h, w = site.shape[:2]; c = np.float32([[[w / 2, h / 2], [w / 2 + 50, h / 2]]]); d = cv2.perspectiveTransform(c, H)[0]; dens = float(np.hypot(*(d[1] - d[0])) / 50)
    k = min(LONG / max(w, h), max(1., dens)); S = np.diag([1 / k, 1 / k, 1.]); W_, H_ = round(w * k), round(h * k); k2 = dens / k
    if k2 > 1.6: raw = cv2.GaussianBlur(raw, (0, 0), .42 * k2)
    out = cv2.warpPerspective(raw, H @ S, (W_, H_), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
    cov = cv2.warpPerspective(np.full(raw.shape[:2], 255, np.uint8), H @ S, (W_, H_), flags=cv2.INTER_NEAREST | cv2.WARP_INVERSE_MAP)
    # the same picture? compare structure at the site's own size
    t = cv2.resize(out, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32); s = site.astype(np.float32); a, b = (x.mean(2) - blur(x.mean(2), 12) for x in (t, s))
    cor = float((a * b).mean() / np.sqrt((a * a).mean() * (b * b).mean() + 1e-6)); return (out if cov.min() > 0 else None), dens if cor > .72 else -cor


def grade(out, site):
    """carry the site's colour and light across: only the broad differences, never the detail"""
    h, w = out.shape[:2]; s = cv2.resize(site, (w, h), interpolation=cv2.INTER_CUBIC).astype(np.float32); o = out.astype(np.float32); q = .022 * max(w, h); return np.clip(o + (blur(s, q) - blur(o, q)), 0, 255)


def enhance(sr, name, site, rawf, plain=False):
    base, dens = register(site, rawf) if rawf else (None, 0); why = f'raw x{dens:.2f}' if base is not None and dens > 0 else 'site'
    if base is None or dens <= 1.02: base = site.astype(np.float32); strong = max(site.shape[:2]) >= 2000; why = 'site' + (f' (raw {dens:.2f})' if rawf else '')
    else: base = grade(base, site); strong = max(base.shape[:2]) >= 2300
    h, w = base.shape[:2]; W_, H_ = (round(w * LONG / max(w, h)), round(h * LONG / max(w, h))) if max(w, h) >= 1500 or plain else (round(w * min(LONG, max(w, h) * 2.6) / max(w, h)), round(h * min(LONG, max(w, h) * 2.6) / max(w, h)))
    up = np.clip(cv2.resize(base, (W_, H_), interpolation=cv2.INTER_AREA if W_ < w else cv2.INTER_LANCZOS4), 0, 255)
    if plain: return up, why
    k = min(1, 1440 / max(w, h)); small = np.clip(cv2.resize(base, None, fx=k, fy=k, interpolation=cv2.INTER_AREA) if k < 1 else base, 0, 255)
    x = sr.up((small + .5).astype('u1')); x = cv2.resize(x, (W_, H_), interpolation=cv2.INTER_AREA).astype(np.float32)
    x += blur(up, 10) - blur(x, 10)                       # light and colour stay the photograph's own
    # where the photograph has fine, even texture (cloth, plaster, stone) keep it; where it has edges, take the sharper drawing
    L = up.mean(2); d = L - cv2.GaussianBlur(L, (0, 0), 2.2); e = np.sqrt(cv2.GaussianBlur(d * d, (0, 0), 6)); t = np.clip((e - 2.2) / 5.5, 0, 1)[..., None]
    a = (.30 + .36 * t) if strong else (.55 + .37 * t); o = up * (1 - a) + x * a
    # finish: a little local contrast, a fine edge, and the faintest grain so large areas stay photographic
    l = o.mean(2, keepdims=True); o = o + (l - blur(l[..., 0], 34)[..., None]) * .10; f = o - cv2.GaussianBlur(o, (0, 0), 1.05); lim = 9.; o = o + np.clip(f * (.55 if strong else .38), -lim, lim)
    o = o + np.random.default_rng(3).normal(0, .9, o.shape[:2])[..., None]
    return np.clip(o, 0, 255), why


if __name__ == '__main__':
    os.makedirs('done', exist_ok=True); names = sys.argv[1:] or [k for k, v in sp.items() if v.get('kind', 'photo') == 'photo']; sr = Sr(); t0 = time.time()
    PLAIN = {'press-pinehaven', 'press-suncity', 'piece-panel', 'piece-grid', 'piece-vessel'}
    for k in names:
        v = sp[k]; im = ImageOps.exif_transpose(Image.open(SRC + v['src'])).convert('RGB'); site = np.asarray(im); raw = None
        for n, sc, f, sz in MT.get(k, {}).get('match', []):
            if sc > 1.02 and n > 100: raw = f; break
        if k.startswith('year-'): raw = None
        o, why = enhance(sr, k, site, raw, k in PLAIN); Image.fromarray((o + .5).astype('u1')).save(f'done/{k}.png', compress_level=2); print(k, im.size, '->', (o.shape[1], o.shape[0]), why, f'{time.time() - t0:.0f}s', flush=True)
    sr.close()

"""Turn src/originals/* into responsive AVIF + JPEG in public/img. The originals are the enhanced masters (tools/render/enhance.py).

Replacing a photo: drop the HD file into src/originals/ with the SAME name, then
    python tools/images.py            (needs Pillow 11.3 or newer)
    node build.mjs
"""
import json
import os
import re
import sys
from PIL import Image, ImageChops, ImageFilter, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src", "originals")
OUT = os.path.join(ROOT, "public", "img")
WIDTHS = {"photo": [480, 960, 1440, 2048, 2880], "plant": [320], "logo": [280]}

os.makedirs(OUT, exist_ok=True)
spec = json.load(open(os.path.join(ROOT, "tools", "images.json"), encoding="utf8"))
only = set(sys.argv[1:])  # optional: names to rebuild
manifest = {}


def trim(im):
    diff = ImageChops.difference(im, Image.new("RGB", im.size, "white"))
    box = diff.convert("L").point(lambda v: 255 if v > 18 else 0).getbbox()
    return im.crop(box) if box else im


for key, v in spec.items():
    kind = v.get("kind", "photo")
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, v["src"]))).convert("RGB")
    if "crop" in v:
        im = im.crop(v["crop"])
    if v.get("white"):  # lift a studio grey background to pure white
        im = im.point(lambda p: min(255, round(p * 255 / 247)))
    if kind == "logo":
        im = trim(im)
    widths = [w for w in WIDTHS[kind] if w <= im.width] or [im.width]
    if kind == "photo" and im.width < WIDTHS["photo"][-1] and im.width > widths[-1] * 1.12:
        widths.append(im.width)
    fallback = min(widths, key=lambda w: abs(w - 960))
    if not only or key in only:
        for w in widths:
            h = round(im.height * w / im.width)
            # the larger the picture, the closer its pixels stand, and the harder it can be packed
            q = 60 if kind != "photo" else 66 if w <= 480 else 63 if w <= 960 else 60 if w <= 1440 else 57 if w <= 2048 else 53
            o = im.resize((w, h), Image.LANCZOS)
            if kind == "photo" and w < im.width:
                o = o.filter(ImageFilter.UnsharpMask(.6, 38, 1))
            o.save(os.path.join(OUT, f"{key}-{w}.avif"), quality=q, speed=4)
        im.resize((fallback, round(im.height * fallback / im.width)), Image.LANCZOS).save(
            os.path.join(OUT, f"{key}-{fallback}.jpg"), quality=80, optimize=True, progressive=True)
    avg = im.resize((1, 1), Image.BOX).getpixel((0, 0))
    manifest[key] = {
        **{a: b for a, b in v.items() if a not in ("src", "crop", "white")},
        "w": im.width, "h": im.height, "widths": widths, "fallback": fallback,
        "avg": "#%02x%02x%02x" % avg,
    }

json.dump(manifest, open(os.path.join(ROOT, "src", "images.manifest.json"), "w", encoding="utf8"), indent=1)

if not only or "og" in only:  # social share card
    og = Image.open(os.path.join(SRC, "courtyard-bands.avif"))
    og = ImageOps.fit(ImageOps.exif_transpose(og).convert("RGB"), (1200, 630), Image.LANCZOS)
    og.save(os.path.join(OUT, "og.jpg"), quality=82, optimize=True)

# a share card for every photo that opens a page ({{eager name}}), so a shared link shows that page
PAGES = os.path.join(ROOT, "src", "pages")
leads = {n for f in os.listdir(PAGES) if f.endswith(".html")
         for n in re.findall(r"\{\{eager\s+([\w-]+)", open(os.path.join(PAGES, f), encoding="utf8").read())}
for key in sorted(leads & set(spec)):
    if not only or "og" in only or key in only:
        im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, spec[key]["src"]))).convert("RGB")
        if "crop" in spec[key]:
            im = im.crop(spec[key]["crop"])
        ImageOps.fit(im, (1200, 630), Image.LANCZOS).save(os.path.join(OUT, f"share-{key}.jpg"), quality=80, optimize=True)
print(len(manifest), "images ready")

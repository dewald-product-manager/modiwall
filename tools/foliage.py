"""Pack the plant cut-outs in src/foliage/ into one texture: public/img/foliage.webp

Each cell is 256 px, 4 x 4. Every plant is placed with its stem at the bottom centre of its cell.
Hanging plants (name starts with "h-") are stored upside down so the same rule holds.
The order here must match SPECIES in src/js/wall.js. Run: python tools/foliage.py
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDER = ["monstera", "scindapsus", "ivy", "fern", "delmon", "diff", "grass", "laurel",
         "fittonia", "trad", "h-fern", "h-ivy", "h-trad", "h-aspar", "h-delmon", "h-box"]
CALM = {"h-fern", "h-aspar", "h-ivy"}
S = 256
atlas = Image.new("RGBA", (S * 4, S * 4))
for i, name in enumerate(ORDER):
    im = Image.open(os.path.join(ROOT, "src", "foliage", name + ".png")).convert("RGBA")
    if name.startswith("h-"):
        im = im.rotate(180)
    else:  # cut the bare stem away
        im = im.crop((0, 0, im.width, round(im.height * 0.86)))
    px = np.array(im).astype(float)
    if name in CALM:  # studio flash bleaches these fronds: bring the highlights down
        lum = px[..., :3].mean(2, keepdims=True)
        px[..., :3] *= np.where(lum > 92, (92 + (lum - 92) * 0.34) / np.maximum(lum, 1), 1)
        im = Image.fromarray(px.astype("uint8"), "RGBA")
    a = px[..., 3]
    foot = a[-max(6, im.height // 12):].sum(0).astype(float)
    ax = (foot * np.arange(im.width)).sum() / max(foot.sum(), 1) if foot.sum() else im.width / 2
    half = max(ax, im.width - ax)
    k = min((S - 8) / im.height, (S - 8) / (2 * half))
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    cell = Image.new("RGBA", (S, S))
    cell.alpha_composite(im, (max(0, round(S / 2 - ax * k)), S - 4 - im.height))
    atlas.paste(cell, ((i % 4) * S, (i // 4) * S))
# bleed colour into transparent pixels so mip-maps have no pale fringe
arr = np.array(atlas).astype(float)
out = os.path.join(ROOT, "public", "img", "foliage.webp")
Image.fromarray(arr.astype("uint8"), "RGBA").save(out, quality=78, alpha_quality=65, method=6)  # alpha 65: same look, 40 KB lighter
pot = Image.open(os.path.join(ROOT, "src", "foliage", "pot.png")).convert("RGBA")
pot.thumbnail((220, 240), Image.LANCZOS)
pot.save(os.path.join(ROOT, "public", "img", "pot.webp"), quality=84, method=6)
print("foliage", os.path.getsize(out) // 1024, "KB")

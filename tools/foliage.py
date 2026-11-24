"""Pack the plant cut-outs in src/foliage/ into one texture: public/img/foliage.webp

Every cut-out comes from a photo of a planted Modiwall. Each cell is 256 px, 5 x 4. Plants hang, so each is
stored upside down with the point it hangs from at the bottom centre of its cell.
The order here must match SP in src/js/wall.js. Run: python tools/foliage.py
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDER = ["philodendron-lime-a", "philodendron-lime-b", "philodendron-a", "philodendron-b", "monstera-leaf-a", "monstera-leaf-b", "monstera-group", "sword-fern-a", "sword-fern-b", "sword-fern-c", "spider-a", "spider-b", "asparagus-a", "asparagus-b", "heartleaf", "herb-a", "ribbon-a", "variegated", "burgundy", "ribbon-b"]
S = 256
COLS = 5
atlas = Image.new("RGBA", (S * COLS, S * 4))
for i, name in enumerate(ORDER):
    im = Image.open(os.path.join(ROOT, "src", "foliage", name + ".png")).convert("RGBA").rotate(180)
    a = np.array(im)[..., 3].astype(float)
    foot = a[-max(6, im.height // 5):].sum(0)
    ax = (foot * np.arange(im.width)).sum() / max(foot.sum(), 1)
    ax = im.width / 2 + (ax - im.width / 2) * 0.4
    half = max(ax, im.width - ax)
    k = min((S - 8) / im.height, (S - 8) / (2 * half))
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    cell = Image.new("RGBA", (S, S))
    cell.alpha_composite(im, (max(0, round(S / 2 - ax * k)), S - 4 - im.height))
    atlas.paste(cell, ((i % COLS) * S, (i // COLS) * S))
out = os.path.join(ROOT, "public", "img", "foliage.webp")
atlas.save(out, quality=80, alpha_quality=65, method=6)  # alpha 65: same look, lighter
pot = Image.open(os.path.join(ROOT, "src", "foliage", "pot.png")).convert("RGBA")
pot.thumbnail((220, 240), Image.LANCZOS)
pot.save(os.path.join(ROOT, "public", "img", "pot.webp"), quality=84, method=6)
print("foliage", os.path.getsize(out) // 1024, "KB")

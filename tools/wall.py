"""Export the rendered plantings in src/wall/ to public/img/wall/. Run: python tools/wall.py   (Pillow 11.3+)
Each planting has: colour, light and normals (-aux), leaf numbers (-id) and a leaf table (.bin). "plants" holds every plant on its own.
"""
import os
import shutil
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(ROOT, "src", "wall")
out = os.path.join(ROOT, "public", "img", "wall")
os.makedirs(out, exist_ok=True)
for name in ("forest", "fern", "jungle", "plants"):
    sizes = [("", 1)] if name == "plants" else [("", 1), ("-s", 2 / 3 if name == "forest" else 3 / 4)]
    for part, q in (("", 68 if name == "plants" else 56), ("-aux", 50)):
        im = Image.open(os.path.join(src, f"{name}{part}.png")).convert("RGB")
        for suffix, k in sizes:
            small = im if k == 1 else im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
            small.save(os.path.join(out, f"{name}{part}{suffix}.avif"), quality=q, speed=4, subsampling="4:4:4" if name == "plants" else "4:2:0")
    for suffix, _ in sizes:
        shutil.copyfile(os.path.join(src, f"{name}-id{suffix}.webp"), os.path.join(out, f"{name}-id{suffix}.webp"))
    for f in (name + ".bin", name + "-lit.bin", name + "-hull.bin"):
        if os.path.exists(os.path.join(src, f)):
            shutil.copyfile(os.path.join(src, f), os.path.join(out, f))
print("plantings ready")

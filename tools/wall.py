"""Export the rendered plantings in src/wall/ to public/img/wall/. Run: python tools/wall.py   (Pillow 11.3+)
"plants" holds every plant on its own: colour, light and normals (-aux), leaf numbers (-id) and tables (.bin). Each of the
six plantings is a table of what stands where, what can be seen, and the light every point has in the traced wall (-light).
"""
import os
import shutil
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(ROOT, "src", "wall")
out = os.path.join(ROOT, "public", "img", "wall")
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    os.remove(os.path.join(out, f))
for part, q in (("", 64), ("-aux", 48)):
    Image.open(os.path.join(src, f"plants{part}.png")).convert("RGB").save(os.path.join(out, f"plants{part}.avif"), quality=q, speed=4, subsampling="4:4:4")
for f in ("plants-id.webp", "plants.bin", "plants-hull.bin"):
    shutil.copyfile(os.path.join(src, f), os.path.join(out, f))
for name in ("in-morning", "in-midday", "in-evening", "ex-morning", "ex-midday", "ex-evening"):
    im = Image.open(os.path.join(src, f"{name}-light.png")).convert("RGB")
    im.resize((round(im.width * 0.75), round(im.height * 0.75)), Image.BOX).save(os.path.join(out, f"{name}-light.avif"), quality=56, speed=4, subsampling="4:2:0")
    for f in (".bin", "-lit.bin"):
        shutil.copyfile(os.path.join(src, name + f), os.path.join(out, name + f))
print("plantings ready", sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out)) // 1024, "KB")

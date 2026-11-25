"""Export the wall photographs in src/wall/ (joined from photos of planted Modiwalls) to public/img/wall/.
Run: python tools/wall.py   (Pillow 11.3+)
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(ROOT, "public", "img", "wall")
os.makedirs(out, exist_ok=True)
for name in ("forest", "fern", "jungle"):
    im = Image.open(os.path.join(ROOT, "src", "wall", name + ".jpg")).convert("RGB")
    im.save(os.path.join(out, name + ".avif"), quality=50, speed=4)
    im.resize((1152, round(im.height * 1152 / im.width)), Image.LANCZOS).save(os.path.join(out, name + "-s.avif"), quality=52, speed=4)
print("wall photographs ready")

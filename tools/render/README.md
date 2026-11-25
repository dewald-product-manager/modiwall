# Rendering the plants and rooms

A small path tracer that runs on WebGPU inside Chrome, driven from Python (numpy, scipy, Pillow, Playwright).

    python dl.py                          # CC0 furniture and materials from Poly Haven, into ph/
    python themes.py sprites all 1 && python themes.py plates all .75 && python themes.py pack && python ../wall.py   # the six plantings
    python specimens.py                   # every species on its own
    python cut.py parts.npz stldir 1700 200   # the wall cut through
    python desk.py 3800 130               # the desk under the journal (wants flatwhite.png in ph/)
    python rooma.py 2200 220 in,out,both  # the commission rooms, bare and planted
    python roomc.py 3840 480              # stone, timber, light: the room lit one lamp at a time
    python roomn.py 3840 340              # come home to it
    python hall.py 1 420                  # one bay of the dark hall
    python pieces.py parts.npz 1700 260   # the three pieces, from the CAD meshes (`tools/cad.py` writes parts.npz)
    python export.py in,out,both,mat,night,hall   # denoise and write the site's pictures

`plants.py` and `plants2.py` hold the species, `themes.py` the three interior and three exterior plantings, `roomlib.py` the furniture and materials. What these write (`out`, `tex`, `ptex`, `ph`, scene folders) is ignored by git.

`enhance.py` rebuilds the photographs: it registers each true original to the crop in use, enlarges and sharpens it with
Real-ESRGAN x4plus (Qualcomm's ONNX build) through onnxruntime-web on WebGPU (`sr.py`, `sr.html`), and blends that with the
photograph's own texture. The models and runtime are downloaded separately and are not in this repository.

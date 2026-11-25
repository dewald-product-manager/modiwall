# Rendering the plants and rooms

A small path tracer that runs on WebGPU inside Chrome, driven from Python (numpy, scipy, Pillow, Playwright).

    python dl.py                          # CC0 furniture and materials from Poly Haven, into ph/
    python sprites.py && python plate.py forest,fern,jungle && python pack.py plants,forest,fern,jungle && python ../wall.py
    python rooma.py 2200 220 in,out,both  # the commission rooms, bare and planted
    python roomc.py 2560 300              # stone, timber, light: the room lit one lamp at a time
    python roomb.py 2560 420 night        # come home to it
    python hall.py 1 420                  # one bay of the dark hall
    python export.py in,out,both,mat,night,hall   # denoise and write the site's pictures

`plants.py` holds the species, `roomlib.py` the furniture and materials. What these write (`out`, `tex`, `ptex`, `ph`, scene folders) is ignored by git.

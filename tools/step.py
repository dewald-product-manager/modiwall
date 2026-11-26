"""STEP to STL for tools/cad.py, through gmsh's own OpenCASCADE (pip install gmsh, in any Python).

    python tools/step.py "Panel rev19.stp" panel.stl [max_mm] [min_mm] [per_turn]

The mesh follows curvature, so fillets and rails stay round while flat faces stay light. Millimetres, as drawn.
"""
import sys

import gmsh

src, out = sys.argv[1], sys.argv[2]
hi = float(sys.argv[3]) if len(sys.argv) > 3 else 30
lo = float(sys.argv[4]) if len(sys.argv) > 4 else 2.5
CURVE = float(sys.argv[5]) if len(sys.argv) > 5 else 7  # elements per full turn of a curve
gmsh.initialize()
gmsh.option.setNumber('General.Terminal', 0)
gmsh.model.occ.importShapes(src)
gmsh.model.occ.synchronize()
for k, v in {'Mesh.MeshSizeMax': hi, 'Mesh.MeshSizeMin': lo, 'Mesh.MeshSizeFromCurvature': CURVE,
             'Mesh.MeshSizeExtendFromBoundary': 0, 'Mesh.Algorithm': 6, 'Mesh.Binary': 1}.items():
    gmsh.option.setNumber(k, v)
gmsh.model.mesh.generate(2)
gmsh.write(out)
n = sum(len(t[0]) for t in [gmsh.model.mesh.getElementsByType(2)])
print(src, '->', out, n, 'triangles')
gmsh.finalize()

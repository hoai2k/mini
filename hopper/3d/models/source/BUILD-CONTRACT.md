# Model production interface

User authorized high-confidence batch first, commit/push, then medium-high batch. All generated reference art is approved for this implementation scope. Preserve unrelated files. No changes to existing Hopper/rider GLBs. Do not relabel stand-ins as final.

Author Blender Python modules in this directory. Each module exports `build(req, c)`; req is the full model request dictionary. Blender coordinates in helper calls use game coordinates (X right, Y up, Z forward); helpers map to Blender internally. Root, LOD creation, export, compression, camera renders are managed centrally. Use c.root for parenting; all geometry returned by helpers is parented automatically unless parent supplied.

API (implemented by root in common.py):
- c.box(name, pos, size, mat='base', bevel=0, parent=None)
- c.cyl(name, pos, radius, height, mat='metal', vertices=12, top_radius=None, parent=None) vertical Y axis
- c.sphere(name,pos,size,mat='base',segments=12,rings=8,parent=None) size=full xyz dimensions
- c.torus(name,pos,radius,tube,mat='metal',axis='y',parent=None) default horizontal ring
- c.beam(name,a,b,width,mat='metal',parent=None) square beam between points
- c.mesh(name,verts,faces,mat='base',parent=None) game xyz verts
- c.empty(name,pos=(0,0,0),parent=None)
- c.animate(obj,clip,frames) frames list dictionaries: {'t': seconds, 'rotation': [x,y,z] radians OR 'position':[x,y,z] game coords OR 'scale':[x,y,z]}. Named actions collected in NLA, export clips separately. Keep root motion ONLY if contract requires.
- c.socket(name,pos,parent=None)
- c.material(name,color,texture=None,emission=0) color RGB float; returns material name.
- c.landings: set list {'name': str, 'position':[x,y,z], 'size':[width,depth]} numeric stand-in landing surfaces.

Available materials: base (region painted trim), stone (painted regional terrain), metal (painted trim), dark (dark painted trim), ivory, red, gold, glass, glow (region emission), shadow, core, wood, foliage. Use custom material as needed. Material texture images use generated painted assets, not procedural noise. All helper meshes have UVs. No Python drawing to invent replacement art.

Numeric bounds and stand-in landings override drawings. Root normalizes bounds uniformly? NO: author exact dimensions yourself. Main exporter reports dimensions; root corrects errors explicitly. Broad size should closely match requests, detailed appendages may use tolerance. Keep floors at original landing heights/extent; inspect standins/src/structures.js or props.js. Triangle targets matter: use low sided geometry and texture detail. LOD1 supplied centrally via decimation, same named pivot hierarchy. Socket names authoritative.

Author visible construction details and distinctive silhouettes matching reference kits. Avoid generic primitive assemblies lacking reference features. Use 1970s painted palette and generated trim textures, restrained specular. Agent checks its Python syntax; root runs Blender and visual QA. Record per-model intended moving clips, sockets, divergences in module comments / report markdown. Do not commit; root commits complete validated batches.

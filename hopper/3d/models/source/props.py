"""Final Hopper prop and effect models, M-068 through M-082.

The geometry follows the approved prop plates: faceted, riveted 1970s machinery
with restrained luminous elements.  Gameplay volume assets use sparse ribbons or
lattice meshes rather than opaque solids, and never contain a Hopper silhouette.

Authored clips (where useful): Idle, Active, Open, Spin, Flow, Pulse, Dissolve.
Sockets are named exactly as in standins/src/props.js.
"""

import math


TAU = math.pi * 2.0


def _mat(c, name, color, emission=0):
    return c.material(name, color, emission=emission)


def _transparent_mat(c, name, color, alpha, emission=0):
    """Create a glTF BLEND material across current and older Blender APIs."""
    key = c.material(name, color, emission=emission)
    mat = c.materials[key]
    mat.diffuse_color = tuple(color[:3]) + (alpha,)
    bsdf = mat.node_tree.nodes.get('Principled BSDF') if mat.use_nodes else None
    if bsdf and bsdf.inputs.get('Alpha'):
        bsdf.inputs['Alpha'].default_value = alpha
    # Blender 4.2+ uses surface_render_method; older releases use blend_method.
    if hasattr(mat, 'surface_render_method'):
        try:
            mat.surface_render_method = 'DITHERED'
        except (TypeError, ValueError):
            mat.surface_render_method = 'BLENDED'
    elif hasattr(mat, 'blend_method'):
        mat.blend_method = 'BLEND'
    if hasattr(mat, 'use_transparency_overlap'):
        mat.use_transparency_overlap = False
    mat.use_nodes = True
    return key


def _bipyramid(c, name, pos, radius, height, mat, sides=4, parent=None):
    """A low-poly double-ended crystal with a broad equator."""
    x, y, z = pos
    verts = [(x, y + height * .5, z), (x, y - height * .5, z)]
    for i in range(sides):
        a = TAU * i / sides + math.pi / 4
        verts.append((x + math.cos(a) * radius, y, z + math.sin(a) * radius))
    faces = []
    for i in range(sides):
        j = 2 + i
        k = 2 + ((i + 1) % sides)
        faces.extend([(0, j, k), (1, k, j)])
    return c.mesh(name, verts, faces, mat=mat, parent=parent)


def _diamond(c, name, pos, size, mat, parent=None):
    """Eight-faced shard that can be rotated/animated as a single object."""
    x, y, z = pos
    sx, sy, sz = size
    verts = [
        (x, y + sy * .5, z), (x, y - sy * .5, z),
        (x + sx * .5, y, z), (x, y, z + sz * .5),
        (x - sx * .5, y, z), (x, y, z - sz * .5),
    ]
    faces = [(0, 2, 3), (0, 3, 4), (0, 4, 5), (0, 5, 2),
             (1, 3, 2), (1, 4, 3), (1, 5, 4), (1, 2, 5)]
    return c.mesh(name, verts, faces, mat=mat, parent=parent)


def _arrow(c, name, pos, width, height, depth, mat, up=True, parent=None):
    """Extruded graphic arrow on a vertical X/Y plane."""
    x, y, z = pos
    s = 1 if up else -1
    outline = [
        (-.5, -.5), (.5, -.5), (.5, .05), (.9, .05),
        (0, .5), (-.9, .05), (-.5, .05),
    ]
    front = [(x + px * width, y + py * height * s, z + depth * .5) for px, py in outline]
    back = [(vx, vy, z - depth * .5) for vx, vy, _ in front]
    verts = front + back
    faces = [tuple(range(7)), tuple(range(13, 6, -1))]
    for i in range(7):
        j = (i + 1) % 7
        faces.append((i, j, 7 + j, 7 + i))
    return c.mesh(name, verts, faces, mat=mat, parent=parent)


def _disc(c, name, center, radius, depth, mat, segments=24, parent=None):
    """A vertical low-poly disc in the X/Y plane."""
    x, y, z = center
    verts = [(x, y, z - depth * .5), (x, y, z + depth * .5)]
    for side in (-1, 1):
        zz = z + side * depth * .5
        for i in range(segments):
            a = TAU * i / segments
            verts.append((x + radius * math.cos(a), y + radius * math.sin(a), zz))
    faces = []
    for i in range(segments):
        n = (i + 1) % segments
        faces.append((0, 2 + n, 2 + i))
        faces.append((1, 2 + segments + i, 2 + segments + n))
    for i in range(segments):
        a = 2 + i
        b = 2 + (i + 1) % segments
        faces.append((a, b, b + segments, a + segments))
    return c.mesh(name, verts, faces, mat=mat, parent=parent)


def _dome(c, name, dims, mat, rings=5, segments=20, axis='y', parent=None):
    """Faceted half ellipsoid. axis='y' rises from the floor; 'z' faces forward."""
    sx, sy, sz = dims
    verts = []
    faces = []
    if axis == 'y':
        for j in range(rings + 1):
            phi = (math.pi * .5) * j / rings
            rr = math.cos(phi)
            yy = sy * math.sin(phi)
            for i in range(segments):
                a = TAU * i / segments
                verts.append((sx * rr * math.cos(a), yy, sz * rr * math.sin(a)))
    else:
        for j in range(rings + 1):
            phi = (math.pi * .5) * j / rings
            rr = math.cos(phi)
            zz = sz * math.sin(phi)
            for i in range(segments):
                a = TAU * i / segments
                verts.append((sx * rr * math.cos(a), sy * rr * math.sin(a), zz))
    for j in range(rings):
        for i in range(segments):
            n = (i + 1) % segments
            a = j * segments + i
            b = j * segments + n
            d = (j + 1) * segments + i
            e = (j + 1) * segments + n
            faces.append((a, b, e, d))
    return c.mesh(name, verts, faces, mat=mat, parent=parent)


def _arc_strip(c, name, inner, outer, y, thickness, start, sweep, mat, segments=18, parent=None):
    verts = []
    for yy in (y - thickness * .5, y + thickness * .5):
        for r in (inner, outer):
            for i in range(segments + 1):
                a = start + sweep * i / segments
                verts.append((math.cos(a) * r, yy, math.sin(a) * r))
    stride = segments + 1
    faces = []
    for i in range(segments):
        # top and bottom annular bands
        faces.append((i, i + 1, stride + i + 1, stride + i))
        o = stride * 2
        faces.append((o + i, o + stride + i, o + stride + i + 1, o + i + 1))
    # inner/outer vertical walls
    for band in range(2):
        off = band * stride
        top = stride * 2 + off
        for i in range(segments):
            faces.append((off + i, top + i, top + i + 1, off + i + 1))
    faces.extend([(0, stride, stride * 3, stride * 2),
                  (stride - 1, stride * 2 - 1, stride * 4 - 1, stride * 3 - 1)])
    return c.mesh(name, verts, faces, mat=mat, parent=parent)


def _ring_x(c, name, x, inner, outer, mat, segments=8):
    """Very low-cost energy hoop in the Y/Z plane."""
    verts = []
    for radius in (inner, outer):
        for i in range(segments):
            a = TAU * i / segments
            verts.append((x, math.cos(a) * radius, math.sin(a) * radius))
    faces = []
    for i in range(segments):
        n = (i + 1) % segments
        faces.append((i, n, segments + n, segments + i))
    return c.mesh(name, verts, faces, mat=mat)


def _ring_y(c, name, y, inner, outer, mat, segments=12, parent=None):
    """Low-cost horizontal annulus used instead of a 128-triangle torus."""
    verts = []
    for radius in (inner, outer):
        for i in range(segments):
            a = TAU * i / segments
            verts.append((math.cos(a) * radius, y, math.sin(a) * radius))
    faces = []
    for i in range(segments):
        n = (i + 1) % segments
        faces.append((i, n, segments + n, segments + i))
    return c.mesh(name, verts, faces, mat=mat, parent=parent)


def _ring_z(c, name, z, inner, outer, mat, segments=12):
    """Low-cost annulus in the X/Y plane for front-facing effects."""
    verts = []
    for radius in (inner, outer):
        for i in range(segments):
            a = TAU * i / segments
            verts.append((math.cos(a) * radius, math.sin(a) * radius, z))
    faces = []
    for i in range(segments):
        n = (i + 1) % segments
        faces.append((i, n, segments + n, segments + i))
    return c.mesh(name, verts, faces, mat=mat)


def _spring_pad(req, c):
    cyan = _mat(c, 'prop_cyan', (0.03, .42, .46), .22)
    trace = _mat(c, 'prop_trace', (.18, .78, .8), .5)
    region = req.get('region') or 'city'
    lens = c.material('prop_lens', (.035, .19, .2),
                      texture='hopper/3d/textures/trim/%s.png' % region,
                      emission=.06)
    orange = _mat(c, 'prop_orange', (.95, .38, .035))
    pale = _mat(c, 'prop_pale', (.92, .84, .64))
    c.cyl('Base.Foundation', (0, .45, 0), 5.5, .9, 'dark', vertices=12)
    c.cyl('Base.Rim', (0, 1.05, 0), 4.95, .55, 'metal', vertices=16)
    # Alternating armor shoes preserve the plate's starburst silhouette.
    for i in range(8):
        a = TAU * i / 8
        x, z = math.cos(a) * 4.55, math.sin(a) * 4.55
        c.box('Armor.%02d' % i, (x, .72, z), (1.65, 1.15, 1.25), pale if i % 2 == 0 else 'metal')
        c.box('Stripe.%02d' % i, (x, .92, z), (.52, .75, 1.29), orange)
        if i % 2 == 0:
            c.cyl('Bolt.%02d' % i, (x, 1.47, z), .12, .08, 'gold', vertices=8)
    for i in range(4):
        a = TAU * i / 4 + math.pi / 4
        c.cyl('Spring.%02d' % i, (math.cos(a) * 3.35, 1.6, math.sin(a) * 3.35), .36, 1.15, cyan, vertices=8)
    plate_pivot = c.empty('Plate.Pivot')
    # The active surface is a layered mechanism, not a luminous puck.  Its dark
    # underside leaves the four springs and central plunger legible in profile.
    c.cyl('Plate.Plunger', (0, 1.72, 0), 1.0, 1.45, 'metal', vertices=10, parent=plate_pivot)
    c.cyl('Plate.Underside', (0, 2.38, 0), 4.5, .36, 'dark', vertices=20, parent=plate_pivot)
    c.cyl('Plate.MechanicalRim', (0, 2.54, 0), 4.42, .28, 'metal', vertices=16, parent=plate_pivot)
    c.cyl('Plate.EnergyLens', (0, 2.77, 0), 3.82, .28, lens, vertices=24, parent=plate_pivot)
    _ring_y(c, 'Plate.LuminousRim', 2.925, 3.61, 3.74, trace,
            segments=12, parent=plate_pivot)
    # Four recessed traces break up the lens while keeping most of it dark.
    for i in range(4):
        a = TAU * i / 4 + math.pi / 4
        c.beam('Plate.Trace.%02d' % i,
               (math.cos(a) * .8, 2.925, math.sin(a) * .8),
               (math.cos(a) * 3.1, 2.925, math.sin(a) * 3.1),
               .055, trace, parent=plate_pivot)
    for i in range(4):
        a = TAU * i / 4
        _arrow(c, 'Chevron.%02d' % i, (math.cos(a)*3.9, 1.2, math.sin(a)*3.9), .45, .7, .08, 'gold', parent=None)
    c.socket('Launch', (0, 2, 0))
    c.animate(plate_pivot, 'Idle', [{'t': 0, 'position': [0, 0, 0]}, {'t': .8, 'position': [0, .1, 0]}, {'t': 1.6, 'position': [0, 0, 0]}])
    c.animate(plate_pivot, 'Active', [{'t': 0, 'position': [0, 0, 0]}, {'t': .16, 'position': [0, -.53, 0]}, {'t': .3, 'position': [0, 0, 0]}])


def _signal(req, c):
    amber = _mat(c, 'signal_gold', (1.0, .52, .03), 1.0)
    white = _mat(c, 'signal_white', (1.0, .9, .48), 1.5)
    c.cyl('Signal.Base', (0, .25, 0), 1.5, .5, 'dark', vertices=10)
    c.torus('Signal.BaseGlow', (0, .52, 0), 1.05, .08, amber)
    c.cyl('Signal.Hub', (0, .63, 0), .55, .25, 'gold', vertices=10)
    spin_pivot = c.empty('Signal.SpinPivot')
    _bipyramid(c, 'Crystal.L', (-.56, 2.75, 0), .54, 3.55, amber, parent=spin_pivot)
    _bipyramid(c, 'Crystal.R', (.56, 2.75, 0), .54, 3.55, amber, parent=spin_pivot)
    c.torus('Halo', (0, 2.55, 0), 1.35, .15, white, parent=spin_pivot)
    c.socket('Pickup', (0, 1.8, 0))
    c.animate(spin_pivot, 'Spin', [{'t': 0, 'rotation': [0, 0, 0]}, {'t': 1.5, 'rotation': [0, TAU, 0]}])


def _signal_cage(req, c):
    cyan = _mat(c, 'cage_cyan', (.02, .58, .66), .55)
    violet = _mat(c, 'cage_violet', (.38, .045, .63), .55)
    c.cyl('Cage.Pedestal', (0, .55, 0), 7, 1.1, 'dark', vertices=10)
    c.cyl('Cage.Deck', (0, 1.18, 0), 5.9, .42, 'metal', vertices=16)
    c.torus('Cage.BaseRail', (0, 1.42, 0), 5.55, .28, cyan)
    bars = []
    for i in range(10):
        a = TAU * i / 10
        x, z = math.cos(a) * 5.5, math.sin(a) * 5.5
        bar = c.cyl('EnergyBar.%02d' % i, (x, 5.38, z), .15, 7.75, cyan, vertices=6)
        bars.append((bar, x, z))
        c.cyl('BarSocket.%02d' % i, (x, 1.62, z), .33, .38, 'metal', vertices=8)
    c.torus('Cage.CrownRail', (0, 9.25, 0), 5.55, .35, 'metal')
    for i in range(5):
        a = TAU * i / 5
        c.sphere('CrownNode.%02d' % i, (math.cos(a)*5.55, 9.25, math.sin(a)*5.55), (.75,.75,.75), cyan, segments=8, rings=5)
    crown = _bipyramid(c, 'Lock.CrownPivot', (0, 9.36, 0), 1.05, 1.28, violet, sides=5)
    c.socket('Prize', (0, 3, 0))
    c.socket('Lock', (0, 9.2, 0))
    for bar, x, z in bars:
        c.animate(bar, 'Open', [{'t': 0, 'position': [x,5.38,z], 'scale': [1,1,1]}, {'t': .24, 'position': [x,5.38,z], 'scale': [1,.08,1]}, {'t': .5, 'position': [x,1.75,z], 'scale': [1,.08,1]}])
    c.animate(crown, 'Open', [{'t': 0, 'rotation': [0,0,0], 'scale': [1,1,1]}, {'t': .18, 'rotation': [0,.5,0], 'scale': [1.2,1.2,1.2]}, {'t': .45, 'rotation': [0,1.1,0], 'scale': [.05,.05,.05]}])


def _lockdown_emitter(req, c):
    violet = _mat(c, 'lockdown_violet', (.31, .025, .56), .62)
    # Broad clawed feet and tapered slab body mirror the plate silhouette.
    c.cyl('Emitter.Base', (0, .5, 0), 4.15, 1.0, 'dark', vertices=8)
    for i in range(4):
        a = TAU * i / 4
        x, z = math.cos(a) * 3.75, math.sin(a) * 3.75
        c.box('Emitter.Foot.%02d' % i, (x, .7, z), (2.5, 1.4, 2.5), 'metal', bevel=.16)
        c.box('Emitter.FootGlow.%02d' % i, (math.cos(a)*4.45, 1.0, math.sin(a)*4.45), (.65,.3,.65), violet)
    c.cyl('Emitter.Pylon', (0, 7.2, 0), 3.15, 12.6, 'dark', vertices=6, top_radius=1.75)
    for x in (-1.45, 1.45):
        c.beam('Emitter.GoldSpine' + ('.L' if x < 0 else '.R'), (x, 2.0, 0), (x*.62, 14.7, 0), .32, 'gold')
        c.beam('Emitter.Prong' + ('.L' if x < 0 else '.R'), (x*.62, 14.0, 0), (x*1.25, 17.2, 0), .6, 'metal')
    c.cyl('Emitter.Channel', (0, 8.5, 1.65), .32, 10.5, violet, vertices=8)
    orb = c.sphere('Emitter.OrbPivot', (0, 16.45, 0), (3.1,3.1,3.1), violet, segments=12, rings=8)
    c.torus('Emitter.OrbBand', (0, 16.45, 0), 1.62, .12, 'gold', axis='y')
    c.socket('FieldAnchor', (0, 15.5, 0))
    c.animate(orb, 'Active', [{'t':0,'scale':[.88,.88,.88]}, {'t':.5,'scale':[1,1,1]}, {'t':1,'scale':[.88,.88,.88]}])


def _lockdown_dome(req, c):
    violet = _transparent_mat(c, 'field_violet', (.34, .08, .62), .14, .32)
    seam = _mat(c, 'field_seam', (.63, .27, .92), .9)
    # Two nested faceted shells give readable cells without turning the field solid.
    shell = _dome(c, 'Field.Pivot', (260,260,260), violet, rings=5, segments=20, axis='y')
    for i in range(8):
        a = TAU * i / 8
        x, z = math.cos(a)*258.8, math.sin(a)*258.8
        c.box('Field.Anchor.%02d' % i, (x, .85, z), (2.4,1.7,2.4), 'dark')
        c.sphere('Field.AnchorGlow.%02d' % i, (x, 1.45, z), (1.05,1.05,1.05), seam, segments=6, rings=4)
    c.torus('Field.GroundSeam', (0, .12, 0), 258.2, .12, seam, axis='y')
    # Opaque seam rings retain the field silhouette while its shell stays clear.
    for i, phi in enumerate((math.radians(28), math.radians(53))):
        radius = math.cos(phi) * 260
        _ring_y(c, 'Field.Latitude.%02d' % i, math.sin(phi) * 260,
                radius - .3, radius + .3, seam, segments=16)
    c.animate(shell, 'Active', [{'t':0,'scale':[1,.985,1]}, {'t':1,'scale':[1,1,1]}, {'t':2,'scale':[1,.985,1]}])
    c.animate(shell, 'Open', [{'t':0,'scale':[1,1,1]}, {'t':.7,'scale':[1,.03,1]}])


def _checkpoint(req, c):
    red = _mat(c, 'checkpoint_red', (.72, .08, .035))
    amber = _mat(c, 'checkpoint_amber', (.9, .38, .045), .65)
    c.cyl('Checkpoint.Base', (0,.35,0), 1.5, .7, 'metal', vertices=8)
    for i in range(4):
        a = TAU*i/4 + math.pi/4
        c.box('Checkpoint.Foot.%02d' % i, (math.cos(a)*1.05,.42,math.sin(a)*1.05), (1.0,.8,1.0), 'ivory', bevel=.12)
    c.cyl('Checkpoint.Post', (0,6.9,0), 1.02, 12.4, 'ivory', vertices=12)
    for y in (3.2, 8.7, 12.35):
        c.cyl('Checkpoint.RedBand.%s' % str(y).replace('.','_'), (0,y,0), 1.18, .72, red, vertices=12)
    for i in range(3):
        a=TAU*i/3
        c.cyl('Checkpoint.Port.%02d'%i,(math.cos(a)*1.03,7.0,math.sin(a)*1.03),.24,.18,'gold',vertices=8)
    c.cyl('Lamp.Base', (0,13.1,0), 1.12, .5, 'gold', vertices=10)
    lamp = c.sphere('Lamp.Pivot', (0,14.0,0), (1.8,2.0,1.8), amber, segments=10, rings=6)
    for i in range(6):
        a=TAU*i/6
        c.beam('Lamp.Cage.%02d'%i,(math.cos(a)*.91,13.2,math.sin(a)*.91),(math.cos(a)*.65,14.75,math.sin(a)*.65),.12,'gold')
    c.torus('Lamp.Crown', (0,14.78,0), .65, .1, 'gold')
    c.socket('Respawn', (0,0,6))
    c.animate(lamp,'Idle',[{'t':0,'scale':[.8,.8,.8]},{'t':1,'scale':[.86,.86,.86]},{'t':2,'scale':[.8,.8,.8]}])
    c.animate(lamp,'Active',[{'t':0,'scale':[.8,.8,.8]},{'t':.2,'scale':[1,1,1]},{'t':.5,'scale':[.92,.92,.92]}])


def _recovery(req, c):
    cream = _mat(c, 'capsule_cream', (.88,.79,.59))
    red = _mat(c, 'capsule_red', (.75,.08,.035))
    white = _mat(c, 'capsule_cross', (1,1,.88), .45)
    pivot = c.empty('Capsule.Pivot')
    c.sphere('Capsule.Shell', (0,2.0,0), (2,4,2), cream, segments=12, rings=8, parent=pivot)
    c.cyl('Capsule.Band', (0,2.0,0), 1.0, .72, red, vertices=12, parent=pivot)
    c.cyl('Capsule.CapTop', (0,3.92,0), .3, .16, 'gold', vertices=8, parent=pivot)
    c.cyl('Capsule.CapBottom', (0,.08,0), .3, .16, 'dark', vertices=8, parent=pivot)
    c.box('Capsule.Cross.H', (0,2.0,.97), (.72,.23,.06), white, bevel=.03, parent=pivot)
    c.box('Capsule.Cross.V', (0,2.0,.97), (.23,.72,.06), white, bevel=.03, parent=pivot)
    for i in range(4):
        a=TAU*i/4+math.pi/4
        c.sphere('Capsule.Fastener.%02d'%i,(math.cos(a)*.8,2.65,math.sin(a)*.8),(.14,.14,.14),'metal',segments=6,rings=4,parent=pivot)
    c.socket('Pickup',(0,2,0))
    c.animate(pivot,'Spin',[{'t':0,'rotation':[0,0,0]},{'t':2,'rotation':[0,TAU,0]}])


def _thermal_vent(req, c):
    ember = _mat(c, 'thermal_ember', (.82,.19,.025), .35)
    heat = _mat(c, 'thermal_heat', (.9,.42,.08), .2)
    c.cyl('Vent.Foundation',(0,.65,0),10,1.3,'dark',vertices=12)
    c.cyl('Vent.Rim',(0,1.35,0),8.8,.7,'metal',vertices=16)
    # Recessed grate with cross-braces.
    for i in range(-4,5):
        c.beam('Vent.Grate.X.%02d'%(i+4),(-7.4,1.78,i*1.65),(7.4,1.78,i*1.65),.18,'metal')
        c.beam('Vent.Grate.Z.%02d'%(i+4),(i*1.65,1.78,-7.4),(i*1.65,1.78,7.4),.18,'metal')
    for i in range(4):
        a=TAU*i/4+math.pi/4
        c.box('Vent.Baffle.%02d'%i,(math.cos(a)*8.2,1.2,math.sin(a)*8.2),(3.1,2.0,2.2),'base',bevel=.15)
        c.box('Vent.BaffleRed.%02d'%i,(math.cos(a)*8.35,1.55,math.sin(a)*8.35),(1.6,1.0,2.24),ember,bevel=.05)
    # Four twisting sparse ribbons imply the 160 m updraft, keeping exact top at 162.
    ribbons=[]
    for strand in range(4):
        verts=[]
        faces=[]
        for j in range(13):
            y=2 + 160*j/12
            a=strand*math.pi/2+j*.52
            r=5.0+1.2*math.sin(j*.8+strand)
            x,z=math.cos(a)*r,math.sin(a)*r
            verts.extend([(x-.42,y,z),(x+.42,y,z)])
            if j:
                k=(j-1)*2
                faces.append((k,k+1,k+3,k+2))
        ribbons.append(c.mesh('Thermal.Ribbon.%02d'%strand,verts,faces,heat))
    c.socket('LiftBase',(0,2,0)); c.socket('LiftTop',(0,160,0))
    for ribbon in ribbons:
        c.animate(ribbon,'Flow',[{'t':0,'scale':[.92,1,.92]},{'t':.8,'scale':[1,1,1]},{'t':1.6,'scale':[.92,1,.92]}])


def _wind_lane(req, c):
    wind = _mat(c,'wind_cyan',(.18,.6,.67),.18)
    edge = _mat(c,'wind_white',(.62,.88,.87),.3)
    # End machinery spans the exact 202 m X envelope.
    for side in (-1,1):
        x=side*99.5
        c.box('Wind.Pylon.%s'%('L' if side<0 else 'R'),(x,0,0),(3,20,4),'base',bevel=.25)
        c.box('Wind.Foot.%s'%('L' if side<0 else 'R'),(x,-9.4,0),(3,1.2,6),'metal',bevel=.12)
        c.cyl('Wind.Nozzle.%s'%('L' if side<0 else 'R'),(x,0,0),2.2,.75,'gold',vertices=6)
        c.sphere('Wind.Core.%s'%('L' if side<0 else 'R'),(x,0,0),(1.4,1.4,1.4),wind,segments=6,rings=4)
        _ring_x(c,'Wind.FieldHoop.%s'%('L' if side<0 else 'R'),side*100.4,19.35,20,edge)
    ribbons=[]
    for strand in range(5):
        verts=[]; faces=[]
        for j in range(18):
            x=-101+202*j/17
            y=(strand-2)*7.4 + math.sin(j*.75+strand)*1.5
            z=math.sin(j*.55+strand*1.7)*18.5
            verts.extend([(x,y-.36,z),(x,y+.36,z)])
            if j:
                k=(j-1)*2; faces.append((k,k+1,k+3,k+2))
        ribbons.append(c.mesh('Wind.Stream.%02d'%strand,verts,faces,wind if strand%2 else edge))
    c.socket('FlowStart',(-100,0,0)); c.socket('FlowEnd',(100,0,0))
    for ribbon in ribbons:
        c.animate(ribbon,'Flow',[{'t':0,'scale':[.96,1,1]},{'t':.5,'scale':[1,1,1]},{'t':1,'scale':[.96,1,1]}])


def _gravity_gate(req, c):
    violet = _transparent_mat(c,'gravity_violet',(.29,.035,.5),.20,.24)
    bright = _mat(c,'gravity_arrow',(.64,.2,.83),.58)
    gold = _mat(c,'gravity_gold',(.69,.42,.12))
    # Faceted pylons and lintel fit X +/-31, Y 0..40, Z +/-2.5.
    c.box('Gate.Sill',(0,1.25,0),(62,2.5,5),'dark',bevel=.2)
    c.box('Gate.Lintel',(0,38.5,0),(62,3,5),'dark',bevel=.2)
    for side in (-1,1):
        x=side*28.5
        c.box('Gate.Pylon.%s'%('L' if side<0 else 'R'),(x,19,0),(5,35.5,5),'dark',bevel=.35)
        c.box('Gate.GoldRail.%s'%('L' if side<0 else 'R'),(x-side*1.6,20,2.35),(.65,29,.3),gold,bevel=.06)
        c.cyl('Gate.SideHub.%s'%('L' if side<0 else 'R'),(x,22,0),1.7,1.1,'gold',vertices=10)
    c.torus('Gate.CrownHub',(0,38.2,2.3),2.1,.42,'gold',axis='z')
    # Layered curtain slats echo the fabric-like energy sheet in the plate.
    for i in range(13):
        x=-24+4*i
        c.box('Gate.Curtain.%02d'%i,(x,20,0),(3.5,34,.22),violet,bevel=.08)
    arrows=[]
    for i in range(5):
        obj=_arrow(c,'Gate.Arrow.%02d'%i,(-16+8*i,20,1.45),2.0,5.8,.18,bright,up=(i%2==0))
        arrows.append((obj,i))
    c.socket('FlipPlane',(0,20,0))
    for obj,i in arrows:
        y0=18 if i%2==0 else 22
        y1=24 if i%2==0 else 16
        c.animate(obj,'Active',[{'t':0,'position':[-16+8*i,y0,1.45]},{'t':.8,'position':[-16+8*i,y1,1.45]},{'t':1.6,'position':[-16+8*i,y0,1.45]}])


def _launch_gate(req, c):
    rust = _mat(c,'launch_rust',(.63,.16,.055))
    blue = _mat(c,'launch_blue',(.04,.32,.67),.4)
    star = _mat(c,'launch_star',(.31,.1,.61),.3)
    # Ring outer radius 101.5 and 16 m tube gives exact 203 x 203 x 16.
    c.torus('Launch.MainRing',(0,101.5,0),93.5,8,rust,axis='z')
    c.torus('Launch.InnerRail',(0,101.5,0),84.0,1.5,'metal',axis='z')
    for i in range(12):
        a=TAU*i/12
        x=math.cos(a)*94.0; y=101.5+math.sin(a)*94.0
        c.box('Launch.Clamp.%02d'%i,(x,y,0),(6.2,8.5,16),'metal',bevel=.45)
        c.box('Launch.ClampGold.%02d'%i,(x,y,7.65),(3.8,3.0,.7),'gold',bevel=.1)
    # Four double-jointed struts remain inside the ring envelope.
    for side in (-1,1):
        for offset in (-56,56):
            x=offset
            c.beam('Launch.StrutUpper.%s.%s'%('L' if side<0 else 'R',str(offset)),(x,5,side*3),(x*1.22,55,side*3),4.0,'metal')
            c.box('Launch.Foot.%s.%s'%('L' if side<0 else 'R',str(offset)),(x,3.2,side*3),(16,6.4,10),'gold',bevel=.35)
    portal=_disc(c,'Launch.PortalPivot',(0,101.5,0),82.2,.35,star,segments=32)
    c.torus('Launch.PortalEdge',(0,101.5,0),82.2,.7,blue,axis='z')
    # Sparse radial star spokes avoid a flat unmodulated disc silhouette.
    for i in range(10):
        a=TAU*i/10
        c.beam('Launch.StarSpoke.%02d'%i,(0,101.5,1),(math.cos(a)*62,101.5+math.sin(a)*62,1),.5,blue)
    c.socket('Entry',(0,99,10))
    c.animate(portal,'Active',[{'t':0,'rotation':[0,0,0]},{'t':2.5,'rotation':[0,0,TAU]}])


def _laser_bolt(req, c):
    red=_mat(c,'laser_red',(1,.02,.01),1.0)
    white=_mat(c,'laser_white',(1,.9,.75),1.8)
    # Hexagonal capsule aligned to forward Z; bounds exactly .6 x .6 x 6.
    sides=8
    verts=[]
    for z,r in ((-3,0),(-2.72,.3),(2.72,.3),(3,0)):
        for i in range(sides):
            a=TAU*i/sides; verts.append((math.cos(a)*r,math.sin(a)*r,z))
    faces=[]
    for ring in range(3):
        for i in range(sides):
            n=(i+1)%sides
            faces.append((ring*sides+i,ring*sides+n,(ring+1)*sides+n,(ring+1)*sides+i))
    bolt=c.mesh('Laser.Bolt',verts,faces,red)
    c.beam('Laser.Core',(0,0,-2.7),(0,0,2.7),.12,white)
    c.animate(bolt,'Pulse',[{'t':0,'scale':[.82,.82,1]},{'t':.12,'scale':[1,1,1]},{'t':.24,'scale':[.82,.82,1]}])


def _kick_arc(req, c):
    gold=_mat(c,'kick_gold',(.9,.4,.025),.55)
    pale=_mat(c,'kick_pale',(1,.78,.25),.8)
    # Two tapered-looking concentric strokes span the requested 20 m diameter.
    arc=_arc_strip(c,'KickArc.Main',7.8,10,0,1.0,-math.pi*.5,math.pi*1.5,gold,segments=12)
    _arc_strip(c,'KickArc.Highlight',8.9,9.35,.36,.2,-math.pi*.42,math.pi*1.28,pale,segments=10)
    c.animate(arc,'Active',[{'t':0,'scale':[.2,.2,.2]},{'t':.12,'scale':[1,1,1]},{'t':.32,'scale':[.05,.05,.05]}])


def _shield(req, c):
    teal=_transparent_mat(c,'shield_teal',(.06,.55,.55),.18,.2)
    white=_mat(c,'shield_white',(.62,.9,.88),.5)
    shell=_dome(c,'Shield.Pivot',(9,9,9),teal,rings=4,segments=16,axis='z')
    # Front-facing white base rim in X/Y plane.
    c.torus('Shield.Rim',(0,0,.12),8.75,.25,white,axis='z')
    for i, depth in enumerate((4.5, 7.0)):
        radius = math.sqrt(81 - depth * depth)
        _ring_z(c, 'Shield.Seam.%02d' % i, depth, radius-.09,
                radius+.09, white, segments=12)
    for i in range(8):
        a=TAU*i/8
        c.sphere('Shield.Node.%02d'%i,(math.cos(a)*8.75,math.sin(a)*8.75,.2),(.42,.42,.42),white,segments=5,rings=3)
    c.socket('Anchor',(0,0,-1.8))
    c.animate(shell,'Active',[{'t':0,'scale':[.92,.92,.92]},{'t':.35,'scale':[1,1,1]},{'t':.7,'scale':[.92,.92,.92]}])


def _dissolve(req, c):
    violet=_mat(c,'dissolve_violet',(.3,.02,.48),.48)
    charcoal=_mat(c,'dissolve_charcoal',(.035,.025,.05))
    flash=_mat(c,'dissolve_flash',(.94,.7,.6),.9)
    shards=[]
    # Deterministic 14-shard burst. Tips stay within +/-6 on every axis.
    points=[
        (-5.675,1.2,-1.0),(5.55,1.8,.6),(-3.8,4.7,1.5),(3.2,4.775,-1.4),
        (-1.1,-5.3,2.2),(1.7,-4.8,-2.8),(-4.5,-2.5,3.2),(4.4,-2.0,3.5),
        (-2.4,.4,-5.725),(2.8,2.2,-4.7),(-5.0,3.2,-3.0),(5.0,3.8,2.8),
        (-.8,5.0,4.2),(1.0,-3.5,5.6),
    ]
    for i,p in enumerate(points):
        sx=.65+(i%3)*.25; sy=1.4+(i%4)*.35; sz=.55+(i%2)*.3
        obj=_diamond(c,'Dissolve.Shard.%02d'%i,p,(sx,sy,sz),violet if i%2 else charcoal)
        shards.append((obj,p))
    core=c.sphere('Dissolve.Core',(0,0,0),(2.2,2.2,2.2),flash,segments=10,rings=6)
    for obj,p in shards:
        c.animate(obj,'Dissolve',[{'t':0,'position':[p[0]*.15,p[1]*.15,p[2]*.15],'scale':[.15,.15,.15]}, {'t':.5,'position':list(p),'scale':[1,1,1]}])
    c.animate(core,'Dissolve',[{'t':0,'scale':[.1,.1,.1]},{'t':.18,'scale':[1,1,1]},{'t':.5,'scale':[.05,.05,.05]}])


BUILDERS = {
    'prop.springPad': _spring_pad,
    'prop.signalBeacon': _signal,
    'prop.signalCage': _signal_cage,
    'prop.lockdownEmitter': _lockdown_emitter,
    'prop.lockdownDome': _lockdown_dome,
    'prop.checkpointTotem': _checkpoint,
    'prop.recoveryCapsule': _recovery,
    'prop.thermalVent': _thermal_vent,
    'prop.windLane': _wind_lane,
    'prop.gravityGate': _gravity_gate,
    'prop.launchGate': _launch_gate,
    'prop.laserBolt': _laser_bolt,
    'prop.kickArc': _kick_arc,
    'prop.shieldDome': _shield,
    'prop.dissolveBurst': _dissolve,
}


def build(req, c):
    """Build one prop selected by the authoritative request standIn id."""
    stand_in = req['standIn']
    try:
        builder = BUILDERS[stand_in]
    except KeyError as exc:
        raise ValueError('props.py cannot build %s' % stand_in) from exc
    builder(req, c)

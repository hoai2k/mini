"""Production structure builders for City, Foundry, Harbor, and Launchworks.

Primary surfaces use the region-aware trim-backed materials supplied by common.py.
Landings and named gameplay sockets reproduce standins/src/structures.js exactly.
Rigid clips are intentionally restrained, readable transforms around named pivots.
"""

import math
from pathlib import Path

TEXTURES = Path(__file__).resolve().parents[4] / "hopper/3d/textures"


TAU = math.pi * 2.0


def _landings(c, entries):
    c.landings = []
    for i, (name, position, size) in enumerate(entries):
        c.landings.append({'name': name, 'position': list(position), 'size': list(size)})
        c.socket(f'Landing.{i}', position)


def _rail(c, prefix, a, b, y, z, parent=None, posts=5, mat='gold'):
    c.beam(f'{prefix}.Top', (a, y + 1.2, z), (b, y + 1.2, z), 0.22, mat, parent)
    for i in range(posts + 1):
        x = a + (b - a) * i / posts
        c.beam(f'{prefix}.Post.{i}', (x, y, z), (x, y + 1.2, z), 0.18, mat, parent)


def _frame_x(c, prefix, xs, y0, y1, z, parent=None, mat='metal'):
    for i, x in enumerate(xs):
        c.beam(f'{prefix}.Upright.{i}', (x, y0, z), (x, y1, z), 0.65, mat, parent)
    for i in range(len(xs) - 1):
        x0, x1 = xs[i], xs[i + 1]
        c.beam(f'{prefix}.BraceA.{i}', (x0, y0, z), (x1, y1, z), 0.35, mat, parent)
        c.beam(f'{prefix}.BraceB.{i}', (x0, y1, z), (x1, y0, z), 0.35, mat, parent)


def _ring_wall(c, name, radius, y0, y1, segments, mat):
    verts = []
    for y in (y0, y1):
        for i in range(segments):
            a = TAU * i / segments
            verts.append((math.cos(a) * radius, y, math.sin(a) * radius))
    faces = []
    for i in range(segments):
        j = (i + 1) % segments
        faces.append((i, j, segments + j, segments + i))
    return c.mesh(name, verts, faces, mat)


def _paint(c, name, region, color=(1, 1, 1), band=(.165, .085)):
    c.material(name, color, TEXTURES / 'trim' / (region + '.png'))
    c.bands[name] = band
    return name


def _annulus(c, name, r0, r1, y, height, mat, segments=24):
    verts = [(math.cos(TAU*i/segments)*r, yy, math.sin(TAU*i/segments)*r)
             for yy in (y-height, y) for r in (r0, r1) for i in range(segments)]
    faces = []
    n = segments
    for i in range(n):
        j = (i+1) % n
        faces += [(i,j,n+j,n+i), (2*n+i,3*n+i,3*n+j,2*n+j),
                  (i,2*n+i,2*n+j,j), (n+i,n+j,3*n+j,3*n+i)]
    return c.mesh(name, verts, [tuple(reversed(face)) for face in faces], mat)


def _circular_rail(c, name, radius, y, mat='gold', segments=16):
    for i in range(segments):
        a, b = TAU*i/segments, TAU*(i+1)/segments
        x,z = math.cos(a)*radius, math.sin(a)*radius
        c.beam(f'{name}.Post.{i}', (x,y,z), (x,y+1.3,z), .18, mat)
        c.beam(f'{name}.Rail.{i}', (x,y+1.3,z),
               (math.cos(b)*radius,y+1.3,math.sin(b)*radius), .18, mat)


def _facade_bay(c, name, angle, radius, y, width, height):
    # Local +Z faces outward; Blender Z rotation rotates in the game X/Z plane.
    bay = c.empty(name, (math.sin(angle)*radius,y,math.cos(angle)*radius))
    bay.rotation_euler.z = angle
    c.box(name+'.Glass', (0,0,0), (width,height,.16), 'glass', 0, bay)
    for x in (-width/2-.25,width/2+.25):
        c.box(name+f'.Jamb.{x}', (x,0,.06), (.4,height+.8,.35), 'ivory', 0, bay)
    c.box(name+'.Mullion', (0,0,.1), (.15,height,.2), 'gold', 0, bay)
    c.box(name+'.Transom', (0,height*.15,.1), (width,.16,.2), 'gold', 0, bay)
    # A small faceted arch crown sits over the tall rectangular glazing.
    points=[(-width/2,height/2,0),(0,height/2+width*.42,0),(width/2,height/2,0)]
    c.mesh(name+'.ArchGlass', points, [(0,2,1)], 'glass', bay)
    for i in range(2):
        c.beam(name+f'.ArchTrim.{i}', points[i], points[i+1], .38, 'ivory', bay)


def _city_ivory_tower(c):
    widths = [31, 29, 26, 22, 18]
    for i, w in enumerate(widths):
        y0 = i * 24.0
        c.box(f'Tier.{i}.Ivory', (0, y0 + 8.4, 0), (w, 16.8, w), 'base', 0.45)
        c.box(f'Tier.{i}.Glass', (0, y0 + 20.4, 0), (w - 1.2, 7.2, w - 1.2), 'glass', 0.2)
        c.box(f'Tier.{i}.Ledge', (0, y0 + 16.45, 0), (w + 0.2, 0.7, w + 0.2), 'ivory', 0.15)
        # The reference's identity comes from tall teal bays cutting through the
        # ivory masses, with heavy stepped ribs at every corner.  Segmenting the
        # bays per setback keeps them seated on the facade instead of floating.
        for side in (-1, 1):
            face = side * (w / 2 + .035)
            c.box(f'Tier.{i}.BayFront.{side}', (0, y0 + 8.6, face),
                  (5.4, 13.6, .14), 'glass', 0)
            c.box(f'Tier.{i}.BaySide.{side}', (face, y0 + 8.6, 0),
                  (.14, 13.6, 5.4), 'glass', 0)
            for edge in (-3.2, 3.2):
                c.box(f'Tier.{i}.BayFrontRib.{side}.{edge}', (edge, y0 + 8.6, face + side*.05),
                      (.38, 15.1, .18), 'ivory', 0)
                c.box(f'Tier.{i}.BaySideRib.{side}.{edge}', (face + side*.05, y0 + 8.6, edge),
                      (.18, 15.1, .38), 'ivory', 0)
        for xi, x in enumerate((-w/2 + .75, w/2 - .75)):
            for zi, z in enumerate((-w/2 + .75, w/2 - .75)):
                c.box(f'Tier.{i}.CornerRib.{xi}.{zi}', (x, y0 + 8.5, z),
                      (1.5, 17, 1.5), 'ivory', .08)
                c.box(f'Tier.{i}.CornerCap.{xi}.{zi}', (x, y0 + 16.3, z),
                      (2.1, 1.2, 2.1), 'gold', .06)
        # Slim mullions break up the glass bands and continue the vertical rhythm.
        for j, x in enumerate((-w*.28, 0, w*.28)):
            c.box(f'Tier.{i}.GlassMullionFront.{j}', (x, y0 + 20.4, w/2 - .55),
                  (.28, 6.5, .22), 'gold', 0)
            c.box(f'Tier.{i}.GlassMullionBack.{j}', (x, y0 + 20.4, -w/2 + .55),
                  (.28, 6.5, .22), 'gold', 0)
    # Flanking lower turrets turn the wedding-cake mass into the skyline kit's
    # clustered Deco tower silhouette without changing the published footprint.
    for side in (-1, 1):
        c.cyl(f'LowerTurret.{side}', (side*12.7, 12.5, 0), 2.3, 25,
              'base', 8, top_radius=1.9)
        c.torus(f'LowerTurret.{side}.Crown', (side*12.7, 25, 0), 1.85, .3, 'gold')
        c.cyl(f'LowerTurret.{side}.Finial', (side*12.7, 27.5, 0), .24, 5,
              'dark', 6, top_radius=.08)
    c.box('RoofDeck', (0, 121, 0), (13, 2, 13), 'ivory', 0.25)
    c.cyl('CrownDrum', (0, 124.5, 0), 4.5, 5, 'base', 12, top_radius=3.8)
    for i in range(8):
        a = TAU*i/8
        c.box(f'CrownWindow.{i}', (math.cos(a)*3.85, 125, math.sin(a)*3.85),
              (.7 if i%2 else 1.2, 2.3, 1.2 if i%2 else .7), 'glass', 0)
    c.torus('CrownCornice', (0, 127, 0), 3.7, .45, 'gold')
    c.cyl('CrownCupola', (0, 129, 0), 2.8, 4, 'glass', 10, top_radius=1.3)
    c.cyl('CrownMast', (0, 132, 0), .35, 2, 'dark', 8, top_radius=.1)
    for i, (x, z) in enumerate(((-4.8,-4.8), (4.8,-4.8), (-4.8,4.8), (4.8,4.8))):
        c.cyl(f'RoofAntenna.{i}', (x, 124.2, z), .16, 4.4, 'gold', 6, top_radius=.06)
    _landings(c, [
        ('roof', (0, 122, 0), (12.6, 12.6)),
        ('ledge0', (0, 16.8, 0), (30, 29.4)),
    ])


def _city_roof_deck(c):
    c.box('MainBlock', (0, 20, 0), (40, 40, 26), 'base', 0.55)
    c.box('RoofSlab', (0, 40.6, 0), (40, 1.2, 26), 'ivory', 0.18)
    for s in (-1, 1):
        c.box(f'CornerPilaster.X.{s}', (s * 21.2, 18, 0), (1.6, 36, 24), 'ivory', 0.2)
        c.box(f'WindowBand.{s}', (0, 15 + 12 * (s + 1) / 2, s * 13.1), (34, 5.5, 0.5), 'glass', 0.08)
        c.box(f'SideCornice.{s}', (0, 35, s * 13.75), (38, 1, .5), 'ivory', .08)
    for i, x in enumerate((-12, 0, 12)):
        c.box(f'RoofVent.{i}', (x, 42.3, 7), (4.2, 3.4, 4.2), 'dark', 0.35)
        c.cyl(f'RoofVent.{i}.Cap', (x, 44, 7), 2.0, 0.2, 'metal', 10)
    _landings(c, [('roof', (0, 41.2, 0), (40, 26))])


def _city_rail_span(c):
    c.box('Deck', (0,30,0), (160,2.4,10), 'base', .16)
    for x in (-81.5,81.5):
        c.box(f'EndCap.{x}', (x,30,0), (3,2.8,10), 'ivory', .1)
    for i,x in enumerate((-60,-20,20,60)):
        c.box(f'Pier.{i}.Shaft', (x,13,0), (5,26,5.6), 'ivory', .18)
        c.box(f'Pier.{i}.Foot', (x,1,0), (8,2,8), 'base', .15)
        c.box(f'Pier.{i}.Capital', (x,26.8,0), (11,3.4,8), 'ivory', .15)
        for z in (-2.86,2.86):
            c.box(f'Pier.{i}.Inset.{z}', (x,14,z), (1.5,14,.14), 'glass')
            c.box(f'Pier.{i}.InsetLintel.{z}', (x,21.4,z), (2,.6,.3), 'gold')
        for sx in (-1,1):
            c.beam(f'Pier.{i}.Knee.{sx}', (x+sx*2,19,0), (x+sx*9,28,0), 1.3, 'ivory')
    # Filled spandrels leave real arch openings beneath the viaduct.
    for j,center in enumerate((-40,0,40)):
        profile=[(-17.5,17),(-15.8,21),(-12,24.2),(-6.5,26.3),(0,27),
                 (6.5,26.3),(12,24.2),(15.8,21),(17.5,17)]
        for side in (-1,1):
            z=side*3.65
            for i in range(len(profile)-1):
                x0,y0=profile[i];x1,y1=profile[i+1]
                c.mesh(f'Arch.{j}.{side}.Spandrel.{i}',
                       [(center+x0,y0,z),(center+x1,y1,z),(center+x1,28.8,z),(center+x0,28.8,z)],
                       [(0,1,2,3) if side > 0 else (3,2,1,0)], 'ivory')
                c.beam(f'Arch.{j}.{side}.Voussoir.{i}', (center+x0,y0,z),
                       (center+x1,y1,z), .7, 'base')
    for z in (-4.7,4.7):
        c.box(f'Fascia.{z}', (0,29.2,z), (160,1.5,.4), 'glass')
        c.box(f'FasciaLip.{z}', (0,30.1,z), (160,.3,.5), 'gold')
        for x in range(-80,81,8):
            c.box(f'FasciaJoint.{z}.{x}', (x,29.3,z), (.35,1.8,.6), 'ivory')
    for z in (-2.2,2.2):
        c.beam(f'Rail.{z}', (-80,31.4,z), (80,31.4,z), .28, 'dark')
    for x in range(-78,79,4):
        c.box(f'Tie.{x}', (x,31.25,0), (.7,.1,6), 'metal')
    for x in (-82.6,82.6):
        c.cyl(f'EndSignal.{x}', (x,31.75,0), .35,.5,'gold',6)
    c.socket('TrackStart', (-80,31.2,0));c.socket('TrackEnd', (80,31.2,0))
    _landings(c, [('deck',(0,31.2,0),(160,10))])

def _city_train_car(c):
    body = c.empty('CarBody')
    verts = [(-11.5, .5, -2), (-10, 0, -2.5), (10, 0, -2.5), (11.5, .5, -2),
             (-11.5, .5, 2), (-10, 0, 2.5), (10, 0, 2.5), (11.5, .5, 2),
             (-10, 4.2, -2.5), (10, 4.2, -2.5), (-10, 4.2, 2.5), (10, 4.2, 2.5)]
    faces = [(0,1,2,3),(4,7,6,5),(1,5,6,2),(0,3,9,8),(4,10,11,7),
             (0,8,10,4),(3,7,11,9),(8,9,11,10)]
    c.mesh('CarShell', verts, faces, 'ivory', body)
    c.box('RedStripe.L', (0, 2.7, -2.53), (20.8, .8, .08), 'red', 0, body)
    c.box('RedStripe.R', (0, 2.7, 2.53), (20.8, .8, .08), 'red', 0, body)
    for side in (-1, 1):
        for i, x in enumerate((-7.5, -4.5, 0, 4.5, 7.5)):
            c.box(f'Window.{side}.{i}', (x, 3.6, side * 2.56), (2.2, 1.1, .1), 'glass', .08, body)
    c.box('Roof', (0, 4.6, 0), (18, .8, 3.8), 'base', .4, body)
    for x in (-7.5, 7.5):
        for z in (-1.8, 1.8):
            c.cyl(f'Wheel.{x}.{z}', (x, .35, z), .45, .7, 'dark', 8, parent=body)
    c.animate(body, 'Ride_Loop', [
        {'t': 0, 'position': [0, 0, 0]}, {'t': .6, 'position': [0, .08, 0]},
        {'t': 1.2, 'position': [0, 0, 0]},
    ])
    _landings(c, [('roof', (0, 5.4, 0), (17.6, 3.2))])


def _city_construction(c):
    steel=_paint(c,'ConstructionOxide','foundry',(1.2,.8,.65),(.38,.09))
    crane_paint=_paint(c,'CraneOchre','harbor',(1.1,1,.82),(.285,.085))
    for f in range(6):
        y=15*(f+1)
        c.box(f'Slab.{f}', (0,y,0), (34,1.2,34), 'base', .12)
        for x in (-15.3,15.3):
            for z in (-15.3,15.3):
                c.box(f'Column.{f}.{x}.{z}', (x,y-7.5,z), (1.6,15,1.6), steel)
                c.box(f'ColumnJoint.{f}.{x}.{z}', (x,y-1.3,z), (2.1,1.4,2.1), 'metal')
        # Completed core and fragmented ivory facade oppose the open steel bays.
        c.box(f'Core.{f}', (-7,y-7.5,-7), (11,13.8,11), 'ivory', .1)
        for x in (-10,-4):
            c.box(f'CoreWindow.{f}.{x}', (x,y-7,-1.43), (2.3,8,.16), 'glass')
        c.box(f'CoreFacade.{f}', (-15.5,y-7.5,1), (2,13.8,8), 'ivory', .08)
        c.box(f'CoreSideWindow.{f}', (-16.55,y-7.5,1), (.15,8,3.2), 'glass')
        for z in (-15.8,15.8):
            c.beam(f'FloorBeam.{f}.{z}', (-15.3,y-.9,z), (15.3,y-.9,z), .7, steel)
            _rail(c,f'EdgeRail.{f}.{z}',-14.8,14.8,y+.6,z,posts=4,mat='dark')
        c.beam(f'OpenBrace.{f}', (15.3,y-15,-15.3), (15.3,y,15.3), .4, steel)
        for k in range(2):
            c.box(f'StagedPanels.{f}.{k}', (7,y+1+k*.45,-8), (8,.35,4), 'ivory')
    crane=c.socket('Crane',(20.4,90,0))
    # Socket and slewing pivot remain authoritative; lattice members are local.
    for x in (-1.2,1.2):
        for z in (-1.2,1.2):
            c.beam(f'CraneChord.{x}.{z}', (x,0,z),(x,40,z),.42,crane_paint,crane)
    for z in (-1.2,1.2):
        for y in range(0,40,5):
            c.beam(f'CraneDiagonal.{z}.{y}',(-1.2,y,z),(1.2,y+5,z),.23,crane_paint,crane)
            c.beam(f'CraneRung.{z}.{y}',(-1.2,y,z),(1.2,y,z),.24,'dark',crane)
    c.box('CraneJibDeck',(-20,41.1,0),(60,.8,2.4),crane_paint,0,crane)
    for z in (-1.1,1.1):
        c.beam(f'JibLower.{z}',(-51.45,37,z),(10.65,37,z),.4,crane_paint,crane)
        for i in range(12):
            a=-50+i*5
            c.beam(f'JibWeb.{z}.{i}',(a,37,z),(a+2.5,40.7,z),.25,crane_paint,crane)
            c.beam(f'JibWebB.{z}.{i}',(a+2.5,40.7,z),(a+5,37,z),.25,crane_paint,crane)
    c.box('OperatorCab', (0,35,0),(4.4,4,4.8),crane_paint,.12,crane)
    c.box('OperatorWindow',(0,35.4,2.45),(3.2,2.5,.12),'glass',0,crane)
    c.box('CraneCounterweight',(6.8,35,0),(7.5,5,5),'dark',.1,crane)
    c.beam('HoistCable',(-40,37,0),(-40,19,0),.13,'dark',crane)
    c.torus('CraneHook',(-40,18.2,0),.65,.2,'dark',axis='z',parent=crane)
    c.animate(crane,'Jib_Slew',[{'t':0,'rotation':[0,-.35,0]},
              {'t':4,'rotation':[0,.35,0]},{'t':8,'rotation':[0,-.35,0]}])
    lands=[(f'floor{f}',(0,15*(f+1)+.6,0),(34,34)) for f in range(6)]
    lands.append(('jib',(.4,131.5,0),(60,2.4)));_landings(c,lands)

def _city_billboard(c):
    c.box('Foot', (0, 1, 0), (8, 2, 2), 'base', .15)
    c.box('Post', (0, 15, 0), (2, 30, 2), 'metal', .12)
    c.beam('Brace.L', (0, 18, 0), (-10, 30, 0), .4, 'metal')
    c.beam('Brace.R', (0, 18, 0), (10, 30, 0), .4, 'metal')
    pivot = c.empty('BoardPivot', (0, 30, 0))
    c.box('Board', (0, 6, 0), (24, 12, 1), 'ivory', .15, pivot)
    c.box('PaintedPanel', (0, 6, .56), (21, 9, .12), 'base', .02, pivot)
    c.box('SunStripe', (0, 6, .64), (17, 2.2, .04), 'gold', 0, pivot)
    c.box('TopLip', (0, 12.5, 0), (25, 1, 1.2), 'dark', .1, pivot)
    c.animate(pivot, 'Landing_Tip', [
        {'t': 0, 'rotation': [0, 0, 0]}, {'t': .35, 'rotation': [0, 0, .18]},
        {'t': 1.2, 'rotation': [0, 0, .18]}, {'t': 2, 'rotation': [0, 0, 0]},
    ])
    _landings(c, [('boardTop', (0, 42, 0), (24, 1))])


def _city_observatory(c):
    c.cyl('Drum',(0,15,0),24.2,30,'base',16,top_radius=22)
    c.cyl('Foundation',(0,1,0),25,2,'ivory',16)
    c.cyl('RingDeck',(0,29.3,0),27.5,1.4,'ivory',24)
    for i in range(8):
        a=TAU*i/8
        _facade_bay(c,f'DrumBay.{i}',a,23.05,14.4,4.5,19)
        x,z=math.sin(a+.28)*23.15,math.cos(a+.28)*23.15
        c.box(f'Buttress.{i}',(x,11,z),(2.2,22,2.2),'ivory',.08)
    # True upper hemisphere with curved ribs, not straight conical spokes.
    verts=[];segments=24;rows=8
    for j in range(rows+1):
        theta=(math.pi/2)*j/rows
        for i in range(segments):
            a=TAU*i/segments
            verts.append((22*math.cos(theta)*math.cos(a),30+22*math.sin(theta),22*math.cos(theta)*math.sin(a)))
    faces=[]
    for j in range(rows):
        for i in range(segments):
            faces.append((j*segments+i,j*segments+(i+1)%segments,(j+1)*segments+(i+1)%segments,(j+1)*segments+i))
    c.mesh('GlassDome',verts,[tuple(reversed(face)) for face in faces],'glass')
    for i in range(12):
        a=TAU*i/12
        for j in range(7):
            t0=(math.pi/2)*j/8;t1=(math.pi/2)*(j+1)/8
            c.beam(f'DomeRib.{i}.{j}',(22.15*math.cos(t0)*math.cos(a),30+22.15*math.sin(t0),22.15*math.cos(t0)*math.sin(a)),
                   (22.15*math.cos(t1)*math.cos(a),30+22.15*math.sin(t1),22.15*math.cos(t1)*math.sin(a)),.5,'ivory')
    for j in (2,4,6):
        theta=math.pi/2*j/8
        c.torus(f'DomeLatitude.{j}',(0,30+22.1*math.sin(theta),0),22.1*math.cos(theta),.16,'gold')
    _annulus(c,'DomeSill',20.8,22.6,32,2,'ivory')
    _circular_rail(c,'RingBalustrade',26.2,30,'gold',24)
    for i in range(8):
        a=TAU*i/8
        x,z=math.cos(a)*24.4,math.sin(a)*24.4
        c.cyl(f'FinialBase.{i}',(x,32,z),.7,4,'ivory',6,top_radius=.4)
        c.cyl(f'Finial.{i}',(x,35.5,z),.18,3,'gold',6,top_radius=.04)
    # Low checkpoint plate centered at the prescribed 50.9 m surface.
    c.cyl('CrownLanding',(0,50.5,0),5.5,.8,'ivory',16)
    c.cyl('Crown',(0,52,0),2,2,'gold',10,top_radius=.7)
    _landings(c,[('crown',(0,50.9,0),(11,11)),('ring',(0,30,0),(48.4,48.4))])

def _foundry_furnace(c):
    iron=_paint(c,'FurnacePaintedIron','foundry',(1.2,1.27,1.32),(.165,.08))
    rust=_paint(c,'FurnaceOxide','foundry',(1.1,1, .85),(.025,.10))
    heat=c.material('FurnaceAmber',(1,.24,.025),emission=2.3)
    core=c.material('FurnaceCore',(1,.67,.15),emission=2)
    c.cyl('DrumLower',(0,22,0),17.2,44,iron,16,top_radius=16.5)
    c.cyl('DrumUpper',(0,62,0),16.5,36,iron,16,top_radius=15.5)
    for i,y in enumerate((4,20,40,56,73)):
        r=17 if y<44 else 16.1
        c.cyl(f'RustCourse.{i}',(0,y,0),r+.15,3.2,rust,16)
        c.torus(f'RivetRing.{i}',(0,y+1.6,0),r+.2,.22,'dark')
    for i in range(8):
        a=TAU*i/8;x,z=math.cos(a)*16.4,math.sin(a)*16.4
        c.beam(f'FrameUpright.{i}',(x,3,z),(x,78,z),.65,iron)
        c.box(f'FrameFoot.{i}',(x,1.5,z),(3.4,3,3.4),rust,.12)
    c.box('FurnaceDoorFrame',(0,10,17),(13,17,2),'dark',.3)
    c.box('FurnaceDoorRefractory',(0,10,18.1),(10.8,14,.3),rust,.12)
    c.box('FurnaceDoorGlow',(0,9.5,18.32),(8.5,12,.16),heat)
    c.box('FurnaceDoorHotCore',(0,7.5,18.45),(4.6,7.5,.08),core)
    for x in (-5.6,5.6):
        c.cyl(f'DoorHinge.{x}',(x,10,18.7),.45,13,iron,8)
    c.box('DoorThreshold',(0,2.1,17.8),(14,1.2,3),rust,.08)
    c.box('Catwalk',(0,44.5,17.6),(38.4,.6,4),iron,.06)
    _rail(c,'CatwalkRail',-19.2,19.2,44.8,19.2,posts=8)
    # Paired balconies wrap the barrel, with visible triangular knee supports.
    for y in (44.8,80):
        for x in (-17.8,17.8):
            c.box(f'SideWalk.{y}.{x}',(x,y-.3,0),(3,.6,34),iron)
            for z in (-15,-5,5,15):
                c.beam(f'CatwalkKnee.{y}.{x}.{z}',(x*.75,y-7,z),(x,y-.6,z),.5,rust)
        c.box(f'RearWalk.{y}',(0,y-.3,-16.8),(35,.6,3),iron)
        _rail(c,f'RearRail.{y}',-18.4,18.4,y,-18.3,posts=7)
    c.box('RoofLanding',(-4.8,79.6,0),(17.6,.8,17.6),iron)
    c.cyl('Stack',(6.4,95,0),6.8,30,rust,12,top_radius=5.5)
    for y in (82,95,108):
        c.torus(f'StackCollar.{y}',(6.4,y,0),6.7-(y-82)*.04,.4,iron)
    c.cyl('StackMouth',(6.4,110,0),5.3,.12,'dark',12)
    c.torus('StackLip',(6.4,110,0),5.6,.6,iron)
    c.cyl('StackBeacon',(6.4,111,0),.45,2,heat,6)
    c.cyl('AuxiliaryStack',(-8,87,-9),2.1,22,iron,10,top_radius=1.7)
    c.torus('AuxiliaryLip',(-8,98,-9),1.8,.3,rust)
    for x in (-13,13):
        c.cyl(f'FeedPipe.{x}',(x,29,-12),1.1,54,rust,8)
        c.beam(f'FeedPipeElbow.{x}',(x,56,-12),(x*.65,63,-9),1.8,rust)
    for y in range(4,78,3):
        c.beam(f'LadderRung.{y}',(-18.7,y,-2),(-18.7,y,2),.17,'gold')
    for z in (-2,2):
        c.beam(f'LadderRail.{z}',(-18.7,2,z),(-18.7,80,z),.23,iron)
    _landings(c,[('roof',(-4.8,80,0),(17.6,17.6)),
                 ('catwalk',(0,44.8,17.6),(38.4,4))])

def _foundry_conveyor(c):
    c.box('Belt', (0, 20.75, 0), (90, 1.5, 8), 'base', .12)
    for i, x in enumerate((-45, -15, 15, 45)):
        c.box(f'Leg.{i}.L', (x, 10, -2.7), (1.4, 20, 1.4), 'metal', .08)
        c.box(f'Leg.{i}.R', (x, 10, 2.7), (1.4, 20, 1.4), 'metal', .08)
        c.beam(f'Leg.{i}.BraceA', (x, 2, -2.7), (x, 18, 2.7), .3, 'metal')
        c.beam(f'Leg.{i}.BraceB', (x, 18, -2.7), (x, 2, 2.7), .3, 'metal')
    for i in range(10):
        x = -40.5 + i * 9
        c.cyl(f'RollerHub.{i}.L', (x, 21.55, -3.8), .55, .5, 'dark', 8)
        c.cyl(f'RollerHub.{i}.R', (x, 21.55, 3.8), .55, .5, 'dark', 8)
    for z in (-3.8, 3.8):
        _rail(c, f'BeltRail.{z}', -45, 45, 21.6, z, posts=10)
    for x in (-45.75, 45.75):
        c.box(f'EndDrum.{x}', (x, 21, 0), (1.5, 2, 8), 'dark', .12)
    c.socket('BeltStart', (-45, 21, 0))
    c.socket('BeltEnd', (45, 21, 0))
    _landings(c, [('belt', (0, 21.6, 0), (90, 8))])


def _foundry_chimney(c):
    c.cyl('Stack', (0, 55, 0), 6, 110, 'base', 12, top_radius=4)
    for i, y in enumerate((8, 32, 56, 80, 104)):
        c.torus(f'Band.{i}', (0, y, 0), 5.2 - y * .008, .45, 'metal')
    c.torus('Lip', (0, 110, 0), 4.5, .7, 'dark')
    for i in range(4):
        a = TAU * i / 4
        x, z = math.cos(a)*4.7, math.sin(a)*4.7
        c.cyl(f'LipPost.{i}', (x, 112, z), .18, 4, 'gold', 6)
    _landings(c, [('lip', (0, 110, 0), (7, 7))])


def _foundry_barge(c):
    molten = c.material('MoltenSlagAmber', (1, .3, .025), emission=2)
    barge = c.empty('BargeRoot')
    verts = [(-20.5,0,-6),(-17,0,-8.5),(17,0,-8.5),(20.5,0,-6),
             (-20.5,0,6),(-17,0,8.5),(17,0,8.5),(20.5,0,6),
             (-19.5,4.8,-7.5),(19.5,4.8,-7.5),(-19.5,4.8,7.5),(19.5,4.8,7.5)]
    faces = [(0,1,2,3),(4,7,6,5),(1,5,6,2),(0,3,9,8),(4,10,11,7),
             (0,8,10,4),(3,7,11,9),(8,9,11,10)]
    c.mesh('Hull', verts, faces, 'metal', barge)
    c.box('Slag', (0, 5.2, 0), (32, 1, 11.2), molten, .12, barge)
    for side in (-1, 1):
        c.box(f'Gunwale.{side}', (0, 5.5, side*7.2), (36, .4, 2), 'dark', .08, barge)
        for x in (-16, -8, 0, 8, 16):
            c.torus(f'Tyre.{side}.{x}', (x, 2.5, side*8.2), 1.1, .3, 'dark', axis='z', parent=barge)
    c.animate(barge, 'Barge_Rock', [
        {'t': 0, 'rotation': [0, 0, -.02]}, {'t': 1.8, 'rotation': [0, 0, .02]},
        {'t': 3.6, 'rotation': [0, 0, -.02]},
    ])
    _landings(c, [('gunwale', (0, 5.7, 7.2), (36, 2))])


def _foundry_press(c):
    c.box('Anvil', (0, 2, 0), (28, 4, 20), 'metal', .25)
    for s in (-1, 1):
        c.box(f'Column.{s}', (s*12, 20, 0), (3.5, 40, 4), 'base', .16)
        c.torus(f'Flywheel.{s}', (s*14.2, 32, 0), 3.2, .7, 'dark', axis='x')
        c.beam(f'ColumnBrace.{s}', (s*12, 5, -8), (s*12, 35, 8), .55, 'metal')
    ram = c.empty('Ram', (0, 28, 0))
    c.box('RamBlock', (0, 0, 0), (20, 6, 16), 'metal', .2, ram)
    c.box('RamFace', (0, -3.5, 0), (16, 1, 12), 'dark', .1, ram)
    c.socket('Strike', (0, -3, 0), ram)
    c.box('Head', (0, 41.5, 0), (30, 3, 4), 'metal', .18)
    for x in (-14, 14):
        c.cyl(f'WarningLamp.{x}', (x, 43.5, 0), .5, 1, 'glow', 8)
    c.animate(ram, 'Press_Cycle', [
        {'t': 0, 'position': [0, 28, 0]}, {'t': 1.4, 'position': [0, 28, 0]},
        {'t': 1.8, 'position': [0, 7, 0]}, {'t': 2.05, 'position': [0, 7, 0]},
        {'t': 2.8, 'position': [0, 28, 0]},
    ])
    _landings(c, [
        ('anvil', (0, 4, 0), (28, 20)),
        ('head', (0, 43, 0), (30, 4)),
    ])


def _harbor_crane(c):
    green=_paint(c,'CraneGreenSteel','harbor',(1.12,1.12,1.02),(.025,.085))
    yellow=_paint(c,'CraneSafetyPaint','harbor',(1,1,.9),(.285,.08))
    blue=_paint(c,'ContainerBluePaint','harbor',(1,.95,.85),(.17,.07))
    for x in (-3.5,3.5):
        for z in (-3.5,3.5):
            c.beam(f'MastChord.{x}.{z}',(x,3,z),(x*.75,87,z*.75),.85,green)
            c.box(f'MastFoot.{x}.{z}',(x,1,z),(5,2,3),'ivory',.1)
    for k in range(8):
        y0,y1=4+k*10,14+k*10
        for z in (-3.1,3.1):
            c.beam(f'MastWeb.{k}.{z}',(-3,y0,z),(3,y1,z),.48,green)
            c.beam(f'MastWebB.{k}.{z}',(3,y0,z),(-3,y1,z),.48,green)
            c.beam(f'MastTie.{k}.{z}',(-3,y0,z),(3,y0,z),.5,yellow)
    for y in (25,60,86):
        c.box(f'MastGallery.{y}',(0,y,0),(9,.7,9),green)
        for z in (-4.35,4.35):
            _rail(c,f'MastGalleryRail.{y}.{z}',-4.4,4.4,y+.35,z,posts=3)
    for y in range(3,86,3):
        c.beam(f'LadderRung.{y}',(-1,y,3.8),(1,y,3.8),.14,yellow)
    boom=c.socket('BoomPivot',(0,90,0))
    # Landing is at +4; deep truss sits underneath, leaving the walkway clear.
    c.box('BoomDeck',(36,3.7,0),(80,.6,5),green,0,boom)
    for z in (-2.3,2.3):
        c.beam(f'BoomChord.{z}',(-4,-3.8,z),(76,-3.8,z),.5,green,boom)
        for i in range(10):
            x=-4+i*8
            c.beam(f'BoomWeb.{z}.{i}',(x,-3.8,z),(x+4,3.4,z),.45,green,boom)
            c.beam(f'BoomWebB.{z}.{i}',(x+4,3.4,z),(x+8,-3.8,z),.45,green,boom)
        _rail(c,f'BoomRail.{z}',-4,76,4,z,parent=boom,posts=10,mat=yellow)
    c.box('Counterweight',(-6.5,-3,0),(5,8,9),'dark',.1,boom)
    c.box('OperatorCab',(1,-4,0),(7,7,8),green,.15,boom)
    c.box('CabWindow',(1,-3,4.05),(5,3.8,.12),'glass',0,boom)
    c.box('CabDoor',(4.56,-4,0),(.1,5,3),yellow,0,boom)
    c.box('HoistWinch',(7,1.8,0),(6,3,3),yellow,.08,boom)
    c.beam('HoistCable',(72,0,0),(72,-23,0),.15,'dark',boom)
    load=c.empty('HookLoad',(72,-34,0),boom)
    c.torus('HoistHook',(0,9,0),.9,.25,'dark',axis='z',parent=load)
    for x in (-6,6):
        for z in (-4,4):
            c.beam(f'LoadSling.{x}.{z}',(0,8,0),(x,4,z),.15,'dark',load)
    c.box('HookedContainer',(0,0,0),(14,8,10),blue,.08,load)
    for z in (-5.03,5.03):
        for x in range(-6,7,2):
            c.box(f'ContainerRib.{z}.{x}',(x,0,z),(.22,7.7,.16),green,0,load)
        for y in (-3.6,3.6):
            c.box(f'ContainerRail.{z}.{y}',(0,y,z),(13.8,.45,.2),yellow,0,load)
    c.socket('Landing.Hook',(0,4,0),load)
    c.animate(boom,'Boom_Slew',[{'t':0,'rotation':[0,-.35,0]},
              {'t':5,'rotation':[0,.35,0]},{'t':10,'rotation':[0,-.35,0]}])
    c.animate(load,'Container_Hoist',[{'t':0,'position':[72,-34,0]},
              {'t':3,'position':[72,-24,0]},{'t':6,'position':[72,-34,0]}])
    _landings(c,[('boom',(36,94,0),(80,5)),('hookedContainer',(72,60,0),(14,10))])

def _harbor_containers(c):
    colours = ['red', 'base', 'gold', 'metal']
    for r in range(3):
        count = 4 - (r % 2)
        for col in range(count):
            x = (col - (count - 1)/2) * 12
            mat = colours[(r*4+col) % len(colours)]
            c.box(f'Container.{r}.{col}', (x, r*6+2.85, 0), (11.6, 5.7, 9.6), mat, .12)
            for rx in (-5.4, 5.4):
                c.box(f'Container.{r}.{col}.Rib.{rx}', (x+rx, r*6+2.85, 4.85), (.25, 5.2, .1), 'dark', 0)
            c.box(f'Container.{r}.{col}.Door', (x, r*6+2.85, 4.87), (8.5, 4.4, .08), 'metal', .02)
    _landings(c, [
        ('row0', (0, 5.85, 0), (48, 10)),
        ('row1', (0, 11.85, 0), (36, 10)),
        ('row2', (0, 17.85, 0), (48, 10)),
    ])


def _harbor_freighter(c):
    verts = [(-114,0,-12),(-102,0,-20.5),(108,0,-20.5),(114,3,-15),
             (-114,0,12),(-102,0,20.5),(108,0,20.5),(114,3,15),
             (-108,20,-18),(110,20,-18),(-108,20,18),(110,20,18)]
    faces = [(0,1,2,3),(4,7,6,5),(1,5,6,2),(0,3,9,8),(4,10,11,7),
             (0,8,10,4),(3,7,11,9),(8,9,11,10)]
    c.mesh('Hull', verts, faces, 'metal')
    c.box('Deck', (0, 19.6, 0), (220, .8, 40), 'base', .1)
    for i, x in enumerate((-22, 11, 44, 77)):
        c.box(f'Cargo.{i}', (x, 26, 0), (26.4, 12, 28), ['red','gold','base','metal'][i], .2)
        for rx in (-11, 0, 11):
            c.box(f'Cargo.{i}.Rib.{rx}', (x+rx, 26, 14.05), (.25, 11, .1), 'dark', 0)
    c.box('Bridge', (-77, 35, 0), (44, 30, 32), 'ivory', .35)
    for side in (-1, 1):
        c.box(f'BridgeGlass.{side}', (-77, 43, side*16.05), (34, 5, .1), 'glass', .02)
    c.cyl('Funnel', (-77, 57, 0), 4.2, 14, 'base', 10, top_radius=3.4)
    c.beam('ForeMast', (-104, 20, 0), (-104, 61, 0), .55, 'dark')
    c.beam('ForeYard', (-110, 55, 0), (-98, 55, 0), .4, 'dark')
    c.cyl('MastBeacon', (-104, 64, 0), .4, 2, 'glow', 6)
    for side in (-1, 1):
        _rail(c, f'DeckRail.{side}', -105, 105, 20, side*20, posts=12)
    lands = [('deck', (0, 20, 0), (220, 40)),
             ('bridgeRoof', (-77, 50, 0), (44, 32))]
    for i, x in enumerate((-22, 11, 44, 77)):
        lands.append((f'cargo{i}', (x, 32, 0), (26.4, 28)))
    _landings(c, lands)


def _harbor_gantry(c):
    w, h = 24, 130
    for xi, x in enumerate((-10.8, 10.8)):
        for zi, z in enumerate((-10.8, 10.8)):
            c.box(f'Leg.{xi}.{zi}', (x, h/2, z), (2, h, 2), 'metal', .08)
            c.box(f'Foot.{xi}.{zi}', (x, 1.5, z), (8, 3, 3.5), 'base', .18)
    for f in range(1, 5):
        y = h/4*f
        c.box(f'Deck.{f}', (0, y, 0), (w, 1, w), 'base', .08)
        for z in (-11.2, 11.2):
            _rail(c, f'DeckRail.{f}.{z}', -12, 12, y+.5, z, posts=4)
    for z in (-10.8, 10.8):
        for f in range(4):
            y0, y1 = f*32.5, (f+1)*32.5
            c.beam(f'BraceA.{z}.{f}', (-10.8,y0,z), (10.8,y1,z), .5, 'dark')
            c.beam(f'BraceB.{z}.{f}', (10.8,y0,z), (-10.8,y1,z), .5, 'dark')
    c.box('TopBridge', (0, 131.5, 0), (60, 3, 6), 'base', .12)
    for x in (-30.5, 30.5):
        c.cyl(f'BridgeLamp.{x}', (x, 134, 0), .45, 2, 'glow', 6)
    lands = [(f'deck{f}', (0, 32.5*f+.5, 0), (24, 24)) for f in range(1,5)]
    lands.append(('bridge', (0, 133, 0), (60, 6)))
    _landings(c, lands)


def _harbor_breakwater(c):
    concrete = _paint(c, 'BreakwaterConcrete', 'city', (.8, .82, .78), (.025, .115))
    verts = [(-103.5,0,-10), (103.5,0,-10), (100,9.6,-12.5), (-100,9.6,-12.5),
             (-103.5,0,10), (103.5,0,10), (100,9.6,12.5), (-100,9.6,12.5)]
    faces = [(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7),(0,3,7,4),(1,5,6,2)]
    c.mesh('BreakwaterWall', verts, [tuple(reversed(face)) for face in faces], 'stone')
    c.box('LandingTop', (0, 9.8, 0), (200, .4, 24), concrete, .08)
    for i in range(6):
        x = (i-2.5)*(200/6)
        c.cyl(f'Bollard.{i}', (x, 11.5, 8), 1, 3, 'dark', 10, top_radius=.75)
        c.torus(f'Bollard.{i}.Cap', (x, 13.2, 8), 1.15, .2, 'metal')
    _landings(c, [('top', (0, 10, 0), (200, 24))])


def _launch_ring(c):
    steel=_paint(c,'RingPaintedSteel','launchworks',(1.1,1.12,1.15),(.18,.065))
    rust=_paint(c,'RingOxide','launchworks',(1.18,1,.8),(.025,.085))
    amber=c.material('RingAmber',(1,.36,.035),emission=1.6)
    # Box-section annular deck has structural depth and a true open center.
    _annulus(c,'LaunchRingDeck',54,66,204,4,steel,32)
    for y in (196,200):
        c.torus(f'RingLowerChord.{y}',(0,y,0),60,1.1,rust)
    for i in range(24):
        a=TAU*i/24;b=TAU*(i+1)/24
        for r in (54.5,65.5):
            c.beam(f'RingWeb.{i}.{r}',(math.cos(a)*r,196,math.sin(a)*r),
                   (math.cos(b)*r,203,math.sin(b)*r),.55,rust)
    _circular_rail(c,'OuterGuard',67,204,'gold',32)
    _circular_rail(c,'InnerGuard',53.5,204,'gold',24)
    for i in range(4):
        a=TAU*i/4+.4;x,z=math.cos(a)*60,math.sin(a)*60
        # Four open lattice legs, with paired chords and repeated crossed bays.
        for d in (-2.2,2.2):
            for e in (-2.2,2.2):
                c.beam(f'LegChord.{i}.{d}.{e}',(x+d,3,z+e),(x+d*.6,199,z+e*.6),1.2,rust)
        c.box(f'StrutFoot.{i}',(x,2,z),(11,4,11),steel,.16)
        for k in range(6):
            y0,y1=4+k*32,36+k*32
            for e in (-2,2):
                c.beam(f'StrutX.{i}.{k}.{e}',(x-2,y0,z+e),(x+2,y1,z+e),.65,steel)
                c.beam(f'StrutXB.{i}.{k}.{e}',(x+2,y0,z+e),(x-2,y1,z+e),.65,steel)
            c.box(f'LegCollar.{i}.{k}',(x,y0,z),(6,1.2,6),rust)
        # Wide upper knees visibly transfer the ring load into each tower.
        for da in (-.27,.27):
            c.beam(f'RingKnee.{i}.{da}',(x,168,z),
                   (math.cos(a+da)*60,199,math.sin(a+da)*60),1.7,rust)
    for i in range(8):
        a=TAU*i/8;x,z=math.cos(a)*60,math.sin(a)*60
        c.box(f'LandingPadBase.{i}',(x,204.5,z),(9,1,9),rust,.12)
        c.box(f'LandingPad.{i}',(x,205.5,z),(8,1,8),'ivory',.12)
        c.cyl(f'PadTarget.{i}',(x,206.02,z),2.5,.04,'gold',12)
        c.cyl(f'PadLamp.{i}',(x,208.5,z),.45,5,amber,6)
    _landings(c,[(f'ring{i}',(math.cos(TAU*i/8)*60,206,math.sin(TAU*i/8)*60),(8,8)) for i in range(8)])

def _launch_rocket(c):
    steel=_paint(c,'RocketServiceSteel','launchworks',(1.1,1.12,1.1),(.18,.065))
    rust=_paint(c,'RocketMastOxide','launchworks',(1.18,1,.85),(.025,.085))
    enamel=_paint(c,'RocketEnamel','launchworks',(1.08,1.07,1.02),(.18,.065))
    amber=c.material('RocketAmber',(1,.32,.035),emission=1.6)
    c.cyl('RocketStage',(0,64,0),8.5,128,enamel,16)
    c.cyl('EngineSkirt',(0,7,0),8.8,14,steel,16,top_radius=8.5)
    c.cyl('RedBand',(0,32,0),8.65,8,'red',16)
    c.cyl('UpperStageBand',(0,114,0),8.65,2,'dark',16)
    for y in (15,46,82,108,127):
        c.torus(f'StageSeam.{y}',(0,y,0),8.53,.12,'gold')
    c.cyl('NoseBase',(0,132,0),8.5,8,enamel,16,top_radius=7.2)
    c.cyl('Nose',(0,148,0),7.2,24,'red',16,top_radius=.2)
    c.cyl('NoseBeacon',(0,161.5,0),.25,3,amber,6)
    for i in range(4):
        a=TAU*i/4
        # Swept planar fins have an actual foil silhouette, with capped thickness.
        profile=[(7.8,32),(9.9,12),(9.9,1),(7.8,4)]
        verts=[]
        for thick in (-.45,.45):
            for r,y in profile:
                verts.append((math.cos(a)*r-math.sin(a)*thick,y,math.sin(a)*r+math.cos(a)*thick))
        c.mesh(f'SweptFin.{i}',verts,[(0,1,2,3),(4,7,6,5),(0,4,5,1),
               (1,5,6,2),(2,6,7,3),(3,7,4,0)],'red')
        x,z=math.cos(a)*8.55,math.sin(a)*8.55
        c.beam(f'StageServiceLine.{i}',(x,48,z),(x,106,z),.16,'gold')
    for x in (-4,4):
        for z in (-4,4):
            c.cyl(f'EngineBell.{x}.{z}',(x,2,z),2.2,4,'dark',10,top_radius=1.3)
    # Mast remains within its narrow authoritative footprint, but is open steel.
    for x in (9.4,12.6):
        for z in (-2.6,2.6):
            c.beam(f'MastChord.{x}.{z}',(x,0,z),(x,155,z),.65,rust)
    for k in range(13):
        y=k*11.7
        for z in (-2.6,2.6):
            c.beam(f'MastWeb.{k}.{z}',(9.4,y,z),(12.6,y+11.7,z),.3,steel)
            c.beam(f'MastWebB.{k}.{z}',(12.6,y,z),(9.4,y+11.7,z),.3,steel)
        c.beam(f'MastRung.{k}',(9.4,y,2.6),(12.6,y,2.6),.35,'gold')
    c.box('MastHead',(11,152,0),(4,6,6),rust,.1)
    c.box('MastHeadPanel',(11,152,3.05),(2.4,3,.1),steel)
    for i in range(1,5):
        y=25.6*i
        c.box(f'UmbilicalArm.{i}',(15,y,0),(12,.8,8),steel,.06)
        for z in (-3.7,3.7):
            c.beam(f'UmbilicalKnee.{i}.{z}',(11,y-7,z*.6),(20.5,y-.5,z),.6,rust)
            _rail(c,f'ArmRail.{i}.{z}',9,21,y+.4,z,posts=3)
        c.box(f'ArmEndPanel.{i}',(20.6,y-.7,0),(.6,2,8),rust)
        c.beam(f'FeedHose.{i}',(9.1,y+2,-2),(7.8,y+2,-2),.5,'dark')
    _landings(c,[(f'arm{i}',(15,25.6*i+.4,0),(12,8)) for i in range(1,5)])

def _launch_pistons(c):
    heads = []
    for i in range(5):
        x = (i-2)*12
        c.cyl(f'Cylinder.{i}', (x, 33, 0), 4.2, 66, 'metal', 10, top_radius=3.6)
        c.box(f'CylinderBase.{i}', (x, 2, 0), (10, 4, 9), 'base', .18)
        head = c.empty(f'HeadPivot.{i}', (x, 14*(i+1), 0))
        c.cyl(f'Head.{i}', (0, 0, 0), 5.04, 2, 'gold', 10, parent=head)
        c.torus(f'HeadRim.{i}', (0, 1, 0), 4.3, .35, 'dark', parent=head)
        heads.append(head)
        frames = []
        for k in range(5):
            t = k * 1.2
            y = 14*(i+1) + math.sin((t/4.8)*TAU + i*1.2)*3
            frames.append({'t': t, 'position': [x, y, 0]})
        c.animate(head, 'Piston_Cycle', frames)
    c.box('MachinePlinth', (0, -2, 0), (58, 4, 10), 'base', .2)
    for x in (-28, 28):
        c.cyl(f'WarningLamp.{x}', (x, 69.5, 0), .5, 5, 'glow', 6)
    _landings(c, [(f'piston{i}', ((i-2)*12, 14*(i+1)+1, 0), (9.6,9.6)) for i in range(5)])


def _launch_exhaust(c):
    iron=_paint(c,'ShaftPaintedIron','launchworks',(.82,.89,.92),(.025,.08))
    rust=_paint(c,'ShaftOxide','launchworks',(1.25,.95,.7),(.025,.08))
    deck=_paint(c,'ShaftDeckEnamel','launchworks',(1,1,.92),(.18,.065))
    amber=c.material('ShaftVentHeat',(1,.25,.025),emission=2)
    # Reference-directed open cutaway: rear 240 degrees enclosure, exposed
    # foreground reveals staggered baffles instead of hiding gameplay in a tube.
    # Full circular rim, foundation and corner ribs retain the 75 m envelope.
    segments=24
    for i in range(segments):
        a=TAU*i/segments;b=TAU*(i+1)/segments
        if i not in (0,1,2,3,4,5,22,23):
            points=[(37.15*math.cos(a),y,37.15*math.sin(a)) for y in (-120,0)]
            points += [(37.15*math.cos(b),y,37.15*math.sin(b)) for y in (-120,0)]
            # Both sides of the casing render from the arena or descent route.
            c.mesh(f'ShaftWall.{i}',points,[(0,2,3,1),(1,3,2,0)],iron)
        if i%2==0:
            x,z=math.cos(a)*36.9,math.sin(a)*36.9
            if i not in (0,2,4,22):
                c.beam(f'WallRib.{i}',(x,-120,z),(x,0,z),.8,rust)
                for y in (-24,-48,-72,-96):
                    c.box(f'WallCleat.{i}.{y}',(x,y,z),(1.3,2.2,1.3),deck)
    _annulus(c,'FoundationRing',33.8,37.5,-120,2,deck,24)
    _annulus(c,'UpperRim',34.2,37.5,-.3,1.5,deck,24)
    for y in (-24,-48,-72,-96):
        for i in range(6,22):
            a=TAU*i/24;b=TAU*(i+1)/24
            c.beam(f'WallBand.{y}.{i}',(36.5*math.cos(a),y,36.5*math.sin(a)),
                   (36.5*math.cos(b),y,36.5*math.sin(b)),.55,rust)
    baffles=[]
    for i in range(1,5):
        a=i*1.7;x,y,z=math.cos(a)*22.5,-120*(i/5),math.sin(a)*22.5
        c.box(f'Baffle.{i}',(x,y,z),(24,1.2,10),deck,.06)
        for bracket_index, xx in enumerate((x-10,x+10)):
            c.beam(f'BaffleBracket.{i}.{bracket_index}',(xx,y-.6,z),(xx*.75,y-9,z*.75),.6,rust)
        for rail_index, zz in enumerate((z-4.7,z+4.7)):
            _rail(c,f'BaffleRail.{i}.{rail_index}',x-12,x+12,y+.6,zz,posts=4)
        c.box(f'BaffleLeadingEdge.{i}',(x,y-.6,z+5.1),(24,1.2,.2),rust)
        baffles.append((f'baffle{i}',(x,y+.6,z),(24,10)))
    c.cyl('Vent',(0,-123,0),15,2,amber,16)
    c.torus('VentRim',(0,-122,0),17,1,rust)
    for i in range(12):
        a=TAU*i/12
        c.beam(f'VentGrate.{i}',(0,-121.8,0),(math.cos(a)*15,-121.8,math.sin(a)*15),.4,'dark')
    c.torus('VentInnerGrille',(0,-121.7,0),7,.35,'dark')
    c.socket('Updraft',(0,-118,0));_landings(c,baffles)

def _launch_elevator(c):
    h, w = 150, 16
    for s in (-1, 1):
        x = s*8
        c.box(f'Rail.{s}', (x, 75, 0), (4, 150, 4), 'metal', .1)
        c.box(f'RailFoot.{s}', (x, 2, 0), (4, 4, 8), 'base', .18)
    for i in range(10):
        y0, y1 = i*15, (i+1)*15
        c.beam(f'BackBrace.{i}.A', (-8,y0,-2), (8,y1,-2), .35, 'dark')
        c.beam(f'BackBrace.{i}.B', (8,y0,-2), (-8,y1,-2), .35, 'dark')
    c.box('TopMachine', (0, 152.5, 0), (20, 5, 17), 'base', .2)
    cage = c.empty('Cage', (0, 10, 0))
    c.box('CageFloor', (0, 0, 0), (16, 1.5, 16), 'gold', .12, cage)
    for x in (-7.5, 7.5):
        for z in (-7.5, 7.5):
            c.beam(f'CagePost.{x}.{z}', (x,0,z), (x,7,z), .3, 'base', cage)
    for z in (-7.7, 7.7):
        c.beam(f'CageRail.{z}', (-8,6,z), (8,6,z), .3, 'base', cage)
    c.animate(cage, 'Lift_Cycle', [
        {'t': 0, 'position': [0,10,0]}, {'t': 2, 'position': [0,10,0]},
        {'t': 8, 'position': [0,145,0]}, {'t': 10, 'position': [0,145,0]},
        {'t': 16, 'position': [0,10,0]},
    ])
    c.socket('LiftBottom', (0,10,0))
    c.socket('LiftTop', (0,145,0))
    _landings(c, [('cage', (0,11,0), (16,16))])


BUILDERS = {
    'structure.city.ivoryTower': _city_ivory_tower,
    'structure.city.roofDeck': _city_roof_deck,
    'structure.city.railSpan': _city_rail_span,
    'structure.city.trainCar': _city_train_car,
    'structure.city.constructionCrown': _city_construction,
    'structure.city.billboard': _city_billboard,
    'structure.city.observatoryDome': _city_observatory,
    'structure.foundry.furnaceTower': _foundry_furnace,
    'structure.foundry.conveyorSpan': _foundry_conveyor,
    'structure.foundry.chimney': _foundry_chimney,
    'structure.foundry.slagBarge': _foundry_barge,
    'structure.foundry.stampingPress': _foundry_press,
    'structure.harbor.craneBoom': _harbor_crane,
    'structure.harbor.containerStack': _harbor_containers,
    'structure.harbor.freighter': _harbor_freighter,
    'structure.harbor.gantryTower': _harbor_gantry,
    'structure.harbor.breakwater': _harbor_breakwater,
    'structure.launchworks.launchRing': _launch_ring,
    'structure.launchworks.rocket': _launch_rocket,
    'structure.launchworks.pistonStair': _launch_pistons,
    'structure.launchworks.exhaustShaft': _launch_exhaust,
    'structure.launchworks.gantryElevator': _launch_elevator,
}


def build(req, c):
    """Dispatch a full model request by its authoritative stand-in id."""
    stand_in = req['standIn']
    try:
        builder = BUILDERS[stand_in]
    except KeyError as exc:
        raise ValueError(f'architecture.py does not own {stand_in!r}') from exc
    builder(c)

"""M-018: sculpted, swept Phase Skate candidate from the approved turnaround.

Run Blender -b --python hopper/3d/models/source/phase_skate_refine.py
Writes only local/hopper-phase-skate-refine. No production or shared manifest writes.
Both LODs use the same outline and tail curves; lower tessellation preserves pivots.
"""
from __future__ import annotations
import bpy, bmesh, math, json, sys, subprocess, shutil
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from common import Context, ROOT, TEXTURES, v
from rigid_creatures import REQUESTS, mesh_bounds, count_triangles
OUT=ROOT/'local/hopper-phase-skate-refine';OUT.mkdir(parents=True,exist_ok=True)
REQ=REQUESTS['M-018'];TAU=math.tau

def catmull(points,steps):
    p=[Vector(x) for x in points];r=[]
    for i in range(len(p)-1):
        a,b,c,d=p[max(0,i-1)],p[i],p[i+1],p[min(len(p)-1,i+2)]
        for j in range(steps):
            t=j/steps;r.append((b*2+(c-a)*t+(a*2-b*5+c*4-d)*t*t+(-a+b*3-c*3+d)*t*t*t)*.5)
    return r+[p[-1]]

def uv_project(o):
    uv=o.data.uv_layers.active
    for poly in o.data.polygons:
        for li in poly.loop_indices:
            co=o.data.vertices[o.data.loops[li].vertex_index].co
            uv.data[li].uv=(.14+co.x*.12,.49+co.y*.11)

def shell(c,name,outline,mat,parent,height=.15,center=None,rings=2):
    # Closed cambered shell, not a flat extruded polygon. Smooth crowns are bounded
    # by sharp silhouette edges. Each armor scale gets its own swept center ridge.
    pts=[Vector(p) for p in outline];center=Vector(center) if center else sum(pts,Vector((0,0,0)))/len(pts)
    n=len(pts);verts=[]
    for layer in range(rings):
        a=1-layer/rings
        for p in pts:
            q=center+(p-center)*a;q.y+=height*math.sin((1-a)*math.pi/2);verts.append(tuple(q))
    top=len(verts);verts.append(tuple(center+Vector((0,height,0))));bottom=len(verts);verts.append(tuple(center-Vector((0,.035,0))))
    faces=[]
    for ring in range(rings-1):
        for i in range(n):j=(i+1)%n;faces.append((ring*n+i,ring*n+j,(ring+1)*n+j,(ring+1)*n+i))
    for i in range(n):j=(i+1)%n;faces.append(((rings-1)*n+i,(rings-1)*n+j,top));faces.append((j,i,bottom))
    o=c.mesh(name,verts,faces,mat,parent);bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free();uv_project(o)
    for f in o.data.polygons:f.use_smooth=True
    return o

def tube(c,name,points,radius,mat,parent,sides=6):
    verts=[];faces=[]
    for i,p in enumerate(points):
        t=i/(len(points)-1);tangent=(points[min(i+1,len(points)-1)]-points[max(0,i-1)]).normalized()
        left=tangent.cross(Vector((0,1,0))).normalized();up=left.cross(tangent).normalized()
        rad=radius(t) if callable(radius) else radius
        for k in range(sides):verts.append(tuple(p+(left*math.cos(TAU*k/sides)+up*math.sin(TAU*k/sides))*rad))
    for i in range(len(points)-1):
        for k in range(sides):n=(k+1)%sides;faces.append((i*sides+k,i*sides+n,(i+1)*sides+n,(i+1)*sides+k))
    faces.extend([tuple(reversed(range(sides))),tuple((len(points)-1)*sides+k for k in range(sides))])
    o=c.mesh(name,verts,faces,mat,parent);bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free();uv_project(o)
    for f in o.data.polygons:f.use_smooth=True
    return o

def build(req,c,lod=0):
    prefix='' if lod==0 else 'LOD1.'
    N=lambda n:prefix+n
    # Existing painted hide supplies broad brushwork; blue trim is sampled on a
    # narrow slate band for the chitin, instead of a repeated full-image UV per face.
    hide=c.material(N('Obsidian.Hide'),(.70,.81,1),TEXTURES/'creatures/shadow-hide.png')
    plate=c.material(N('Cobalt.Chitin'),(.28,.34,.49),TEXTURES/'trim/blue.png')
    edge=c.material(N('Blue.Edge'),(.055,.17,.44),emission=.12)
    dark=c.material(N('Socket.Ink'),(.009,.017,.035))
    ivory=c.material(N('Eye.Ivory'),(.69,.91,1),emission=.65)
    iris=c.material(N('Eye.Cobalt'),(.06,.35,.95),emission=.50)
    fit=c.empty(N('Scale.ToContract'),parent=c.root);motion=c.empty(N('Motion'),parent=fit);body=c.empty(N('Body'),parent=motion)
    # Narrow sculpted hull joins a long predatory nose to a pointed dorsal keel.
    hull=[(-.10,.0,2.80),(-.39,.04,1.91),(-.80,.10,1.22),(-.82,.08,.30),(-.58,.02,-.56),(0,-.01,-1.40),(.58,.02,-.56),(.82,.08,.30),(.80,.10,1.22),(.39,.04,1.91),(.10,0,2.80),(0,0,3.00)]
    shell(c,N('Carapace'),hull,hide,body,.27,center=(0,.06,.83),rings=3 if lod==0 else 2)
    # Raised perimeter folds flow into the socket, making the eye part of the hull.
    for sign in [-1,1]:
        fold=[(sign*.04,.05,2.94),(sign*.26,.13,1.85),(sign*.68,.24,1.38),(sign*.63,.27,.75),(sign*.49,.15,.10),(sign*.09,.13,-.98),(sign*.24,.24,.46),(sign*.25,.34,1.22)]
        shell(c,N('Brow.'+str(sign)),fold,plate,body,.07,rings=2 if lod==0 else 1)
        path=catmull([(sign*.02,.07,2.92),(sign*.20,.23,1.85),(sign*.65,.32,1.29),(sign*.65,.28,.82),(sign*.29,.22,.22),(sign*.04,.11,-1.20)],2 if lod==0 else 1)
        tube(c,N('BrowEdge.'+str(sign)),path,.018,edge,body,4)
    # Almond-shaped embedded lens: crown fades into the socket instead of a torus
    # placed over a flat surface. Layered planar rings also survive the far LOD.
    count=24 if lod==0 else 14;zs=1.08;rx=.48;rz=.39
    for label,scale,h,mat in [('EyeSocket',1.28,.00,dark),('EyeRim',1.14,.027,edge),('EyeLens',1.0,.045,ivory)]:
        outline=[]
        for i in range(count):
            t=TAU*i/count;x=rx*math.cos(t)*scale;z=zs+rz*math.sin(t)*scale
            outline.append((x,.265-.40*(z-zs)+h,z))
        shell(c,N(label),outline,mat,body,.10 if label=='EyeLens' else .015,center=(0,.265+h,zs),rings=2 if label=='EyeLens' and lod==0 else 1)
    # Colored iris and narrow vertical slit sit flush on the lens crown.
    for label,rx2,rz2,h,mat in [('Iris',.16,.245,.420,iris),('Pupil',.055,.208,.435,dark),('Catchlight',.032,.065,.449,ivory)]:
        pts=[]
        for i in range(14 if lod==0 else 8):
            t=TAU*i/(14 if lod==0 else 8);x=rx2*math.cos(t)+(-.052 if label=='Catchlight' else 0);z=zs+rz2*math.sin(t)
            pts.append((x,h-.40*(z-zs),z))
        shell(c,N('Eye.'+label),pts,mat,body,.012,rings=1)
    # Swept leading edge uses a continuous spline. Trailing serrations are small
    # hooked notches in the same closed surface, never stacked rectangular steps.
    leading=[(.55,.10,1.66),(1.08,.055,.91),(1.93,.015,.18),(2.90,-.025,-.63),(4.35,-.02,-1.92)]
    trailing=[(3.68,-.015,-1.48),(3.18,.015,-1.16),(3.07,.014,-1.27),(2.91,.025,-1.03),(2.58,.04,-1.00),(2.44,.036,-1.16),(2.22,.047,-.91),(1.92,.05,-.94),(1.61,.053,-1.22),(1.56,.06,-.99),(1.22,.062,-1.14),(.89,.065,-1.40),(.60,.072,-.84)]
    for side,sign in [('L',-1),('R',1)]:
        pivot=c.empty(N('Wing.'+side),(sign*.54,.04,.38),body)
        def local(p):return (sign*(p[0]-.54),p[1]-.04,p[2]-.38)
        outline=list(catmull(leading,3 if lod==0 else 2))+[Vector(p) for p in trailing]
        shell(c,N('Wing.'+side+'.Camber'),[local(p) for p in outline],hide,pivot,.19,center=local((1.55,.07,-.05)),rings=3 if lod==0 else 2)
        # Overlapping, pointed chitin plates follow swept ribs and tuck into shell.
        scales=[[(.62,1.41),(1.00,.76),(1.64,.13),(1.07,.32),(.64,.69)],
                [(1.11,.67),(1.85,.05),(2.58,-.67),(1.96,-.44),(1.39,-.04)],
                [(2.00,-.13),(2.91,-.83),(4.12,-1.79),(3.22,-1.26),(2.52,-.87)],
                [(.66,.64),(1.21,.23),(1.50,-.33),(1.03,-.13),(.64,.05)],
                [(1.22,.11),(1.95,-.38),(2.34,-.96),(1.79,-.80),(1.39,-.47)],
                [(.65,-.01),(1.16,-.24),(1.56,-.93),(1.07,-.75),(.71,-.41)]]
        for i,points in enumerate(scales):
            # Surface height follows the camber; broad tapering scales overlap
            # slightly, rather than floating as little decorative diamonds.
            base=.13 if i<3 else .165
            op=[(x,base+(.06 if x<1.8 else -.02),z) for x,z in points]
            o=shell(c,N(f'Wing.{side}.Scale.{i}'),[local(p) for p in op],plate,pivot,.06,rings=2 if lod==0 else 1)
            # One broken blue edge per scale; the rest is ink-shadow separation.
            if lod==0 or i in [0,2,4]:
                e=[Vector(local((x,base+.058+( .06 if x<1.8 else -.02),z))) for x,z in points[:3]]
                tube(c,N(f'Wing.{side}.Seam.{i}'),e,.013,edge,pivot,3)
        ep=[Vector(local(p)) for p in catmull(leading,3 if lod==0 else 2)]
        tube(c,N('Wing.'+side+'.LeadingRim'),ep,lambda t:.025*(1-t)+.006,edge,pivot,4)
    # Curved, tapering tail surfaces share vertices along their whole length. Three
    # rigid pivots retain the requested three-shard contract; no extra skeleton.
    controls={
        'L':[(-.51,-.015,-.66),(-.83,.02,-1.10),(-1.12,.06,-1.90),(-.83,.02,-2.60),(-.94,.04,-3.10)],
        'C':[(0,-.01,-.84),(.04,.01,-1.35),(-.06,-.005,-2.15),(.06,.04,-2.70),(0,.08,-3.10)],
        'R':[(.51,-.015,-.66),(.90,.03,-1.20),(1.19,.085,-2.08),(.98,.04,-2.75),(1.14,.06,-3.05)]}
    tails=[]
    for label,control in controls.items():
        origin=Vector(control[0]);pivot=c.empty(N('Tail.'+label),origin,body);tails.append(pivot)
        points=[p-origin for p in catmull(control,5 if lod==0 else 3)]
        tube(c,N('Tail.'+label+'.SweptShard'),points,lambda t:.105*(1-t)**1.25+.003,plate,pivot,7 if lod==0 else 5)
        if lod==0:
            pts=[p+Vector((0,.084*(1-i/(len(points)-1))+.008,0)) for i,p in enumerate(points)]
            tube(c,N('Tail.'+label+'.DorsalLine'),pts,lambda t:.013*(1-t)+.002,edge,pivot,3)
    c.socket(N('Core'),(0,.42,1.08),body);c.socket(N('Hitbox.Body'),(0,.04,.48),motion)
    animate(c,N,motion,body,tails)
    return fit

def animate(c,N,motion,body,tails):
    def keys(obj,clip,field,values):c.animate(obj,clip,[{'t':t,field:p} for t,p in values])
    keys(motion,'Glide','position',[(0,[0,0,0]),(.7,[0,.055,0]),(1.4,[0,0,0])])
    for side,sgn in [('L',1),('R',-1)]:keys(bpy.data.objects[N('Wing.'+side)],'Glide','rotation',[(0,[0,0,sgn*.018]),(.7,[0,0,-sgn*.045]),(1.4,[0,0,sgn*.018])])
    for i,p in enumerate(tails):keys(p,'Glide','rotation',[(0,[0,(i-1)*.03,0]),(.7,[0,(1-i)*.04,0]),(1.4,[0,(i-1)*.03,0])])
    keys(motion,'Fade_Out','scale',[(0,[1,1,1]),(.34,[.96,.05,.96])])
    keys(motion,'Silhouette_Hold','scale',[(0,[.96,.05,.96]),(.4,[1,.065,1]),(.8,[.96,.05,.96])])
    keys(motion,'Fade_In','scale',[(0,[.96,.05,.96]),(.3,[1,1,1])])
    keys(c.root,'Dash','position',[(0,[0,0,0]),(.08,[0,0,.25]),(.3,[0,0,3.6])])
    keys(motion,'Hit','rotation',[(0,[0,0,0]),(.1,[0,0,.20]),(.25,[0,0,-.075]),(.5,[0,0,0])])
    keys(motion,'Dissolve','scale',[(0,[1,1,1]),(.4,[.75,.1,.75]),(.8,[.01,.01,.01])])

def studio(roots):
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
    scene.render.resolution_x=1100;scene.render.resolution_y=820;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Neutral Blue Studio');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.10,.125,.17,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
    for name,pos,power,size in [('Key',(0,-8,12),1900,9),('Fill',(-8,-3,6),1200,8),('Rim',(3,7,9),1800,6)]:
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
    d=bpy.data.cameras.new('QA.Camera');cam=bpy.data.objects.new('QA.Camera',d);scene.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=10.4
    scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast' if 'Medium High Contrast' in [i.identifier for i in scene.view_settings.bl_rna.properties['look'].enum_items] else 'None'
    return scene,cam

def render(scene,cam,contexts,lod,view,clip=None,time=0):
    for i,c in enumerate(contexts):
        c.rest_pose()
        for o in [c.root,*c.root.children_recursive]:o.hide_render=i!=lod
    if clip:
        for o in [contexts[lod].root,*contexts[lod].root.children_recursive]:
            if o.animation_data:
                for tr in o.animation_data.nla_tracks:tr.mute=tr.name!=clip
    scene.frame_set(1+int(time*30),subframe=time*30-int(time*30));bpy.context.view_layer.update()
    directions={'front':Vector((1.0,-1.5,1.85)),'top':Vector((0,0,3)),'rear':Vector((-1,1.6,1.65)),'side':Vector((2,-1,.55))}
    target=Vector((0,0,0));cam.location=target+directions[view]*6;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    if clip=='Dash':cam.location.y-=1.8;target.y-=1.8;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/(f'LOD{lod}-{view}'+(f'-{clip}' if clip else '')+'.png'));bpy.ops.render.render(write_still=True)

def main():
    bpy.ops.wm.read_factory_settings(use_empty=True);contexts=[];sizes=[]
    for lod in range(2):
        c=Context(REQ);c.root.name=f'LOD{lod}';c.root['lod']=lod;fit=build(REQ,c,lod);c.rest_pose()
        lo,hi=mesh_bounds(c.root);sz=hi-lo;fit.scale=(8.7/sz.x,6.1/sz.y,.9/sz.z);bpy.context.view_layer.update();lo,hi=mesh_bounds(c.root);sizes.append([hi.x-lo.x,hi.z-lo.z,hi.y-lo.y]);contexts.append(c)
    for c in contexts:c.rest_pose()
    triangles=[count_triangles(c.root) for c in contexts];print('PHASE GEOMETRY',sizes,triangles,flush=True)
    scene,cam=studio([c.root for c in contexts]);scene.render.fps=30
    for lod in range(2):
        for view in ['front','top','rear','side']:render(scene,cam,contexts,lod,view)
    for clip,t in [('Glide',.7),('Fade_Out',.34),('Silhouette_Hold',.4),('Fade_In',.20),('Dash',.3),('Hit',.10),('Dissolve',.4)]:render(scene,cam,contexts,0,'front',clip,t)
    for c in contexts:
        c.rest_pose()
        for o in [c.root,*c.root.children_recursive]:o.hide_render=False
    scene.frame_set(1);bpy.context.view_layer.update();bpy.ops.object.select_all(action='DESELECT')
    for c in contexts:
        for o in [c.root,*c.root.children_recursive]:o.select_set(True)
    raw=OUT/'phaseSkate-uncompressed.glb';final=OUT/'phaseSkate.glb'
    bpy.ops.export_scene.gltf(filepath=str(raw),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_extras=True,export_apply=True,export_materials='EXPORT',export_yup=True)
    subprocess.run([shutil.which('node'),str(HERE/'compress.mjs'),str(raw),str(final),'--force'],check=True)
    for o in [contexts[1].root,*contexts[1].root.children_recursive]:o.hide_render=True
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'phaseSkate.blend'),compress=True)
    record={'request':'M-018','name':'Phase Skate','file':str(final.relative_to(ROOT)),'preview':str((OUT/'LOD0-front.png').relative_to(ROOT)),'category':'enemy','region':'blue','source':'hopper/3d/models/source/phase_skate_refine.py','bounds':sizes[0],'targetBounds':[8.7,.9,6.1],'triangles':triangles,'clips':REQ['clips'],'sockets':REQ['sockets'],'landings':[],'status':'candidate-awaiting-root-review','sourceReference':REQ['reference'],'notes':'Sculpted cambered manta with swept serrated wings, embedded eye and three continuous tapered tail meshes. Both LODs authored from shared curves; fade silhouettes use vertical collapse while gameplay owns visibility/hitbox.'}
    (OUT/'record.json').write_text(json.dumps(record,indent=2)+'\n');(OUT/'manifest.json').write_text(json.dumps({'version':1,'models':[record]},indent=2)+'\n')
    print('PHASE COMPLETE',json.dumps(record),flush=True)
if __name__=='__main__':main()

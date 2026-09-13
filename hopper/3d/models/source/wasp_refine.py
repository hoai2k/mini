"""M-014 Turbine Wasp: refine the reviewed mechanical draft's organic armor.

Run Blender -b --python hopper/3d/models/source/wasp_refine.py.
Keeps the 3 fan pivots/intake/2 legs and clip contract, replaces flat helmet/body,
seats lens patches on the actual helmet surface, and sweeps thick thorn armor.
Only writes local/hopper-wasp-refine; does not publish or edit shared manifests.
"""
import bpy,bmesh,math,json,sys,shutil,subprocess
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from common import Context,ROOT,TEXTURES,v
import turbine_wasp as tw
from phase_skate_refine import catmull,tube
OUT=ROOT/'local/hopper-wasp-refine';OUT.mkdir(parents=True,exist_ok=True)

def normals(o):
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free()
    for p in o.data.polygons:p.use_smooth=True
    return o

def loft(c,name,controls,mat,parent,steps=3,sides=18):
    sections=catmull(controls,steps);verts=[];faces=[]
    for z,rx,ry,cy in sections:
        for i in range(sides):
            a=math.tau*i/sides;verts.append((rx*math.cos(a),cy+ry*math.sin(a),z))
    for k in range(len(sections)-1):
        for i in range(sides):j=(i+1)%sides;faces.append((k*sides+i,k*sides+j,(k+1)*sides+j,(k+1)*sides+i))
    faces.extend([tuple(reversed(range(sides))),tuple((len(sections)-1)*sides+i for i in range(sides))])
    o=normals(c.mesh(name,verts,faces,mat,parent))
    for p in o.data.polygons:
        for li in p.loop_indices:
            ix=o.data.loops[li].vertex_index;o.data.uv_layers.active.data[li].uv=((ix%sides)/sides,(ix//sides)/(len(sections)-1))
    def point(z,a):
        z=max(sections[0][0],min(sections[-1][0],z));i=next((i for i in range(len(sections)-1) if sections[i+1][0]>=z),len(sections)-2);u=(z-sections[i][0])/(sections[i+1][0]-sections[i][0]);q=sections[i].lerp(sections[i+1],u)
        return Vector((q[1]*math.cos(a),q[3]+q[2]*math.sin(a),z))
    def surface(z,a,offset=0):
        p=point(z,a);dtheta=point(z,a+.001)-point(z,a-.001);dz=point(z+.001,a)-point(z-.001,a);n=dtheta.cross(dz).normalized()
        return p+n*offset,n
    return surface

def patch(c,name,surf,zc,ac,zradius,aradius,mat,parent,offset=.025,crown=.045,n=18,shape=1):
    # All ring points are sampled from the underlying loft; no floating planar eye.
    verts=[]
    for radius in [1,.5]:
        for i in range(n):
            t=math.tau*i/n;z=zc+zradius*math.sin(t)*radius;a=ac+aradius*math.cos(t)*radius
            if shape!=1:a=ac+aradius*math.cos(t)*abs(math.cos(t))**shape*radius
            p,normal=surf(z,a,offset+crown*(1-radius));verts.append(tuple(p))
    p,_=surf(zc,ac,offset+crown);verts.append(tuple(p));faces=[]
    for i in range(n):j=(i+1)%n;faces.extend([(i,j,n+j,n+i),(n+i,n+j,2*n)])
    o=normals(c.mesh(name,verts,faces,mat,parent));return o

def refine(c):
    # glTF's frame bake truncates fractional NLA endpoints. Author on complete
    # frames so Dash reaches 4.2 m and Hit/Dissolve include their exact final pose.
    animate=c.animate
    def on_frames(obj,clip,frames):
        animate(obj,clip,[dict(k,t=math.ceil(k['t']*30-1e-6)/30) for k in frames])
    c.animate=on_frames
    fit=tw.build_silhouette(c);body=bpy.data.objects['Body'];head=bpy.data.objects['Head']
    # Preserve mechanisms and authoritative pivots; remove only superseded skins.
    for o in list(body.children_recursive):
        if o.type=='MESH' and (o.name in ['Thorax.Shell','Head.Helmet','Head.Beak','Head.Crest'] or o.name.startswith('Eye.') or o.name.startswith('Thorax.Dorsal.')):bpy.data.objects.remove(o,do_unlink=True)
    slate=c.material('Wasp.SculptedSlate',(.34,.27,.44),TEXTURES/'trim/violet.png')
    hide='Wasp.PaintedHide';dark='Wasp.CharcoalShell';violet='Wasp.VioletEdge';ink='Wasp.Ink'
    ivory=c.material('Wasp.LensIvory',(.78,.68,.40),emission=.055)
    iris=c.material('Wasp.IrisAmber',(.17,.11,.04))
    # Broad shoulders taper into the abdomen. Slight vertical shift gives the
    # creature a sloping insect back instead of a straight polygonal fuselage.
    thorax=loft(c,'Thorax.CarvedShell',[(-1.30,.36,.32,-.02),(-.90,.72,.57,.02),(-.15,1.00,.73,.05),(.57,.89,.68,.02),(1.13,.64,.53,-.04),(1.44,.40,.34,-.10)],hide,body,2,16)
    # Narrow hooked rostrum, high forehead, tapered cheeks; the same surface
    # function defines the eyes so their sockets can never detach from the face.
    helmet=loft(c,'Head.CarvedHelmet',[(.05,.59,.50,.04),(.50,.70,.63,.045),(1.06,.60,.57,-.01),(1.62,.38,.41,-.10),(2.06,.18,.22,-.19),(2.52,.009,.015,-.29)],dark,head,2,18)
    for side,a in [('R',.31*math.pi),('L',.69*math.pi)]:
        patch(c,f'Eye.{side}.Socket',helmet,1.19,a,.64,.43,ink,head,.015,.017,14)
        patch(c,f'Eye.{side}.Bevel',helmet,1.19,a,.607,.40,violet,head,.032,.030,16)
        patch(c,f'Eye.{side}.Lens',helmet,1.19,a,.55,.35,ivory,head,.041,.052,18)
        patch(c,f'Eye.{side}.Iris',helmet,1.20,a,.175,.105,iris,head,.096,.017,10)
        patch(c,f'Eye.{side}.Pupil',helmet,1.20,a,.136,.045,ink,head,.112,.004,8)
        patch(c,f'Eye.{side}.Glint',helmet,1.27,a-.035,.034,.025,ivory,head,.124,.002,6)
        # Swept eyebrows are thick shell patches, not fins standing off the head.
        patch(c,f'Head.Brow.{side}',helmet,.65,a,.44,.47,slate,head,.033,.045,12)
    # A broad carapace ridge lies between the eyes and flows into the beak tip.
    patch(c,'Head.CentralKeel',helmet,1.10,math.pi/2,1.20,.13,slate,head,.030,.045,14)
    # Overlapping saddle armor wraps the thorax in chevrons; thickness is graded
    # into each lapped seam. The crest is a row of swept cones, not a flat board.
    for row,z in enumerate([-.68,-.12,.46]):
        for col,a in enumerate([math.pi*.24,math.pi*.50,math.pi*.76]):
            patch(c,f'Thorax.Chitin.{row}.{col}',thorax,z,a,.41,.40,slate if (row+col)%2==0 else hide,body,.040,.085,8)
    for i,(z,height) in enumerate([(-.62,.52),(-.05,.76),(.49,.45)]):
        p,_=thorax(z,math.pi/2,.04)
        points=catmull([tuple(p),tuple(p+Vector((0,height*.35,-.08))),tuple(p+Vector((0,height*.75,-.25))),tuple(p+Vector((0,height,-.57)))],3)
        tube(c,f'Thorax.SweptThorn.{i}',points,lambda t:.19*(1-t)**1.1+.006,slate,body,6)
    for side,sign in [('L',-1),('R',1)]:
        for i,z in enumerate([-.66,-.13,.34]):
            p,_=thorax(z,math.pi*.90 if sign<0 else math.pi*.10,.015)
            points=catmull([tuple(p),tuple(p+Vector((sign*.28,.14,-.23))),tuple(p+Vector((sign*.55,.20,-.64)))],1)
            tube(c,f'Thorax.FlankSpine.{side}.{i}',points,lambda t:.13*(1-t)+.003,slate,body,6)
    # Paint UVs stay on a restrained violet rock band; the source generated image
    # remains embedded, with no synthetic substitute texture artwork.
    for o in body.children_recursive:
        if o.type=='MESH' and any(m.name=='Wasp.SculptedSlate' for m in o.data.materials):
            for p in o.data.polygons:
                for ix in p.loop_indices:
                    co=o.data.vertices[o.data.loops[ix].vertex_index].co;o.data.uv_layers.active.data[ix].uv=(.35+co.x*.13,.92+(co.y*.025)% .045)
    # Keep the third lobe visibly below the abdomen and spin continuously for the
    # whole Hover cycle (the draft stopped its rotor after the first 0.28 seconds).
    bpy.data.objects['Fan.Tail'].location.z=-.91
    for name in ['Fan.L','Fan.R','Fan.Tail']:
        fan=bpy.data.objects[name]
        for tr in list(fan.animation_data.nla_tracks):
            if tr.name=='Hover':fan.animation_data.nla_tracks.remove(tr)
        c.animate(fan,'Hover',[{'t':i/30,'rotation':[0,0,math.tau*4*(i/33)]} for i in range(34)])
    return fit

def lod_copy(c):
    lod=c.root.copy();lod.name='LOD1';bpy.context.collection.objects.link(lod);lod['lod']=1;copies={c.root:lod}
    for o in c.root.children_recursive:
        q=o.copy();q.name='LOD1.'+o.name
        if o.type=='MESH':q.data=o.data.copy()
        bpy.context.collection.objects.link(q);copies[o]=q
    for o,q in list(copies.items())[1:]:
        q.parent=copies.get(o.parent,lod)
        if q.type!='MESH':continue
        q.data.calc_loop_triangles()
        if len(q.data.loop_triangles)<=8:continue
        if o.name.endswith('.FrontLip'):
            # Rebuild a regular 12-sided rim; arbitrary decimation makes the thin
            # torus look jagged and star-shaped even with a higher triangle count.
            radius=.91 if 'Fan.Tail' in o.name else 1.12
            major=radius*.85;minor=radius*.068;verts=[];faces=[]
            for i in range(12):
                a=math.tau*i/12
                for j in range(3):
                    b=math.tau*j/3;r=major+minor*math.cos(b);verts.append((r*math.cos(a),r*math.sin(a),minor*math.sin(b)))
            for i in range(12):
                for j in range(3):faces.append((i*3+j,((i+1)%12)*3+j,((i+1)%12)*3+(j+1)%3,i*3+(j+1)%3))
            me=bpy.data.meshes.new(q.name+'.regular');me.from_pydata(verts,[],faces);me.update()
            for mat in q.data.materials:me.materials.append(mat)
            q.data=me;continue
        ratio=.48 if o.name.startswith('Eye.') else (.40 if o.name.endswith('.Housing') else .30)
        bpy.context.view_layer.objects.active=q;q.select_set(True);mod=q.modifiers.new('Preserve rounded eye and swept silhouette','DECIMATE');mod.ratio=ratio;bpy.ops.object.modifier_apply(modifier=mod.name);q.select_set(False)
    return lod

def rest(roots,saved):
    for root in roots:
        for o in [root,*root.children_recursive]:
            if o.animation_data:
                o.animation_data.action=None
                for tr in o.animation_data.nla_tracks:tr.mute=True
    for o,(p,r,s) in saved.items():o.location=p;o.rotation_euler=r;o.scale=s
    bpy.context.view_layer.update()

def studio():
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.render.fps=30
    scene.render.resolution_x=1100;scene.render.resolution_y=820;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Wasp QA');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.13,.14,.18,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
    for name,p,energy,size in [('Key',(2,-9,11),1700,8),('Fill',(-8,-3,7),1100,8),('Rim',(1,9,9),1500,7)]:
        d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=p;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
    d=bpy.data.cameras.new('QA.Camera');cam=bpy.data.objects.new('QA.Camera',d);scene.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=10.1
    scene.view_settings.view_transform='Standard';return scene,cam

def render(scene,cam,roots,saved,lod,view,clip=None,t=0):
    rest(roots,saved)
    for i,root in enumerate(roots):
        for o in [root,*root.children_recursive]:
            o.hide_render=i!=lod
            if i==lod and clip and o.animation_data:
                for tr in o.animation_data.nla_tracks:tr.mute=tr.name!=clip
    scene.frame_set(1+int(t*30),subframe=t*30-int(t*30));bpy.context.view_layer.update()
    direction={'front':(0,-2,.50),'three-quarter':(1.2,-2,1.05),'side':(2,0,.65),'top':(0,-.10,3)}[view]
    target=Vector((0,-.20,0));cam.location=target+Vector(direction)*6;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    if clip=='Dash':cam.location.y-=2.1;target.y-=2.1;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/(f'LOD{lod}-{view}'+(f'-{clip}' if clip else '')+'.png'));bpy.ops.render.render(write_still=True)

def main():
    bpy.ops.wm.read_factory_settings(use_empty=True);c=Context(tw.REQ);refine(c);c.rest_pose();bpy.context.scene.frame_set(1);bounds=tw.fit_to_contract(c);lod1=lod_copy(c);roots=[c.root,lod1];saved={o:(o.location.copy(),o.rotation_euler.copy(),o.scale.copy()) for r in roots for o in [r,*r.children_recursive]};tris=[tw.count_triangles(r) for r in roots];print('WASP REFINED GEOMETRY',bounds,tris,flush=True)
    scene,cam=studio()
    for lod in range(2):
        for view in ['front','three-quarter','side','top']:render(scene,cam,roots,saved,lod,view)
    for lod in range(2):
        for clip,t in [('Hover',.15),('Intake_Tell',.28),('Dash',.26),('Guard_Break',.55),('Hit',.10),('Dissolve',.45)]:render(scene,cam,roots,saved,lod,'three-quarter',clip,t)
    rest(roots,saved);scene.frame_set(1);bpy.context.view_layer.update();bpy.ops.object.select_all(action='DESELECT')
    for r in roots:
        for o in [r,*r.children_recursive]:o.hide_render=False;o.select_set(True)
    raw=OUT/'turbineWasp-uncompressed.glb';final=OUT/'turbineWasp.glb'
    bpy.ops.export_scene.gltf(filepath=str(raw),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_extras=True,export_apply=True,export_materials='EXPORT',export_yup=True)
    subprocess.run([shutil.which('node'),str(HERE/'compress.mjs'),str(raw),str(final),'--force'],check=True)
    rest(roots,saved);scene.frame_set(1);bpy.context.view_layer.update()
    for o in [lod1,*lod1.children_recursive]:o.hide_render=True
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'turbineWasp.blend'),compress=True)
    record={'request':'M-014','name':'Turbine Wasp','file':str(final.relative_to(ROOT)),'preview':str((OUT/'LOD0-three-quarter.png').relative_to(ROOT)),'source':'hopper/3d/models/source/wasp_refine.py','category':'enemy','region':'launchworks','bounds':bounds,'targetBounds':tw.REQ['size'],'triangles':tris,'clips':tw.REQ['clips'],'sockets':tw.REQ['sockets'],'landings':[],'status':'candidate-awaiting-root-review','sourceReference':'design/references/enemies/turbineWasp-turnaround.png'}
    (OUT/'record.json').write_text(json.dumps(record,indent=2)+'\n');(OUT/'manifest.json').write_text(json.dumps({'version':1,'models':[record]},indent=2)+'\n');print('WASP REFINED DONE',json.dumps(record),flush=True)
if __name__=='__main__':main()

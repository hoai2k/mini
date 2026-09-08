"""Blender authoring helpers. Public coordinates are glTF +Y up, +Z forward.
Generated painted trim/terrain sources are embedded; no procedural substitute art.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[4]
TEXTURES=ROOT/'hopper/3d/textures'
def v(p):return Vector((p[0],-p[2],p[1]))
def rotation(p):return (p[0],-p[2],p[1])
class Context:
 def __init__(self,req):
  self.req=req;self.region=req.get('region','city');self.materials={};self.bands={};self.landings=[];self.clips=set();self.sockets=[]
  self.root=bpy.data.objects.new('LOD0',None);bpy.context.collection.objects.link(self.root)
  self.root['request']=req['request'];self.root['standIn']=req['standIn'];self.root['lod']=0
  self.setup_materials()
 def setup_materials(self):
  r=self.region if (TEXTURES/'trim'/f'{self.region}.png').exists() else 'city'
  trim=TEXTURES/'trim'/f'{r}.png';stone=TEXTURES/'terrain'/r/'cliff.png'
  colors={'base':(.9,.88,.8),'stone':(.8,.8,.8),'metal':(.6,.61,.59),'dark':(.19,.22,.25),'ivory':(.93,.88,.72),'red':(.63,.16,.085),'gold':(.78,.51,.16),'glass':(.2,.67,.68),'glow':(.2,.9,1),'shadow':(.16,.13,.23),'core':(.7,.17,1),'wood':(.44,.29,.14),'foliage':(.28,.4,.12)}
  for key,col in colors.items():
   tex=stone if key=='stone' else TEXTURES/'creatures/shadow-hide.png' if key=='shadow' else trim if key in ('base','metal','dark','ivory','glass','wood') else None
   if key in ('ivory','glass'):tex=TEXTURES/'trim/city.png'
   self.material(key,col,tex,1.7 if key in ('glow','core') else 0)
   if tex and Path(tex).parent.name=='trim':self.bands[key]={'base':(.025,.115),'metal':(.165,.085),'dark':(.165,.085),'ivory':(.025,.115),'glass':(.295,.075),'wood':(.025,.115)}[key]
   if r=='fields' and key=='base':self.bands[key]=(.42,.065)
   if key=='wood':self.bands[key]=(.16,.075)
 def material(self,name,color,texture=None,emission=0):
  m=bpy.data.materials.new(name);m.diffuse_color=tuple(color[:3])+(1,);m.use_nodes=True
  n=m.node_tree.nodes;bs=n.get('Principled BSDF');bs.inputs['Base Color'].default_value=tuple(color[:3])+(1,);bs.inputs['Roughness'].default_value=.88;bs.inputs['Metallic'].default_value=0;bs.inputs['Specular IOR Level'].default_value=.12
  if texture:
   path=Path(texture);path=path if path.is_absolute() else ROOT/path
   if path.exists():
    im=bpy.data.images.load(str(path),check_existing=True)
    if im.size[0]>1024:im.scale(1024,1024)
    im.pack();t=n.new('ShaderNodeTexImage');t.image=im;t.interpolation='Linear';mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=tuple(color[:3])+(1,);m.node_tree.links.new(t.outputs['Color'],mix.inputs[1]);m.node_tree.links.new(mix.outputs[0],bs.inputs['Base Color'])
  if emission:bs.inputs['Emission Color'].default_value=tuple(color[:3])+(1,);bs.inputs['Emission Strength'].default_value=emission
  self.materials[name]=m;return name
 def finish(self,o,name,mat,parent):
  o.name=name;o.parent=parent or self.root
  o.data.materials.clear();o.data.materials.append(self.materials[mat] if isinstance(mat,str) else mat)
  if not o.data.uv_layers:
   uv=o.data.uv_layers.new(name='UVMap')
   for poly in o.data.polygons:
    normal=poly.normal;axis=max(range(3),key=lambda i:abs(normal[i]));inds=[i for i in range(3) if i!=axis]
    coords=[o.data.vertices[o.data.loops[l].vertex_index].co for l in poly.loop_indices]
    lo=[min(co[i] for co in coords) for i in inds];hi=[max(co[i] for co in coords) for i in inds]
    for li,co in zip(poly.loop_indices,coords):uv.data[li].uv=tuple((co[i]-a)/max(b-a,.001) for i,a,b in zip(inds,lo,hi))
  band=self.bands.get(mat)
  if band:
   for uv in o.data.uv_layers.active.data:uv.uv.y=band[0]+uv.uv.y*band[1]
  return o
 def box(self,name,pos,size,mat='base',bevel=0,parent=None):
  bpy.ops.mesh.primitive_cube_add(size=1,location=v(pos));o=bpy.context.object;o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  if bevel:
   mod=o.modifiers.new('Edge chamfers','BEVEL');mod.width=min(bevel,min(size)*.15);mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name)
  while o.data.uv_layers:o.data.uv_layers.remove(o.data.uv_layers[0])
  return self.finish(o,name,mat,parent)
 def cyl(self,name,pos,radius,height,mat='metal',vertices=12,top_radius=None,parent=None):
  bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=radius,radius2=radius if top_radius is None else top_radius,depth=height,location=v(pos));return self.finish(bpy.context.object,name,mat,parent)
 def sphere(self,name,pos,size,mat='base',segments=12,rings=8,parent=None):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=.5,location=v(pos));o=bpy.context.object;o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  for p in o.data.polygons:p.use_smooth=True
  return self.finish(o,name,mat,parent)
 def torus(self,name,pos,radius,tube,mat='metal',axis='y',parent=None):
  bpy.ops.mesh.primitive_torus_add(major_radius=radius,minor_radius=tube,major_segments=16,minor_segments=4,location=v(pos));o=bpy.context.object
  if axis=='z':o.rotation_euler.x=math.pi/2
  elif axis=='x':o.rotation_euler.y=math.pi/2
  return self.finish(o,name,mat,parent)
 def beam(self,name,a,b,width,mat='metal',parent=None):
  a,b=v(a),v(b);bpy.ops.mesh.primitive_cube_add(size=1,location=(a+b)/2);o=bpy.context.object;o.scale=(width,width,(b-a).length);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return self.finish(o,name,mat,parent)
 def mesh(self,name,verts,faces,mat='base',parent=None):
  me=bpy.data.meshes.new(name);me.from_pydata([v(p) for p in verts],[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);return self.finish(o,name,mat,parent)
 def empty(self,name,pos=(0,0,0),parent=None):
  o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=v(pos);o.parent=parent or self.root;return o
 def socket(self,name,pos,parent=None):
  o=self.empty(name,pos,parent);o['socket']=True;self.sockets.append(name);return o
 def animate(self,obj,clip,frames):
  original=(obj.location.copy(),obj.rotation_euler.copy(),obj.scale.copy());obj.animation_data_create();obj.animation_data.action=None
  for key in frames:
   frame=1+key['t']*30
   for field,prop,convert in [('position','location',v),('rotation','rotation_euler',rotation),('scale','scale',lambda p:(p[0],p[2],p[1]))]:
    if field in key:setattr(obj,prop,convert(key[field]));obj.keyframe_insert(data_path=prop,frame=frame)
  act=obj.animation_data.action
  if act:
   act.name=clip+'__'+obj.name;track=obj.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,act);track.mute=True;obj.animation_data.action=None;self.clips.add(clip)
  obj.location,obj.rotation_euler,obj.scale=original
 def rest_pose(self):
  for obj in [self.root,*self.root.children_recursive]:
   data=obj.animation_data
   if not data:continue
   data.action=None;data.use_nla=True
   for track in data.nla_tracks:track.is_solo=False;track.mute=True

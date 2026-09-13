"""Re-render a bounded clip from the existing Leech blend without re-exporting."""
import bpy,sys
from pathlib import Path
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE));import spire_leech_refine as ref
bpy.ops.wm.open_mainfile(filepath=str(ref.OUT/'spireLeech.blend'))
roots=[bpy.data.objects['LOD0'],bpy.data.objects['LOD1']];arms=[bpy.data.objects['Rig'],bpy.data.objects['LOD1.Rig']];saved=ref.sl.capture_transforms();scene=bpy.context.scene;cam=scene.camera
clips=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['Dissolve']
for lod in range(2):
 for clip in clips:
  for phase in [0,.5,1]:ref.render(scene,cam,roots,arms,saved,lod,'three-quarter',clip,phase)
ref.rest(roots,arms,saved)

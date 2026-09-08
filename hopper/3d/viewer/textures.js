import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {REGIONS,makeTexture,makeSkyDome,makeHorizon,makeHopperProxy} from '../standins/src/index.js';
const $=id=>document.getElementById(id),loader=new T.TextureLoader(),scene=new T.Scene(),renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));$('world').append(renderer.domElement);
const camera=new T.PerspectiveCamera(55,1,.5,20000);camera.position.set(165,110,195);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,15,0);controls.maxDistance=1400;
scene.add(new T.HemisphereLight(0xffffff,0x576052,2));const sun=new T.DirectionalLight(0xffefd2,2);sun.position.set(300,400,-500);scene.add(sun);
const proxy=makeHopperProxy();proxy.position.set(15,1,20);scene.add(proxy);
const plane=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshToonMaterial({color:0xffffff}));plane.rotation.x=-Math.PI/2;scene.add(plane);
let sky,horizon,painted=true,version=0,extra=[];
const base='../textures/',painter={fields:'grass',city:'ivory',mountains:'rock',foundry:'iron',harbor:'wetSteel',launchworks:'rust',red:'coral',blue:'reef',violet:'obsidian'};
for(const r of REGIONS)$('region').add(new Option(r.name,r.id));$('region').value=new URLSearchParams(location.search).get('region')||'fields';
function dispose(o){if(!o)return;scene.remove(o);o.traverse(n=>{n.geometry?.dispose();if(n.material){n.material.map?.dispose();n.material.dispose();}});}
async function update(){$('skyquality').textContent='Load full KTX2 sky';window.__ready=false;plane.material.map?.dispose();const v=++version,r=REGIONS.find(x=>x.id===$('region').value),s=$('surface').value;dispose(sky);dispose(horizon);sky=makeSkyDome(r);scene.add(sky);scene.background=new T.Color(r.sky);
if(painted){const texture=await loader.loadAsync(base+`sky/${r.id}-preview.jpg`);if(v!==version)return;texture.colorSpace=T.SRGBColorSpace;sky.material.map.dispose();sky.material.map=texture;sky.material.needsUpdate=true;horizon=new T.Group();scene.add(horizon);
await Promise.all(Array.from({length:16},async(_,i)=>{const ring=Math.floor(i/8),n=i%8;if(n===2)return;const tex=await loader.loadAsync(base+`horizon/${r.id}-${ring}-${n}.png`);if(v!==version){tex.dispose();return;}tex.colorSpace=T.SRGBColorSpace;const radius=ring?6750:5000,a=n/8*Math.PI*2,card=new T.Mesh(new T.PlaneGeometry(radius*.84,radius*.21),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:T.DoubleSide}));card.position.set(Math.cos(a)*radius,radius*.105-150,Math.sin(a)*radius);card.lookAt(0,card.position.y,0);horizon.add(card);}));
const file=s==='all surfaces'?`terrain/${r.id}/ground.png`:s==='trim'?`trim/${r.id}.png`:s==='shadow-hide'?'creatures/shadow-hide.png':`terrain/${r.id}/${s}.png`,tex=await loader.loadAsync(base+file);if(v!==version)return;tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(6,6);tex.anisotropy=renderer.capabilities.getMaxAnisotropy();plane.material.map=tex;
}else{horizon=makeHorizon(r,{gap:{angle:Math.PI/2,halfWidth:.28}});scene.add(horizon);plane.material.map=makeTexture(s==='shadow-hide'?'shadow':painter[r.id],{repeat:6}).clone();}
for(const p of extra){scene.remove(p);p.geometry.dispose();p.material.map.dispose();p.material.dispose();}extra=[];
plane.position.set(0,0,0);
if(s==='all surfaces'){
plane.position.set(-110,0,-110);camera.position.set(470,360,470);controls.target.set(0,0,0);
for(const [i,role] of ['cliff','path','trim'].entries()){
const tex=painted?await loader.loadAsync(base+(role==='trim'?`trim/${r.id}.png`:`terrain/${r.id}/${role}.png`)):makeTexture(painter[r.id],{repeat:6}).clone();tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(6,6);tex.anisotropy=renderer.capabilities.getMaxAnisotropy();const p=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshToonMaterial({map:tex}));p.rotation.x=-Math.PI/2;p.position.set(i===0?110:i===1?-110:110,0,i===0?-110:110);scene.add(p);extra.push(p);
}
}else{camera.position.set(165,110,195);controls.target.set(0,15,0);}
plane.material.needsUpdate=true;$('compare').textContent=painted?'Show stand-in':'Show paintings';history.replaceState(null,'','?region='+r.id);gallery(r);$('status').textContent=`Rendered: ${r.id} / ${s} / ${painted?'painted':'stand-in'} · 200 m surface · 6 × repeat · drag to orbit`;window.__ready=true;}
function gallery(r){const files=[`sky/${r.id}-preview.jpg`,...['ground','cliff','path','splat'].map(s=>`terrain/${r.id}/${s}.png`),`trim/${r.id}.png`,`trim/${r.id}-emissive.png`,...Array.from({length:8},(_,i)=>`horizon/${r.id}-0-${i}.png`),'creatures/shadow-hide.png','creatures/shadow-hide-emissive.png','ui/landing-guide.png','ui/lock-on.png','ui/lock-on-locked.png','ui/icons-3d.png','ui/signals.png',...['laser-impact','kick-spark','stomp-shockwave','thermal-motes','wind-streaks','gravity','gravity-seam'].map(x=>`effects/${x}.png`)];$('gallery').replaceChildren(...files.map(file=>{const f=document.createElement('figure'),img=new Image(),c=document.createElement('figcaption');img.src=base+file;img.loading='lazy';img.alt=file;c.textContent=file;img.onclick=()=>{$('lightbox').style.display='grid';$('lightbox').firstElementChild.src=img.src;};f.append(img,c);return f;}));}
$('lightbox').onclick=()=>{$('lightbox').style.display='none';};$('region').onchange=$('surface').onchange=()=>update().catch(report);$('compare').onclick=()=>{painted=!painted;update().catch(report);};function report(e){$('error').textContent=e.message;console.error(e);}
$('skyquality').onclick=async()=>{try{const k=new KTX2Loader().setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/libs/basis/').detectSupport(renderer);const tex=await k.loadAsync(base+'sky/'+$('region').value+'.ktx2');sky.material.map.dispose();sky.material.map=tex;sky.material.needsUpdate=true;k.dispose();$('skyquality').textContent='8192 × 4096 KTX2 loaded';}catch(e){report(e);}};
function resize(){const w=$('world').clientWidth,h=$('world').clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});update().catch(report);

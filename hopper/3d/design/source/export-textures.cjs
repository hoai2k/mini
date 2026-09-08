/* Deterministic finishing of imagegen paintings. Raw paintings stay in local/. */
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const root = path.resolve(__dirname, '../../../..');
const work = path.join(root, 'local/hopper-3d-textures');
const out = path.join(root, 'hopper/3d/textures');
const png = {compressionLevel:9, palette:true, colours:256, dither:0.15};
const hex = s => s.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16));
async function save(data,w,h,file,channels=4) {
  await fs.mkdir(path.dirname(file),{recursive:true});
  await sharp(data,{raw:{width:w,height:h,channels}}).png(png).toFile(file);
}
// Join opposing borders without mirroring the full painting. Interior remains untouched.
function seam(data,w,h,vertical=true,band=0.04) {
  const original=Buffer.from(data), bx=Math.max(2,Math.round(w*band));
  for(let y=0;y<h;y++) for(let x=0;x<bx;x++) for(let c=0;c<3;c++) {
    const a=(y*w+x)*4+c,b=(y*w+w-1-x)*4+c,t=(1-x/(bx-1))**2;
    const mean=(original[a]+original[b])/2;
    data[a]=Math.round(original[a]*(1-t)+mean*t); data[b]=Math.round(original[b]*(1-t)+mean*t);
  }
  if(vertical) {
    const copy=Buffer.from(data),by=Math.max(2,Math.round(h*band));
    for(let y=0;y<by;y++) for(let x=0;x<w;x++) for(let c=0;c<3;c++) {
      const a=(y*w+x)*4+c,b=((h-1-y)*w+x)*4+c,t=(1-y/(by-1))**2,m=(copy[a]+copy[b])/2;
      data[a]=Math.round(copy[a]*(1-t)+m*t);data[b]=Math.round(copy[b]*(1-t)+m*t);
    }
  }
  return data;
}
async function main(){
 const regions=JSON.parse(await fs.readFile(path.join(work,'regions.json')));
 const jobs=JSON.parse(await fs.readFile(path.join(work,'jobs.json')));
 let records=[]; try {records=JSON.parse(await fs.readFile(path.join(out,"paintings.json")));}catch{}
 for(const job of jobs){
  if(process.env.ONLY && !job.id.includes(process.env.ONLY))continue;
  if(!process.env.ONLY && records.some(r=>r.id===job.id))continue;
  const source=path.join(work,job.id.startsWith('horizon-')?'clean':'sources',job.id+'.png');
  try {await fs.access(source);} catch {continue;}
  const meta=await sharp(source).metadata();
  const record={id:job.id,sourceSize:[meta.width,meta.height],prompt:job.prompt,outputs:[]};
  const emit=async(data,w,h,file)=>{await save(data,w,h,path.join(out,file));record.outputs.push(file);};
  if(job.id.startsWith('terrain-')||job.id==='shadow-hide'){
    const [_,region,role]=job.id.split('-');
    const file=job.id==='shadow-hide'?'creatures/shadow-hide.png':`terrain/${region}/${role}.png`;
    const data=await sharp(source).resize(2048,2048,{fit:'fill'}).ensureAlpha().raw().toBuffer();
    seam(data,2048,2048); await emit(data,2048,2048,file);
    if(job.id==='shadow-hide'){
      const mask=Buffer.alloc(data.length);
      for(let i=0;i<data.length;i+=4){const v=Math.max(0,Math.min(255,(data[i+2]-data[i+1]-12)*5));mask[i]=mask[i+1]=mask[i+2]=v;mask[i+3]=255;}
      await emit(mask,2048,2048,'creatures/shadow-hide-emissive.png');
    }
  } else if(job.id.startsWith('trim-')){
    const region=job.id.slice(5),data=await sharp(source).resize(4096,4096,{fit:'fill'}).ensureAlpha().raw().toBuffer();
    seam(data,4096,4096,false); await emit(data,4096,4096,`trim/${region}.png`);
    const mask=Buffer.alloc(data.length);
    for(let i=0;i<data.length;i+=4){let v=0;
      if(region==='blue')v=Math.max(0,(Math.min(data[i+1],data[i+2])-data[i]-25)*3);
      if(region==='violet')v=Math.max(0,(data[i+2]-data[i+1]-25)*3);
      if(region==='foundry')v=Math.max(0,(data[i]-180)*2)*Math.min(1,data[i+1]/100);
      mask[i]=mask[i+1]=mask[i+2]=Math.min(255,v);mask[i+3]=255;
    }
    await emit(mask,4096,4096,`trim/${region}-emissive.png`);
  } else if(job.id.startsWith('sky-')){
    const region=job.id.slice(4),w=4096,h=2048;
    const data=await sharp(source).resize(w,h,{fit:'fill'}).ensureAlpha().raw().toBuffer();
    // Generated sun at u=.78; paintSky's convention is u=.28.
    const shifted=Buffer.alloc(data.length);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)data.copy(shifted,(y*w+x)*4,(y*w+(x+w/2)%w)*4,(y*w+(x+w/2)%w)*4+4);
    seam(shifted,w,h,false);
    // Collapse the pole to its row mean, avoiding a pinwheel at the dome's poles.
    for(const top of [true,false]){
      const edge=top?0:h-1,mean=[0,0,0];
      for(let x=0;x<w;x++)for(let c=0;c<3;c++)mean[c]+=shifted[(edge*w+x)*4+c]/w;
      for(let n=0;n<64;n++)for(let x=0;x<w;x++)for(let c=0;c<3;c++){
       const i=((top?n:h-1-n)*w+x)*4+c,t=(1-n/63)**2;shifted[i]=Math.round(shifted[i]*(1-t)+mean[c]*t);
      }
    }
    await fs.mkdir(path.join(out,'sky'),{recursive:true});
    await sharp(shifted,{raw:{width:w,height:h,channels:4}}).removeAlpha().jpeg({quality:92}).toFile(path.join(out,`sky/${region}-preview.jpg`));
    await sharp(shifted,{raw:{width:w,height:h,channels:4}}).resize(8192,4096).removeAlpha().png().toFile(path.join(work,`${region}-sky-8k.png`));
    record.outputs.push(`sky/${region}-preview.jpg`,`sky/${region}.ktx2`);
  } else if(job.id.startsWith('horizon-')){
    const region=regions.find(r=>r.id===job.id.slice(8));
    for(let n=0;n<8;n++)for(let ring=0;ring<2;ring++){
      const row=n%4, top=Math.round(row*meta.height/4),height=Math.round((row+1)*meta.height/4)-top;
      let pipeline=sharp(source).extract({left:0,top,width:meta.width,height});
      if(n>=4)pipeline=pipeline.flop();
      const w=4096,h=1024,data=await pipeline.resize(w,h,{fit:'fill'}).ensureAlpha().raw().toBuffer();
      const haze=hex(region.haze),other=hex(ring?region.sky:region.ground),t=ring?.45:.35;
      for(let i=0;i<data.length;i+=4){
        const l=(data[i]*.21+data[i+1]*.72+data[i+2]*.07)/255;
        for(let c=0;c<3;c++)data[i+c]=Math.round((haze[c]*(1-t)+other[c]*t)*(0.8+Math.round(l*3)/3*.2));
        if(data[i+3]<100)data[i+3]=0;
      }
      await emit(data,w,h,`horizon/${region.id}-${ring}-${n}.png`);
    }
  } else if(job.id.startsWith('effect-')){
    const name=job.id.slice(7),data=await sharp(source).resize(2048,1024,{fit:'fill'}).ensureAlpha().raw().toBuffer();
    await emit(data,2048,1024,`effects/${name}.png`);
  }
  records=records.filter(r=>r.id!==record.id);records.push(record);console.log(job.id);
 }
 for(const region of regions){
  const w=512,data=Buffer.alloc(w*w*4);
  for(let y=0;y<w;y++)for(let x=0;x<w;x++){
    const i=(y*w+x)*4,road=Math.exp(-(((x/w-.5-Math.sin(y/w*6.28)*.13)/.065)**2)),cliff=Math.min(1,Math.max(0,(x/w-.7)*5));
    data[i+2]=Math.round(road*255);data[i+1]=Math.round(cliff*(255-data[i+2]));data[i]=255-data[i+1]-data[i+2];data[i+3]=255;
  }
  await save(data,w,w,path.join(out,`terrain/${region.id}/splat.png`));
 }
 await fs.writeFile(path.join(out,'paintings.json'),JSON.stringify(records,null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1;});

const sharp = require('/Users/hoai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const fs = require('fs');
const path = require('path');
const root=path.resolve(__dirname,'../assets');
(async()=>{
  for (const n of [16,32,48,180,192,512]) await sharp(path.join(root,'hopper-icon-master.png')).resize(n,n).png().toFile(path.join(root,`hopper-icon-${n}.png`));
  const sizes=[16,32,48];const frames=sizes.map(n=>fs.readFileSync(path.join(root,`hopper-icon-${n}.png`)));
  const hdr=Buffer.alloc(6);hdr.writeUInt16LE(1,2);hdr.writeUInt16LE(frames.length,4);
  let offset=6+16*frames.length;const entries=frames.map((b,i)=>{const e=Buffer.alloc(16);e[0]=sizes[i];e[1]=sizes[i];e.writeUInt16LE(1,4);e.writeUInt16LE(32,6);e.writeUInt32LE(b.length,8);e.writeUInt32LE(offset,12);offset+=b.length;return e;});
  fs.writeFileSync(path.join(root,'favicon.ico'),Buffer.concat([hdr,...entries,...frames]));
  const logo=await sharp(path.join(root,'hopper-logo.png')).metadata();
  console.log(JSON.stringify({faviconSizes:sizes,logo:{width:logo.width,height:logo.height,hasAlpha:logo.hasAlpha}}));
})();

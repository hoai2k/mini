// Which quality tier Auto picks for a GPU (gfx/renderer.js detectGPU feeds it
// what the browser reports). Pure, so the node tests can check it.
//
// WebGPU and WebGL can describe different GPUs: on a Windows laptop with two,
// Chrome often runs WebGPU on the integrated chip while WebGL names the
// discrete card. Judging WebGPU by that WebGL name picked Ultra for an Intel
// chip. So when the two name different vendors, the WebGPU adapter's own
// description decides; when they agree (one GPU, as on a Mac), the WebGL name
// adds the detail the adapter leaves out ("Apple M1" against "M3 Max").
const VENDORS = [['nvidia', /nvidia|geforce|quadro/], ['amd', /\bamd\b|ati\b|radeon/], ['intel', /intel/], ['apple', /apple/], ['qualcomm', /qualcomm|adreno/], ['arm', /\barm\b|mali/]];
export function vendorOf(s) { s = (s || '').toLowerCase(); for (const [v, re] of VENDORS) if (re.test(s)) return v; return ''; }

// info: { webgpu, vendor, arch, gpuDesc (WebGPU adapter), renderer (WebGL), mobile }; cores, ua from navigator
export function classifyGPU(info, { cores = 4, ua = '' } = {}) {
  const adapter = `${info.vendor || ''} ${info.arch || ''} ${info.gpuDesc || ''}`.trim().toLowerCase();
  const gl = (info.renderer || '').toLowerCase();
  const split = info.webgpu && adapter && vendorOf(adapter) && vendorOf(gl) && vendorOf(adapter) !== vendorOf(gl);
  const s = split ? adapter : `${gl} ${adapter}`;
  const software = !!info.software || /swiftshader|llvmpipe|softpipe|basic render|microsoft basic|software/.test(s);
  const integrated = /intel|uhd|iris|gen-\d|xe-lpg|radeon\(tm\) graphics|vega \d+ graphics|apple m1\b|mali|adreno|powervr|apple gpu/.test(s) && !/arc a\d/.test(s);
  const discrete = !integrated && /nvidia|geforce|rtx|gtx|quadro|radeon rx|radeon pro|rx \d{3,4}|arc a\d|amd radeon\(tm\) rx|apple m\d (pro|max|ultra)/.test(s);
  let tier;
  if (software) tier = 'low';
  else if (info.mobile) tier = (info.webgpu && /apple/.test(s) && !/iphone/i.test(ua)) ? 'medium' : 'low';
  // Ultra (screen-space GI, reflections everywhere, 4096 soft shadows) is
  // only ever chosen in Settings: Auto tops out at High.
  else if (discrete) tier = 'high';
  else if (/apple/.test(s)) tier = info.webgpu ? 'high' : 'medium';
  else if (integrated) tier = 'medium';
  else tier = info.webgpu ? 'high' : 'medium';
  if (cores <= 2 && tier !== 'low') tier = 'low';
  return { software, discrete, tier, judgedBy: split ? 'webgpu-adapter' : 'both' };
}

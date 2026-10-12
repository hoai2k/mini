// Each theme records its own measured centres in data/asset-list.json.
export function selectArt(list, theme = 'deco') {
  const delivered = list.filter((a) => a.status !== 'requested');
  const chosen = new Map(delivered.filter((a) => !a.theme || a.theme === 'straight').map((a) => [a.id, a]));
  for (const a of delivered.filter((a) => a.theme === theme)) chosen.set(a.id, a);
  return [...chosen.values()];
}

export function alignPendulum(el, bodyArt, rodArt) {
  const [width, height] = bodyArt?.canvas || [800, 1200];
  const [pivotX, pivotY] = bodyArt?.anchors?.pivot || [400, 985];
  const [rodWidth, rodHeight] = rodArt?.canvas || [200, 1000];
  const [hubX, hubY] = rodArt?.anchors?.hub || [102, 927];
  const body = { width, height, pivotX, pivotY };
  const rod = { width: rodWidth, height: rodHeight, hubX, hubY };
  el.style.width = `${100 * rod.width / body.width}%`;
  el.style.height = `${100 * rod.height / body.height}%`;
  el.style.left = `${100 * (body.pivotX - rod.hubX) / body.width}%`;
  el.style.top = `${100 * (body.pivotY - rod.hubY) / body.height}%`;
  el.style.transformOrigin = `${100 * rod.hubX / rod.width}% ${100 * rod.hubY / rod.height}%`;
}

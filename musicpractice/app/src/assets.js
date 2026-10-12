// Measured centres in the delivered WebP canvases (see design/image-deliveries.json).
export function alignPendulum(el) {
  const body = { width: 800, height: 1200, pivotX: 400, pivotY: 985 };
  const rod = { width: 200, height: 1000, hubX: 102, hubY: 927 };
  el.style.left = `${100 * (body.pivotX - rod.hubX) / body.width}%`;
  el.style.top = `${100 * (body.pivotY - rod.hubY) / body.height}%`;
  el.style.transformOrigin = `${100 * rod.hubX / rod.width}% ${100 * rod.hubY / rod.height}%`;
}

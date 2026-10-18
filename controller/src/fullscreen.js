export function fullscreenElement(doc = document) {
  return doc.fullscreenElement || doc.webkitFullscreenElement || null;
}
export async function requestDisplayFullscreen(display, doc = document) {
  if (fullscreenElement(doc)) return true;
  const request = display.requestFullscreen || display.webkitRequestFullscreen;
  if (!request) return false;
  try {
    await request.call(display);
    return Boolean(fullscreenElement(doc));
  } catch { return false; }
}

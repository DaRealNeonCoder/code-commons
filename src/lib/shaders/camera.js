export const DEFAULT_CAMERA = Object.freeze({ x: 0, y: 0, zoom: 1 });
export const MIN_CAMERA_ZOOM = 0.2;
export const MAX_CAMERA_ZOOM = 12;

export function clampCameraZoom(zoom) {
  return Math.min(MAX_CAMERA_ZOOM, Math.max(MIN_CAMERA_ZOOM, zoom));
}

function screenToCameraWorld(camera, x, y, width, height) {
  const safeHeight = Math.max(1, height);
  const screenX = (2 * x - width) / safeHeight;
  const screenY = (height - 2 * y) / safeHeight;

  return {
    x: screenX / camera.zoom + camera.x,
    y: screenY / camera.zoom + camera.y,
  };
}

// Move the camera by a pointer delta in CSS pixels. The camera moves opposite
// the drag so the world feels like it is being grabbed and carried.
export function panCameraByPixels(camera, deltaX, deltaY, viewportHeight) {
  const safeHeight = Math.max(1, viewportHeight);
  return {
    ...camera,
    x: camera.x - (2 * deltaX) / safeHeight / camera.zoom,
    y: camera.y + (2 * deltaY) / safeHeight / camera.zoom,
  };
}

export function moveCameraByWorld(camera, deltaX, deltaY) {
  return {
    ...camera,
    x: camera.x + deltaX,
    y: camera.y + deltaY,
  };
}

// Zoom around the pointer's logical (CSS pixel) position, keeping the world
// point under the cursor fixed while the visible world range changes.
export function zoomCameraAt(camera, factor, x, y, width, height) {
  const nextZoom = clampCameraZoom(camera.zoom * factor);
  const worldPoint = screenToCameraWorld(camera, x, y, width, height);
  const safeHeight = Math.max(1, height);
  const screenX = (2 * x - width) / safeHeight;
  const screenY = (height - 2 * y) / safeHeight;

  return {
    x: worldPoint.x - screenX / nextZoom,
    y: worldPoint.y - screenY / nextZoom,
    zoom: nextZoom,
  };
}

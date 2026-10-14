import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CAMERA,
  MAX_CAMERA_ZOOM,
  MIN_CAMERA_ZOOM,
  clampCameraZoom,
  moveCameraByWorld,
  panCameraByPixels,
  zoomCameraAt,
} from "../src/lib/shaders/camera.js";

test("camera starts at the identity view and clamps zoom", () => {
  assert.deepEqual(DEFAULT_CAMERA, { x: 0, y: 0, zoom: 1 });
  assert.equal(clampCameraZoom(0), MIN_CAMERA_ZOOM);
  assert.equal(clampCameraZoom(100), MAX_CAMERA_ZOOM);
});

test("pointer panning is zoom-aware and keeps the grabbed-world direction", () => {
  const camera = { x: 0, y: 0, zoom: 2 };
  assert.deepEqual(panCameraByPixels(camera, 100, -50, 500), {
    x: -0.2,
    y: -0.1,
    zoom: 2,
  });
});

test("keyboard movement changes only camera position", () => {
  assert.deepEqual(moveCameraByWorld(DEFAULT_CAMERA, 1.5, -0.25), {
    x: 1.5,
    y: -0.25,
    zoom: 1,
  });
});

test("cursor-anchored zoom keeps the world point under the cursor fixed", () => {
  const camera = { x: 0.4, y: -0.2, zoom: 1 };
  const next = zoomCameraAt(camera, 2, 180, 120, 640, 400);
  const pointBefore = {
    x: (2 * 180 - 640) / 400 + camera.x,
    y: (400 - 2 * 120) / 400 + camera.y,
  };
  const pointAfter = {
    x: (2 * 180 - 640) / 400 / next.zoom + next.x,
    y: (400 - 2 * 120) / 400 / next.zoom + next.y,
  };

  assert.equal(next.zoom, 2);
  assert.ok(Math.abs(pointAfter.x - pointBefore.x) < 1e-12);
  assert.ok(Math.abs(pointAfter.y - pointBefore.y) < 1e-12);
});

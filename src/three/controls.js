// Orbit control tự viết (Three.js r128 không có sẵn OrbitControls).
// Camera xoay quanh 1 tâm theo tọa độ cầu: kéo 1 ngón/chuột để xoay, lăn chuột hoặc chụm 2 ngón để zoom.
import * as THREE from 'three';

const ROTATE_SPEED = 0.008;
const WHEEL_ZOOM_STEP = 0.1;
const MIN_POLAR = 0.05;
const MAX_POLAR = Math.PI / 2 - 0.02; // không cho camera chui xuống dưới sàn
const DEFAULT_AZIMUTH = Math.PI / 4;
const DEFAULT_POLAR = Math.PI / 3;

export function createOrbitControls(camera, domElement, onChange) {
  const target = new THREE.Vector3();
  const state = { radius: 10, azimuth: DEFAULT_AZIMUTH, polar: DEFAULT_POLAR, minRadius: 1, maxRadius: 100 };
  const pointers = new Map();
  let lastPinchDistance = 0;

  function update() {
    const sinPolar = Math.sin(state.polar);
    camera.position.set(
      target.x + state.radius * sinPolar * Math.sin(state.azimuth),
      target.y + state.radius * Math.cos(state.polar),
      target.z + state.radius * sinPolar * Math.cos(state.azimuth),
    );
    camera.lookAt(target);
    onChange();
  }

  function setRadius(radius) {
    state.radius = Math.min(state.maxRadius, Math.max(state.minRadius, radius));
  }

  function pinchDistance() {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function onPointerDown(event) {
    domElement.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) lastPinchDistance = pinchDistance();
  }

  function onPointerMove(event) {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const current = { x: event.clientX, y: event.clientY };
    pointers.set(event.pointerId, current);

    if (pointers.size === 1) {
      state.azimuth -= (current.x - previous.x) * ROTATE_SPEED;
      state.polar = Math.min(MAX_POLAR, Math.max(MIN_POLAR, state.polar - (current.y - previous.y) * ROTATE_SPEED));
      update();
    } else if (pointers.size === 2) {
      const distance = pinchDistance();
      if (lastPinchDistance > 0 && distance > 0) {
        setRadius(state.radius * (lastPinchDistance / distance));
        update();
      }
      lastPinchDistance = distance;
    }
  }

  function onPointerUp(event) {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) lastPinchDistance = 0;
  }

  function onWheel(event) {
    event.preventDefault();
    setRadius(state.radius * (event.deltaY > 0 ? 1 + WHEEL_ZOOM_STEP : 1 - WHEEL_ZOOM_STEP));
    update();
  }

  domElement.addEventListener('pointerdown', onPointerDown);
  domElement.addEventListener('pointermove', onPointerMove);
  domElement.addEventListener('pointerup', onPointerUp);
  domElement.addEventListener('pointercancel', onPointerUp);
  domElement.addEventListener('wheel', onWheel, { passive: false });

  /** Đặt tâm xoay vào giữa khối kích thước (sx, sy, sz) và lùi camera đủ xa để thấy toàn bộ. */
  function fitTo(sx, sy, sz) {
    target.set(0, sy / 2, 0);
    const size = Math.max(sx, sy, sz);
    state.minRadius = size * 0.2;
    state.maxRadius = size * 5;
    state.azimuth = DEFAULT_AZIMUTH;
    state.polar = DEFAULT_POLAR;
    setRadius(size * 1.3);
    update();
  }

  function dispose() {
    domElement.removeEventListener('pointerdown', onPointerDown);
    domElement.removeEventListener('pointermove', onPointerMove);
    domElement.removeEventListener('pointerup', onPointerUp);
    domElement.removeEventListener('pointercancel', onPointerUp);
    domElement.removeEventListener('wheel', onWheel);
  }

  return { update, fitTo, dispose };
}

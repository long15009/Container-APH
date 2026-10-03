// Khởi tạo renderer, scene, camera và ánh sáng.
import * as THREE from 'three';

export function createScene(mountElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xf1f5f9);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';
  mountElement.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 500);

  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.75);
  directionalLight.position.set(6, 12, 8);
  scene.add(directionalLight);

  function resize(width, height) {
    if (width <= 0 || height <= 0) return;
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = `${width}px`;
    renderer.domElement.style.height = `${height}px`;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function render() {
    renderer.render(scene, camera);
  }

  function dispose() {
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { renderer, scene, camera, resize, render, dispose };
}

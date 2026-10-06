// Chụp ảnh các góc nhìn của phương án bằng 1 renderer Three.js riêng (không gắn vào trang) để đưa vào PDF.
import * as THREE from 'three';
import { buildCargoMeshes, buildContainerMesh, CM_TO_SCENE, disposeGroup } from '../three/buildMeshes.js';

const BACKGROUND = 0xffffff;
const MARGIN = 1.08; // chừa lề quanh khung container

/**
 * Các góc nhìn:
 *  - perspective: phối cảnh 3D nhìn từ phía cửa, hơi chếch trên cao
 *  - top: nhìn thẳng từ trên xuống (chiều dài nằm ngang ảnh)
 *  - side: nhìn ngang từ hông cont (chiều dài nằm ngang, chiều cao thẳng đứng)
 *  - end: nhìn từ cửa cont vào (chiều rộng nằm ngang, chiều cao thẳng đứng)
 */
function viewFrame(view, L, W, H) {
  switch (view) {
    case 'top':
      return { width: L, height: W, position: [0, H + 10, 0], up: [0, 0, -1], target: [0, 0, 0] };
    case 'side':
      return { width: L, height: H, position: [0, H / 2, W + 10], up: [0, 1, 0], target: [0, H / 2, 0] };
    case 'end':
      return { width: W, height: H, position: [L + 10, H / 2, 0], up: [0, 1, 0], target: [0, H / 2, 0] };
    default:
      return null;
  }
}

/**
 * Lùi camera phối cảnh tới khoảng cách vừa đủ để cả 8 góc khung container nằm trong khung hình
 * (thử dần từ gần ra xa), tránh cắt mất 1 phần cont như khi ước lượng bằng hình cầu bao.
 */
function fitPerspective(camera, target, direction, L, W, H) {
  const corners = [];
  for (const x of [-L / 2, L / 2]) for (const y of [0, H]) for (const z of [-W / 2, W / 2]) corners.push(new THREE.Vector3(x, y, z));
  const limit = 0.92; // chừa lề 4% mỗi bên
  for (let distance = Math.max(L, W, H) * 0.5; distance < Math.max(L, W, H) * 10; distance *= 1.04) {
    camera.position.copy(target).addScaledVector(direction, distance);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    const fits = corners.every((corner) => {
      const p = corner.clone().project(camera);
      return Math.abs(p.x) <= limit && Math.abs(p.y) <= limit && p.z < 1;
    });
    if (fits) return;
  }
}

export function createViewRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setClearColor(BACKGROUND);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const light = new THREE.DirectionalLight(0xffffff, 0.6);
  scene.add(light);

  /**
   * @param container {length,width,height} (cm)
   * @param items các kiện cần vẽ
   * @param typeInfoById Map typeId -> { color, label }
   * @param view 'perspective' | 'top' | 'side' | 'end'
   * @param maxWidth chiều rộng ảnh (px); chiều cao tự tính theo tỉ lệ góc nhìn
   * @returns {{ dataUrl, width, height }} ảnh JPEG
   */
  function render(container, items, typeInfoById, view, maxWidth = 1600) {
    const L = container.length * CM_TO_SCENE;
    const W = container.width * CM_TO_SCENE;
    const H = container.height * CM_TO_SCENE;

    const containerGroup = buildContainerMesh(container);
    const cargoGroup = buildCargoMeshes(container, items, typeInfoById);
    scene.add(containerGroup, cargoGroup);

    let camera;
    let width = maxWidth;
    let height;
    const frame = viewFrame(view, L, W, H);
    if (frame) {
      const halfW = (frame.width / 2) * MARGIN;
      const halfH = (frame.height / 2) * MARGIN;
      height = Math.max(200, Math.round((width * halfH) / halfW));
      camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.01, 1000);
      camera.up.set(...frame.up);
      camera.position.set(...frame.position);
      camera.lookAt(...frame.target);
      light.position.set(frame.position[0] + 3, frame.position[1] + 6, frame.position[2] + 4);
    } else {
      height = Math.round(width * 0.5);
      camera = new THREE.PerspectiveCamera(32, width / height, 0.05, 500);
      // Nhìn chếch từ hông cont về phía cửa: chiều dài cont trải ngang ảnh, vẫn thấy được mặt cửa.
      const azimuth = 0.5;
      const polar = Math.PI / 3.1;
      const target = new THREE.Vector3(0, H / 2, 0);
      const direction = new THREE.Vector3(
        Math.sin(polar) * Math.sin(azimuth),
        Math.cos(polar),
        Math.sin(polar) * Math.cos(azimuth),
      );
      camera.position.copy(target).addScaledVector(direction, 10);
      camera.lookAt(target);
      fitPerspective(camera, target, direction, L, W, H);
      light.position.set(6, 12, 8);
    }

    renderer.setSize(width, height, false);
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/jpeg', 0.9);

    scene.remove(containerGroup, cargoGroup);
    disposeGroup(containerGroup);
    disposeGroup(cargoGroup);
    return { dataUrl, width, height };
  }

  function dispose() {
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return { render, dispose };
}

// Dựng mesh container và mesh từng kiện hàng từ dữ liệu (cm).
// Mọi mesh được đặt trong 1 group gốc thu nhỏ theo CM_TO_SCENE, tâm sàn container nằm ở gốc tọa độ.
import * as THREE from 'three';

export const CM_TO_SCENE = 0.01; // 1 đơn vị scene = 1 m

// Dùng chung 1 hình hộp đơn vị cho mọi kiện hàng, mỗi kiện chỉ khác scale/vị trí.
const unitBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
const unitEdgesGeometry = new THREE.EdgesGeometry(unitBoxGeometry);
const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x111827 });

/** Màu gỗ của đế pallet — không trùng màu nào trong bảng màu hàng hóa. */
export const PALLET_WOOD_COLOR = '#8b5a2b';
const woodMaterial = new THREE.MeshStandardMaterial({
  color: PALLET_WOOD_COLOR,
  roughness: 0.95,
  metalness: 0,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});
const woodEdgeMaterial = new THREE.LineBasicMaterial({ color: 0x3f2a14 });
const sharedResources = new Set([unitBoxGeometry, unitEdgesGeometry, edgeMaterial, woodMaterial, woodEdgeMaterial]);

// Hình dạng đế pallet: ván mặt có khe hở + 3 thanh chân, nhìn khác hẳn thùng hàng.
const PALLET_DECK_BOARDS = 7;
const PALLET_BOARD_GAP_RATIO = 0.45; // khe giữa 2 ván so với bề rộng 1 ván
const PALLET_RUNNERS = 3;

function createRootGroup(container) {
  const group = new THREE.Group();
  group.scale.setScalar(CM_TO_SCENE);
  group.position.set((-container.length / 2) * CM_TO_SCENE, 0, (-container.width / 2) * CM_TO_SCENE);
  return group;
}

/** Khung container dạng wireframe + sàn mờ. */
export function buildContainerMesh(container) {
  const { length, width, height } = container;
  const group = createRootGroup(container);

  const frameGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(length, height, width));
  const frame = new THREE.LineSegments(frameGeometry, new THREE.LineBasicMaterial({ color: 0x334155 }));
  frame.position.set(length / 2, height / 2, width / 2);
  group.add(frame);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(length, width),
    new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.25, side: THREE.DoubleSide }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(length / 2, 0, width / 2);
  group.add(floor);

  const sectionPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
  );
  sectionPlane.name = SECTION_PLANE_NAME;
  sectionPlane.visible = false;
  group.add(sectionPlane);

  return group;
}

const SECTION_PLANE_NAME = 'sectionPlane';

/** Đặt mặt phẳng đánh dấu mặt cắt vuông góc với `axis` tại vị trí `cut` (cm); ẩn khi không cắt. */
export function updateSectionPlane(containerGroup, container, axis, cut, visible) {
  const plane = containerGroup.getObjectByName(SECTION_PLANE_NAME);
  const { length, width, height } = container;
  plane.visible = visible;
  if (!visible) return;
  if (axis === 'x') {
    plane.rotation.set(0, Math.PI / 2, 0);
    plane.scale.set(width, height, 1);
    plane.position.set(cut, height / 2, width / 2);
  } else if (axis === 'y') {
    plane.rotation.set(-Math.PI / 2, 0, 0);
    plane.scale.set(length, width, 1);
    plane.position.set(length / 2, cut, width / 2);
  } else {
    plane.rotation.set(0, 0, 0);
    plane.scale.set(length, height, 1);
    plane.position.set(length / 2, height / 2, cut);
  }
}

/** Mỗi kiện hàng đã xếp là 1 khối hộp màu theo loại hàng, có viền đen. */
export function buildCargoMeshes(container, placedItems, colorByTypeId) {
  const group = createRootGroup(container);
  const materials = new Map();

  function getMaterial(color) {
    if (!materials.has(color)) {
      materials.set(
        color,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.7,
          metalness: 0.05,
          // Đẩy mặt khối lùi ra sau một chút để đường viền không bị che (z-fighting).
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        }),
      );
    }
    return materials.get(color);
  }

  // Mọi mesh của 1 kiện (kể cả đế pallet + thùng trên pallet) đều gắn userData.item = kiện đó
  // để viewer ẩn/hiện cả khối theo mặt cắt, loại hàng.
  function addBlock(item, x, y, z, l, h, w, material, lineMaterial) {
    const mesh = new THREE.Mesh(unitBoxGeometry, material);
    const edges = new THREE.LineSegments(unitEdgesGeometry, lineMaterial);
    for (const object of [mesh, edges]) {
      object.userData.item = item;
      object.scale.set(l, h, w);
      object.position.set(x + l / 2, y + h / 2, z + w / 2);
      group.add(object);
    }
  }

  for (const item of placedItems) {
    const material = getMaterial(colorByTypeId.get(item.typeId) || '#9ca3af');
    if (!item.pallet) {
      addBlock(item, item.x, item.y, item.z, item.l, item.h, item.w, material, edgeMaterial);
      continue;
    }
    addPalletBase(item);
    for (const box of item.pallet.boxes) {
      addBlock(item, item.x + box.x, item.y + box.y, item.z + box.z, box.l, box.h, box.w, material, edgeMaterial);
    }
  }

  /** Đế pallet gỗ: các thanh chân chạy dọc theo trục x, ván mặt nằm ngang có khe hở. */
  function addPalletBase(item) {
    const { baseHeight } = item.pallet;
    const deckThickness = Math.min(2.5, baseHeight * 0.2);
    const runnerHeight = baseHeight - deckThickness;
    const runnerWidth = Math.min(10, item.w / 8);
    for (let i = 0; i < PALLET_RUNNERS; i++) {
      const z = item.z + ((item.w - runnerWidth) * i) / (PALLET_RUNNERS - 1);
      addBlock(item, item.x, item.y, z, item.l, runnerHeight, runnerWidth, woodMaterial, woodEdgeMaterial);
    }
    const boardWidth = item.l / (PALLET_DECK_BOARDS + (PALLET_DECK_BOARDS - 1) * PALLET_BOARD_GAP_RATIO);
    const step = boardWidth * (1 + PALLET_BOARD_GAP_RATIO);
    for (let i = 0; i < PALLET_DECK_BOARDS; i++) {
      addBlock(item, item.x + i * step, item.y + runnerHeight, item.z, boardWidth, deckThickness, item.w, woodMaterial, woodEdgeMaterial);
    }
  }

  return group;
}

/** Giải phóng geometry/material riêng của group (giữ lại tài nguyên dùng chung). */
export function disposeGroup(group) {
  group.traverse((object) => {
    if (object.geometry && !sharedResources.has(object.geometry)) object.geometry.dispose();
    if (object.material && !sharedResources.has(object.material)) object.material.dispose();
  });
}

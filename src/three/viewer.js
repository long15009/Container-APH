// Ghép scene + controls + meshes thành 1 viewer đơn giản cho component React sử dụng.
// Chỉ render khi có thay đổi (xoay, zoom, đổi dữ liệu, đổi kích thước) để tiết kiệm pin/CPU.
import { createScene } from './scene.js';
import { createOrbitControls } from './controls.js';
import { buildCargoMeshes, buildContainerMesh, CM_TO_SCENE, disposeGroup, updateSectionPlane } from './buildMeshes.js';
import { DEFAULT_VIEW_FILTER, getSectionCut, isItemVisible } from './visibility.js';

export function createViewer(mountElement) {
  const { scene, camera, renderer, resize, render, dispose: disposeScene } = createScene(mountElement);

  let frameRequested = false;
  function requestRender() {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(() => {
      frameRequested = false;
      render();
    });
  }

  const controls = createOrbitControls(camera, renderer.domElement, requestRender);
  let containerGroup = null;
  let cargoGroup = null;
  let currentContainer = null;
  let currentContainerKey = '';
  let filter = DEFAULT_VIEW_FILTER;

  function fitCamera() {
    if (!currentContainer) return;
    const { length, width, height } = currentContainer;
    controls.fitTo(length * CM_TO_SCENE, height * CM_TO_SCENE, width * CM_TO_SCENE);
  }

  function replaceGroup(oldGroup, newGroup) {
    if (oldGroup) {
      scene.remove(oldGroup);
      disposeGroup(oldGroup);
    }
    if (newGroup) scene.add(newGroup);
    return newGroup;
  }

  /**
   * Cập nhật nội dung hiển thị.
   * @param container {length,width,height} (cm)
   * @param placedItems kết quả packing (có thể rỗng)
   * @param colorByTypeId Map typeId -> màu
   */
  function setData(container, placedItems, colorByTypeId) {
    const containerKey = `${container.length}x${container.width}x${container.height}`;
    currentContainer = container;
    if (containerKey !== currentContainerKey) {
      currentContainerKey = containerKey;
      containerGroup = replaceGroup(containerGroup, buildContainerMesh(container));
      fitCamera();
    }
    cargoGroup = replaceGroup(cargoGroup, buildCargoMeshes(container, placedItems, colorByTypeId));
    applyFilter();
  }

  /** Ẩn/hiện kiện theo mặt cắt và loại hàng (không dựng lại mesh, chỉ đổi visible). */
  function setFilter(nextFilter) {
    filter = nextFilter;
    applyFilter();
  }

  function applyFilter() {
    if (!currentContainer) return;
    for (const object of cargoGroup.children) {
      object.visible = isItemVisible(object.userData.item, currentContainer, filter);
    }
    const sectioned = filter.ratio < 1;
    updateSectionPlane(containerGroup, currentContainer, filter.axis, getSectionCut(currentContainer, filter), sectioned);
    requestRender();
  }

  function setSize(width, height) {
    resize(width, height);
    requestRender();
  }

  function dispose() {
    controls.dispose();
    replaceGroup(containerGroup, null);
    replaceGroup(cargoGroup, null);
    disposeScene();
  }

  return { setData, setFilter, setSize, resetView: fitCamera, dispose };
}

// Quy tắc ẩn/hiện kiện hàng khi xem mặt cắt hoặc lọc theo loại hàng.
// Dùng chung cho viewer (ẩn mesh) và UI (đếm số kiện đang hiện).

/** Các trục cắt: key là trục tọa độ của kết quả packing, dimension là kích thước container tương ứng. */
export const SECTION_AXES = [
  { value: 'x', label: 'Dài', dimension: 'length' },
  { value: 'y', label: 'Cao', dimension: 'height' },
  { value: 'z', label: 'Rộng', dimension: 'width' },
];

export const DEFAULT_VIEW_FILTER = { axis: 'x', ratio: 1, hiddenTypeIds: new Set() };

/** Vị trí mặt cắt (cm) theo trục đang chọn. */
export function getSectionCut(container, filter) {
  const axis = SECTION_AXES.find((a) => a.value === filter.axis);
  return filter.ratio * container[axis.dimension];
}

/**
 * Kiện hiện khi loại hàng không bị ẩn và mặt bắt đầu của kiện nằm trước mặt cắt
 * (kiện bị mặt cắt đi qua vẫn hiện nguyên khối).
 */
export function isItemVisible(item, container, filter) {
  if (filter.hiddenTypeIds.has(item.typeId)) return false;
  if (filter.ratio >= 1) return true;
  return item[filter.axis] < getSectionCut(container, filter) - 1e-6;
}

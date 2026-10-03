// Các hàm hình học dùng cho thuật toán xếp hàng.
// Quy ước trục: x = chiều dài container, y = chiều cao (trục xếp chồng), z = chiều rộng.
// Một khối (box) có dạng { x, y, z, l, h, w }: l theo trục x, h theo trục y, w theo trục z.

export const EPSILON = 1e-6;

/** Kiểm tra 2 khối AABB có chồng lấn nhau không (chỉ chạm mặt thì không tính là chồng lấn). */
export function boxesOverlap(a, b) {
  return (
    a.x < b.x + b.l - EPSILON &&
    a.x + a.l > b.x + EPSILON &&
    a.y < b.y + b.h - EPSILON &&
    a.y + a.h > b.y + EPSILON &&
    a.z < b.z + b.w - EPSILON &&
    a.z + a.w > b.z + EPSILON
  );
}

/** Kiểm tra khối có nằm gọn trong container không. */
export function fitsInContainer(box, container) {
  return (
    box.x + box.l <= container.length + EPSILON &&
    box.y + box.h <= container.height + EPSILON &&
    box.z + box.w <= container.width + EPSILON
  );
}

/**
 * Các hướng đặt hợp lệ của 1 kiện hàng.
 * Chỉ xoay quanh trục đứng (hoán đổi dài/rộng), không lật úp nên chiều cao luôn giữ nguyên.
 */
export function getOrientations(piece) {
  const orientations = [{ l: piece.length, h: piece.height, w: piece.width }];
  if (piece.allowRotate && piece.length !== piece.width) {
    orientations.push({ l: piece.width, h: piece.height, w: piece.length });
  }
  return orientations;
}

/** Độ dài phần giao nhau của 2 đoạn [a0, a1] và [b0, b1]. */
export function overlapLength(a0, a1, b0, b1) {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

/**
 * Tỷ lệ diện tích đáy của khối được đỡ bởi sàn hoặc mặt trên các khối bên dưới (0..1).
 * Dùng để tránh đặt kiện hàng lơ lửng.
 */
export function supportRatio(box, placedBoxes) {
  if (box.y <= EPSILON) return 1;
  let supported = 0;
  for (const other of placedBoxes) {
    if (other.noTopLoad) continue; // khối không cho đè lên (vd pallet không chồng) thì không tính là mặt đỡ
    if (Math.abs(other.y + other.h - box.y) > EPSILON) continue;
    supported +=
      overlapLength(box.x, box.x + box.l, other.x, other.x + other.l) *
      overlapLength(box.z, box.z + box.w, other.z, other.z + other.w);
  }
  return supported / (box.l * box.w);
}

/** Điểm có nằm trong phần không gian khối đã chiếm không (tính cả mặt đáy/sau/trái). */
export function isPointInsideBox(point, box) {
  return (
    point.x >= box.x - EPSILON &&
    point.x < box.x + box.l - EPSILON &&
    point.y >= box.y - EPSILON &&
    point.y < box.y + box.h - EPSILON &&
    point.z >= box.z - EPSILON &&
    point.z < box.z + box.w - EPSILON
  );
}

/** Thứ tự ưu tiên điểm ứng viên: thấp trước (y), rồi sát sau (z), rồi sát trái (x). */
export function compareCandidatePoints(a, b) {
  return a.y - b.y || a.z - b.z || a.x - b.x;
}

// Tiện ích cho bộ kiểm tra: sinh dữ liệu ngẫu nhiên có seed (lặp lại được) và các hàm kiểm tra bất biến.
import { boxesOverlap, overlapLength } from '../src/engine/geometry.js';
import { MIN_SUPPORT_RATIO } from '../src/engine/packing.js';

export const EPS = 1e-6;

/** Bộ sinh số ngẫu nhiên mulberry32 — cùng seed cho cùng kết quả để dễ tái hiện lỗi. */
export function createRandom(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (list) => list[Math.floor(next() * list.length)],
    bool: (p = 0.5) => next() < p,
  };
}

export function randomCargoTypes(rand, { count, maxQty, minSize = 15, maxSize = 120 }) {
  return Array.from({ length: count }, (_, i) => ({
    id: `t${i}`,
    length: rand.int(minSize, maxSize),
    width: rand.int(minSize, maxSize),
    height: rand.int(minSize, maxSize),
    weight: rand.int(0, 60),
    quantity: rand.int(1, maxQty),
    allowRotate: rand.bool(0.7),
  }));
}

/** Tỷ lệ đáy được đỡ, tính lại độc lập với engine từ toàn bộ khối đã đặt. */
export function independentSupport(box, all) {
  if (box.y <= EPS) return 1;
  let area = 0;
  for (const other of all) {
    if (other === box || other.noTopLoad) continue;
    if (Math.abs(other.y + other.h - box.y) > EPS) continue;
    area +=
      overlapLength(box.x, box.x + box.l, other.x, other.x + other.l) *
      overlapLength(box.z, box.z + box.w, other.z, other.z + other.w);
  }
  return area / (box.l * box.w);
}

/** Trả về danh sách lỗi vi phạm quy tắc xếp hàng của 1 tập khối trong container (rỗng = đúng). */
export function checkBoxesInContainer(boxes, container, { checkSupport = true } = {}) {
  const problems = [];
  boxes.forEach((b, i) => {
    if (b.x < -EPS || b.y < -EPS || b.z < -EPS) problems.push(`khối ${i} có tọa độ âm`);
    if (b.x + b.l > container.length + EPS || b.y + b.h > container.height + EPS || b.z + b.w > container.width + EPS) {
      problems.push(`khối ${i} vượt khung container`);
    }
    if (checkSupport && independentSupport(b, boxes) < MIN_SUPPORT_RATIO - EPS) problems.push(`khối ${i} bị lơ lửng`);
  });
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (boxesOverlap(boxes[i], boxes[j])) problems.push(`khối ${i} chồng lấn khối ${j}`);
    }
  }
  return problems;
}

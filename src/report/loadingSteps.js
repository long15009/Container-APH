// Chia phương án thành các bước đóng hàng thực tế: xếp từ vách đầu cont (x = 0) ra phía cửa (x = chiều dài).
// Mỗi bước là 1 đoạn theo chiều dài; kiện thuộc bước của đoạn chứa mặt sau của nó,
// nhưng không bao giờ được xếp trước kiện đỡ bên dưới -> nếu kiện đỡ thuộc bước sau thì kiện trên dời theo.
import { overlapLength } from '../engine/geometry.js';

const EPS = 1e-6;
const STEP_LENGTH_TARGET = 200; // cm — mỗi bước khoảng 2 m chiều dài
const MIN_STEPS = 3;
const MAX_STEPS = 8;

function restsOn(upper, lower) {
  return (
    Math.abs(lower.y + lower.h - upper.y) < EPS &&
    overlapLength(upper.x, upper.x + upper.l, lower.x, lower.x + lower.l) > EPS &&
    overlapLength(upper.z, upper.z + upper.w, lower.z, lower.z + lower.w) > EPS
  );
}

/**
 * @param container { length } (cm)
 * @param placed danh sách kiện đã xếp (kết quả planLoading.placed)
 * @returns các bước theo thứ tự đóng: [{ number, fromX, toX, items, countsByType: Map<typeId, {pieces, pallets}> }]
 *   fromX/toX: đoạn chiều dài (cm, tính từ vách đầu cont) mà các kiện của bước chiếm.
 */
export function computeLoadingSteps(container, placed) {
  if (placed.length === 0) return [];
  const segmentCount = Math.min(MAX_STEPS, Math.max(MIN_STEPS, Math.round(container.length / STEP_LENGTH_TARGET)));
  const segmentLength = container.length / segmentCount;

  // Duyệt từ dưới lên để kiện đỡ luôn được gán bước trước kiện nằm trên nó.
  const order = placed.map((item, index) => ({ item, index })).sort((a, b) => a.item.y - b.item.y || a.item.x - b.item.x);
  const stepOf = new Array(placed.length);
  const assigned = [];
  for (const { item, index } of order) {
    let step = Math.min(segmentCount - 1, Math.floor((item.x + EPS) / segmentLength));
    for (const lower of assigned) {
      if (restsOn(item, placed[lower])) step = Math.max(step, stepOf[lower]);
    }
    stepOf[index] = step;
    assigned.push(index);
  }

  const steps = [];
  for (let s = 0; s < segmentCount; s++) {
    // Trong 1 bước: xếp từ dưới lên, từ trong ra ngoài, từ trái sang phải.
    const items = placed
      .filter((_, i) => stepOf[i] === s)
      .sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z);
    if (items.length === 0) continue;
    const countsByType = new Map();
    for (const item of items) {
      const count = countsByType.get(item.typeId) || { pieces: 0, pallets: 0 };
      if (item.pallet) {
        count.pallets += 1;
        count.pieces += item.pallet.boxes.length;
      } else {
        count.pieces += 1;
      }
      countsByType.set(item.typeId, count);
    }
    steps.push({
      number: steps.length + 1,
      fromX: Math.min(...items.map((i) => i.x)),
      toX: Math.max(...items.map((i) => i.x + i.l)),
      items,
      countsByType,
    });
  }
  return steps;
}

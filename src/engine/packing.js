// Thuật toán xếp hàng 3D theo heuristic "extreme point".
// Không phụ thuộc UI hay Three.js: nhận dữ liệu thuần, trả về object kết quả thuần.
import {
  boxesOverlap,
  compareCandidatePoints,
  fitsInContainer,
  getOrientations,
  isPointInsideBox,
  supportRatio,
} from './geometry.js';

/** Số điểm ứng viên tối đa được giữ lại sau mỗi lần đặt kiện. */
export const MAX_CANDIDATE_POINTS = 500;
/** Tỷ lệ diện tích đáy tối thiểu phải được đỡ khi xếp chồng (tránh kiện lơ lửng). */
export const MIN_SUPPORT_RATIO = 0.75;

/** Tổng số kiện của danh sách loại hàng. */
export function countPieces(cargoTypes) {
  return cargoTypes.reduce((sum, type) => sum + type.quantity, 0);
}

function addCandidatePoint(points, point, container, placedBoxes) {
  if (point.x >= container.length || point.y >= container.height || point.z >= container.width) return;
  if (points.some((p) => p.x === point.x && p.y === point.y && p.z === point.z)) return;
  if (placedBoxes.some((box) => isPointInsideBox(point, box))) return;
  points.push(point);
}

/** Tìm vị trí + hướng đặt hợp lệ đầu tiên cho kiện hàng, trả về null nếu không có. */
function findPlacement(piece, points, container, placedBoxes) {
  const orientations = getOrientations(piece);
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (piece.floorOnly && point.y > 0) continue;
    for (const o of orientations) {
      const box = { x: point.x, y: point.y, z: point.z, l: o.l, h: o.h, w: o.w };
      if (!fitsInContainer(box, container)) continue;
      if (placedBoxes.some((placed) => boxesOverlap(box, placed))) continue;
      if (supportRatio(box, placedBoxes) < MIN_SUPPORT_RATIO) continue;
      return { box, pointIndex: i };
    }
  }
  return null;
}

/**
 * Tính phương án xếp hàng.
 * @param {{length:number,width:number,height:number,maxWeight:number}} container kích thước lòng thùng (cm), tải trọng (kg)
 * @param {Array<{id,length,width,height,weight,quantity,allowRotate,floorOnly?,noTopLoad?}>} cargoTypes
 *   floorOnly: chỉ được đặt trên sàn; noTopLoad: không cho khối khác đè lên.
 * @returns {{
 *   placed: Array<{typeId,x,y,z,l,h,w,weight}>,
 *   typeStats: Array<{typeId,requested,placed,unplaced}>,
 *   totalPieces:number, placedCount:number,
 *   totalWeight:number, usedVolume:number, containerVolume:number,
 *   volumeUtilization:number, weightUtilization:number
 * }}
 */
export function packCargo(container, cargoTypes) {
  // Xếp theo thể tích kiện giảm dần; các kiện cùng loại giống hệt nhau nên xử lý liền nhau theo từng loại
  // thay vì bung ra từng kiện riêng lẻ (không tốn bộ nhớ dù số lượng rất lớn).
  const sortedTypes = cargoTypes
    .map((type, typeIndex) => ({ type, typeIndex, volume: type.length * type.width * type.height }))
    .sort((a, b) => b.volume - a.volume || a.typeIndex - b.typeIndex);

  const placedBoxes = [];
  const placed = [];
  const placedByType = new Map();
  let totalWeight = 0;
  let usedVolume = 0;
  let points = [{ x: 0, y: 0, z: 0 }];

  for (const { type } of sortedTypes) {
    for (let i = 0; i < type.quantity; i++) {
      // Khi 1 kiện không xếp được (hết tải hoặc hết chỗ) thì trạng thái container không đổi,
      // nên mọi kiện giống hệt còn lại của loại này cũng không xếp được -> dừng loại này luôn.
      if (totalWeight + type.weight > container.maxWeight) break;

      points.sort(compareCandidatePoints);
      const result = findPlacement(type, points, container, placedBoxes);
      if (!result) break;

      const { box, pointIndex } = result;
      placedBoxes.push(type.noTopLoad ? { ...box, noTopLoad: true } : box);
      placed.push({ typeId: type.id, ...box, weight: type.weight });
      placedByType.set(type.id, (placedByType.get(type.id) || 0) + 1);
      totalWeight += type.weight;
      usedVolume += box.l * box.h * box.w;

      // Bỏ điểm vừa dùng và các điểm bị kiện mới chiếm chỗ, rồi thêm 3 điểm mới tại 3 cạnh của kiện.
      points.splice(pointIndex, 1);
      points = points.filter((p) => !isPointInsideBox(p, box));
      addCandidatePoint(points, { x: box.x + box.l, y: box.y, z: box.z }, container, placedBoxes);
      addCandidatePoint(points, { x: box.x, y: box.y + box.h, z: box.z }, container, placedBoxes);
      addCandidatePoint(points, { x: box.x, y: box.y, z: box.z + box.w }, container, placedBoxes);

      if (points.length > MAX_CANDIDATE_POINTS) {
        points.sort(compareCandidatePoints);
        points.length = MAX_CANDIDATE_POINTS;
      }
    }
  }

  const typeStats = cargoTypes.map((type) => {
    const placedCount = placedByType.get(type.id) || 0;
    return { typeId: type.id, requested: type.quantity, placed: placedCount, unplaced: type.quantity - placedCount };
  });

  const containerVolume = container.length * container.width * container.height;
  return {
    placed,
    typeStats,
    totalPieces: countPieces(cargoTypes),
    placedCount: placed.length,
    totalWeight,
    usedVolume,
    containerVolume,
    volumeUtilization: containerVolume > 0 ? usedVolume / containerVolume : 0,
    weightUtilization: container.maxWeight > 0 ? totalWeight / container.maxWeight : 0,
  };
}

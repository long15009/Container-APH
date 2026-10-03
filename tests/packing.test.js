// Kiểm tra thuật toán xếp hàng vào container (engine/packing.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  boxesOverlap,
  compareCandidatePoints,
  fitsInContainer,
  getOrientations,
  isPointInsideBox,
  supportRatio,
} from '../src/engine/geometry.js';
import { MAX_CANDIDATE_POINTS, MIN_SUPPORT_RATIO, packCargo } from '../src/engine/packing.js';
import { CONTAINER_PRESETS } from '../src/data/containerPresets.js';
import { EPS, checkBoxesInContainer, createRandom, randomCargoTypes } from './helpers.js';

/**
 * Bản cài đặt tham chiếu đúng theo đặc tả gốc: bung từng kiện, không có tối ưu "dừng sớm theo loại".
 * Dùng để chứng minh bản tối ưu trong engine cho kết quả y hệt.
 */
function referencePack(container, cargoTypes) {
  const pieces = [];
  cargoTypes.forEach((type, typeIndex) => {
    for (let i = 0; i < type.quantity; i++) pieces.push({ ...type, typeIndex, volume: type.length * type.width * type.height });
  });
  pieces.sort((a, b) => b.volume - a.volume || a.typeIndex - b.typeIndex);

  const placedBoxes = [];
  const placed = [];
  let totalWeight = 0;
  let points = [{ x: 0, y: 0, z: 0 }];
  for (const piece of pieces) {
    if (totalWeight + piece.weight > container.maxWeight) continue;
    points.sort(compareCandidatePoints);
    let found = null;
    search: for (let i = 0; i < points.length; i++) {
      if (piece.floorOnly && points[i].y > 0) continue;
      for (const o of getOrientations(piece)) {
        const box = { ...points[i], l: o.l, h: o.h, w: o.w };
        if (!fitsInContainer(box, container)) continue;
        if (placedBoxes.some((p) => boxesOverlap(box, p))) continue;
        if (supportRatio(box, placedBoxes) < MIN_SUPPORT_RATIO) continue;
        found = { box, pointIndex: i };
        break search;
      }
    }
    if (!found) continue;
    const { box, pointIndex } = found;
    placedBoxes.push(piece.noTopLoad ? { ...box, noTopLoad: true } : box);
    placed.push({ typeId: piece.id, ...box, weight: piece.weight });
    totalWeight += piece.weight;
    points.splice(pointIndex, 1);
    points = points.filter((p) => !isPointInsideBox(p, box));
    for (const p of [
      { x: box.x + box.l, y: box.y, z: box.z },
      { x: box.x, y: box.y + box.h, z: box.z },
      { x: box.x, y: box.y, z: box.z + box.w },
    ]) {
      if (p.x >= container.length || p.y >= container.height || p.z >= container.width) continue;
      if (points.some((q) => q.x === p.x && q.y === p.y && q.z === p.z)) continue;
      if (placedBoxes.some((b) => isPointInsideBox(p, b))) continue;
      points.push(p);
    }
    if (points.length > MAX_CANDIDATE_POINTS) {
      points.sort(compareCandidatePoints);
      points.length = MAX_CANDIDATE_POINTS;
    }
  }
  return placed;
}

/** Kiểm tra mọi bất biến của 1 kết quả packCargo. */
function assertValidPacking(container, cargoTypes, result, label) {
  const typeById = new Map(cargoTypes.map((t) => [t.id, t]));
  const boxes = result.placed.map((p) => ({ ...p, noTopLoad: typeById.get(p.typeId).noTopLoad }));

  assert.deepEqual(checkBoxesInContainer(boxes, container), [], `${label}: vi phạm hình học`);

  for (const p of result.placed) {
    const type = typeById.get(p.typeId);
    assert.equal(p.h, type.height, `${label}: kiện bị lật (chiều cao thay đổi)`);
    const sameDir = p.l === type.length && p.w === type.width;
    const rotated = p.l === type.width && p.w === type.length;
    assert.ok(sameDir || (type.allowRotate && rotated), `${label}: kiện ${type.id} xoay sai quy tắc`);
    if (type.floorOnly) assert.ok(p.y <= EPS, `${label}: kiện chỉ-đặt-sàn bị đặt trên cao`);
    if (type.noTopLoad) {
      const loadedOnTop = result.placed.some(
        (q) =>
          q !== p &&
          Math.abs(q.y - (p.y + p.h)) <= EPS &&
          q.x < p.x + p.l - EPS && p.x < q.x + q.l - EPS &&
          q.z < p.z + p.w - EPS && p.z < q.z + q.w - EPS,
      );
      assert.ok(!loadedOnTop, `${label}: có hàng đè lên kiện không cho đè`);
    }
  }

  const weight = result.placed.reduce((s, p) => s + p.weight, 0);
  assert.ok(Math.abs(weight - result.totalWeight) < EPS, `${label}: tổng trọng lượng sai`);
  assert.ok(result.totalWeight <= container.maxWeight + EPS, `${label}: vượt tải trọng`);

  const volume = result.placed.reduce((s, p) => s + p.l * p.h * p.w, 0);
  assert.ok(Math.abs(volume - result.usedVolume) < 1e-3, `${label}: thể tích sai`);
  const containerVolume = container.length * container.width * container.height;
  assert.ok(Math.abs(result.volumeUtilization - volume / containerVolume) < 1e-9, `${label}: % thể tích sai`);
  assert.ok(Math.abs(result.weightUtilization - weight / container.maxWeight) < 1e-9, `${label}: % tải trọng sai`);

  let totalPlaced = 0;
  for (const stat of result.typeStats) {
    const count = result.placed.filter((p) => p.typeId === stat.typeId).length;
    const type = typeById.get(stat.typeId);
    assert.equal(stat.placed, count, `${label}: số xếp được của ${stat.typeId} sai`);
    assert.equal(stat.requested, type.quantity, `${label}: số yêu cầu sai`);
    assert.equal(stat.unplaced, type.quantity - count, `${label}: số còn dư sai`);
    totalPlaced += count;
  }
  assert.equal(result.placedCount, totalPlaced, `${label}: tổng số kiện xếp được sai`);
  assert.equal(result.totalPieces, cargoTypes.reduce((s, t) => s + t.quantity, 0), `${label}: tổng số kiện sai`);
}

test('hàm hình học cơ bản', () => {
  const a = { x: 0, y: 0, z: 0, l: 10, h: 10, w: 10 };
  assert.equal(boxesOverlap(a, { x: 10, y: 0, z: 0, l: 5, h: 5, w: 5 }), false, 'chạm mặt không phải chồng lấn');
  assert.equal(boxesOverlap(a, { x: 9, y: 9, z: 9, l: 5, h: 5, w: 5 }), true);
  assert.equal(fitsInContainer({ x: 0, y: 0, z: 0, l: 590, h: 239, w: 235 }, CONTAINER_PRESETS[0]), true);
  assert.equal(fitsInContainer({ x: 1, y: 0, z: 0, l: 590, h: 239, w: 235 }, CONTAINER_PRESETS[0]), false);
  assert.deepEqual(getOrientations({ length: 60, width: 40, height: 50, allowRotate: false }), [{ l: 60, h: 50, w: 40 }]);
  assert.equal(getOrientations({ length: 60, width: 40, height: 50, allowRotate: true }).length, 2);
  assert.equal(getOrientations({ length: 50, width: 50, height: 50, allowRotate: true }).length, 1, 'đáy vuông không cần xoay');
  const top = { x: 0, y: 10, z: 0, l: 10, h: 10, w: 10 };
  assert.equal(supportRatio(top, [a]), 1);
  assert.equal(supportRatio({ ...top, x: 5 }, [a]), 0.5);
  assert.equal(supportRatio(top, [{ ...a, noTopLoad: true }]), 0, 'khối không cho đè thì không đỡ');
});

test('ví dụ tính tay: thùng 60×40×50 trong cont 20DC, không xoay', () => {
  const container = CONTAINER_PRESETS.find((p) => p.id === '20DC');
  const cargo = [{ id: 'a', length: 60, width: 40, height: 50, weight: 10, quantity: 1000, allowRotate: false }];
  const result = packCargo(container, cargo);
  // 590/60 = 9, 235/40 = 5, 239/50 = 4  =>  9 × 5 × 4 = 180 kiện.
  assert.equal(result.placedCount, 180);
  assertValidPacking(container, cargo, result, 'tính tay');
});

test('dừng khi hết tải trọng', () => {
  const container = { length: 1000, width: 1000, height: 1000, maxWeight: 100 };
  const cargo = [{ id: 'a', length: 10, width: 10, height: 10, weight: 30, quantity: 10, allowRotate: true }];
  const result = packCargo(container, cargo);
  assert.equal(result.placedCount, 3);
  assert.equal(result.totalWeight, 90);
});

test('1 loại hết chỗ thì các loại nhỏ hơn vẫn được xếp tiếp', () => {
  const container = { length: 100, width: 100, height: 100, maxWeight: 1e9 };
  const cargo = [
    { id: 'big', length: 60, width: 60, height: 60, weight: 1, quantity: 5, allowRotate: true },
    { id: 'small', length: 40, width: 40, height: 40, weight: 1, quantity: 5, allowRotate: true },
  ];
  const result = packCargo(container, cargo);
  assert.equal(result.typeStats[0].placed, 1);
  assert.ok(result.typeStats[1].placed > 0, 'loại nhỏ phải xếp được vào chỗ trống còn lại');
});

test('hàng lớn hơn container thì không xếp, hàng khác vẫn xếp', () => {
  const container = CONTAINER_PRESETS[0];
  const cargo = [
    { id: 'big', length: 700, width: 100, height: 100, weight: 1, quantity: 2, allowRotate: true },
    { id: 'ok', length: 50, width: 50, height: 50, weight: 1, quantity: 3, allowRotate: true },
  ];
  const result = packCargo(container, cargo);
  assert.deepEqual(result.typeStats.map((s) => s.placed), [0, 3]);
});

test('chỉ-đặt-sàn và không-cho-đè-lên (quy tắc pallet không chồng)', () => {
  const container = { length: 300, width: 100, height: 300, maxWeight: 1e9 };
  const cargo = [
    { id: 'p', length: 100, width: 100, height: 100, weight: 1, quantity: 5, allowRotate: true, floorOnly: true, noTopLoad: true },
    { id: 'c', length: 50, width: 50, height: 50, weight: 1, quantity: 10, allowRotate: true },
  ];
  const result = packCargo(container, cargo);
  // Sàn chỉ đủ 3 pallet; thùng nhỏ không được đè lên pallet và không còn chỗ sàn.
  assert.deepEqual(result.typeStats.map((s) => s.placed), [3, 0]);
  assertValidPacking(container, cargo, result, 'pallet không chồng');
});

test('ngẫu nhiên: mọi kết quả hợp lệ và trùng khớp bản tham chiếu', () => {
  const rand = createRandom(20261003);
  const containers = [...CONTAINER_PRESETS, { length: 300, width: 200, height: 200, maxWeight: 2000 }];
  for (let run = 0; run < 400; run++) {
    const container = rand.pick(containers);
    const cargo = randomCargoTypes(rand, { count: rand.int(1, 6), maxQty: 60 });
    for (const type of cargo) {
      if (rand.bool(0.15)) {
        type.floorOnly = true;
        type.noTopLoad = true;
      }
    }
    const label = `lần ${run}`;
    const result = packCargo(container, cargo);
    assertValidPacking(container, cargo, result, label);
    const reference = referencePack(container, cargo);
    assert.deepEqual(result.placed, reference, `${label}: khác bản tham chiếu`);
  }
});

test('số lượng rất lớn vẫn tính nhanh', () => {
  const container = CONTAINER_PRESETS.find((p) => p.id === '40HC');
  const cargo = [
    { id: 'a', length: 60, width: 40, height: 50, weight: 1, quantity: 1e9, allowRotate: true },
    { id: 'b', length: 40, width: 30, height: 30, weight: 1, quantity: 1e9, allowRotate: true },
  ];
  const start = performance.now();
  const result = packCargo(container, cargo);
  assert.ok(performance.now() - start < 3000, 'quá chậm');
  assertValidPacking(container, cargo, result, 'số lượng lớn');
});

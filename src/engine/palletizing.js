// Đóng thùng lên pallet: tính cách xếp 1 tầng (không thò mép), số tầng, số thùng/pallet,
// rồi tạo các "kiện pallet" để engine packing xếp vào container.
// Mỗi pallet chỉ chứa 1 loại hàng. Hệ tọa độ trên pallet: x theo chiều dài pallet, z theo chiều rộng, y theo chiều cao.

const ROUND = (v) => Math.round(v * 1000) / 1000;

/** Lưới đều các thùng kích thước l × w trong vùng L × W bắt đầu từ (x0, z0). */
function grid(x0, z0, L, W, l, w) {
  const rects = [];
  const nx = Math.floor(L / l + 1e-9);
  const nz = Math.floor(W / w + 1e-9);
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) rects.push({ x: x0 + i * l, z: z0 + j * w, l, w });
  }
  return rects;
}

/** Dời cả tầng vào giữa mặt pallet để khoảng hở chia đều 2 bên. */
function centerOnPallet(rects, L, W) {
  const dx = (L - Math.max(...rects.map((r) => r.x + r.l))) / 2;
  const dz = (W - Math.max(...rects.map((r) => r.z + r.w))) / 2;
  return rects.map((r) => ({ ...r, x: ROUND(r.x + dx), z: ROUND(r.z + dz) }));
}

/** Đối xứng tầng qua tâm pallet (xoay 180°). */
function mirror(rects, L, W) {
  return rects.map((r) => ({ ...r, x: ROUND(L - r.x - r.l), z: ROUND(W - r.z - r.w) }));
}

/** Xoay tầng 90° (chỉ dùng cho pallet vuông). */
function rotate90(rects) {
  return rects.map((r) => ({ x: r.z, z: r.x, l: r.w, w: r.l }));
}

function samePattern(a, b) {
  const key = (rects) => rects.map((r) => `${r.x},${r.z},${r.l},${r.w}`).sort().join('|');
  return key(a) === key(b);
}

/**
 * Các phương án xếp 1 tầng: lưới đều theo từng hướng, và chia mặt pallet làm 2 khối
 * (mỗi khối 1 hướng thùng) theo chiều dài hoặc chiều rộng. Thùng không bao giờ vượt mép pallet.
 */
function layerCandidates(L, W, l, w, allowRotate) {
  const orientations = allowRotate && l !== w ? [[l, w], [w, l]] : [[l, w]];
  const candidates = orientations.map(([a, b]) => grid(0, 0, L, W, a, b));

  if (orientations.length === 2) {
    for (const [[a1, b1], [a2, b2]] of [orientations, [...orientations].reverse()]) {
      for (let k = 1; k * a1 < L; k++) {
        candidates.push([...grid(0, 0, k * a1, W, a1, b1), ...grid(k * a1, 0, L - k * a1, W, a2, b2)]);
      }
      for (let k = 1; k * b1 < W; k++) {
        candidates.push([...grid(0, 0, L, k * b1, a1, b1), ...grid(0, k * b1, L, W - k * b1, a2, b2)]);
      }
    }
  }
  if (orientations.length === 2) {
    const guillotineBest = Math.max(...candidates.map((rects) => rects.length));
    candidates.push(...pinwheelCandidates(L, W, l, w, guillotineBest));
  }
  return candidates.filter((rects) => rects.length > 0).map((rects) => centerOnPallet(rects, L, W));
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.l - 1e-9 && b.x < a.x + a.l - 1e-9 && a.z < b.z + b.w - 1e-9 && b.z < a.z + a.w - 1e-9;
}

/**
 * Kiểu chong chóng (pinwheel): 4 khối quay quanh tâm pallet, khối đối diện cùng hướng.
 * Xếp được nhiều thùng hơn chia 2 khối với một số kích thước (vd 60×40 trên pallet 110×110 được 4 thay vì 3).
 * Chỉ giữ các phương án nhiều thùng nhất (tối đa MAX_PINWHEEL_KEPT, đủ để tìm tầng xen kẽ cho răng lược),
 * và không kém phương án chia khối tốt nhất.
 */
const MAX_PINWHEEL_KEPT = 20;

function pinwheelCandidates(L, W, l, w, minCount) {
  let results = [];
  let bestCount = minCount;
  for (let ax = 1; ax * l < L; ax++) {
    for (let az = 1; az * w < W; az++) {
      for (let bx = 1; ax * l + bx * w <= L + 1e-9; bx++) {
        for (let bz = 1; az * w + bz * l <= W + 1e-9; bz++) {
          const count = 2 * (ax * az + bx * bz);
          if (count < bestCount || (count === bestCount && results.length >= MAX_PINWHEEL_KEPT)) continue;
          const blocks = [
            { x: 0, z: 0, l: ax * l, w: az * w, bl: l, bw: w },
            { x: L - bx * w, z: 0, l: bx * w, w: bz * l, bl: w, bw: l },
            { x: L - ax * l, z: W - az * w, l: ax * l, w: az * w, bl: l, bw: w },
            { x: 0, z: W - bz * l, l: bx * w, w: bz * l, bl: w, bw: l },
          ];
          const valid = blocks.every((a, i) => blocks.every((b, j) => i >= j || !rectsOverlap(a, b)));
          if (!valid) continue;
          if (count > bestCount) {
            bestCount = count;
            results = [];
          }
          results.push(blocks.flatMap((b) => grid(b.x, b.z, b.l, b.w, b.bl, b.bw)));
        }
      }
    }
  }
  return results;
}

/** Tìm tầng xen kẽ cho kiểu răng lược: cùng số thùng nhưng khác vị trí đường ghép. Không có thì trả về null. */
function findInterlockLayer(best, candidates, L, W, allowRotate) {
  const alternates = [mirror(best, L, W)];
  if (L === W && allowRotate) alternates.push(rotate90(best));
  for (const candidate of candidates) {
    if (candidate.length === best.length) alternates.push(candidate, mirror(candidate, L, W));
  }
  return alternates.find((layer) => !samePattern(layer, best)) || null;
}

/**
 * Lập phương án đóng pallet cho 1 loại hàng.
 * @param type loại hàng (cm, kg)
 * @param config { length, width, baseHeight, palletWeight, maxHeight, maxLoadWeight, maxLayers|null, pattern, stackable } (cm, kg)
 * @param containerHeight chiều cao lòng container (cm) — pallet không được cao hơn
 */
export function planPallets(type, config, containerHeight) {
  const plan = { typeId: type.id, units: [], palletCount: 0, error: null };
  const usableHeight = Math.min(config.maxHeight, containerHeight) - config.baseHeight;

  if (type.height > usableHeight) {
    return { ...plan, error: 'Thùng cao hơn chiều cao cho phép trên pallet.' };
  }
  // Thùng không được xoay thì mọi thùng giữ đúng hướng so với container, nhưng chính pallet vẫn có thể
  // đặt dọc hoặc ngang -> thử cả 2 khung pallet (dài × rộng và rộng × dài), chọn khung xếp được nhiều thùng hơn.
  // Thùng được xoay thì 1 khung là đủ (layerCandidates đã thử cả 2 hướng thùng).
  const frames = type.allowRotate
    ? [[config.length, config.width]]
    : [[config.length, config.width], [config.width, config.length]];
  let frame = null;
  for (const [L, W] of frames) {
    const candidates = layerCandidates(L, W, type.length, type.width, type.allowRotate);
    if (candidates.length === 0) continue;
    const best = candidates.reduce((a, b) => (b.length > a.length ? b : a));
    if (!frame || best.length > frame.best.length) frame = { L, W, candidates, best };
  }
  if (!frame) {
    return { ...plan, error: 'Thùng lớn hơn mặt pallet (không cho thò ra mép).' };
  }
  const { best } = frame;

  let interlockLayer = null;
  let interlockFallback = false;
  if (config.pattern === 'interlock') {
    interlockLayer = findInterlockLayer(best, frame.candidates, frame.L, frame.W, type.allowRotate);
    interlockFallback = interlockLayer === null;
  }

  const layersByHeight = Math.floor(usableHeight / type.height + 1e-9);
  const maxLayers = config.maxLayers ? Math.min(layersByHeight, config.maxLayers) : layersByHeight;
  const byWeight = type.weight > 0 ? Math.floor(config.maxLoadWeight / type.weight + 1e-9) : Infinity;
  const perPallet = Math.min(best.length * maxLayers, byWeight);
  if (perPallet < 1) {
    return { ...plan, error: 'Một thùng đã nặng hơn tải tối đa của pallet.' };
  }

  function buildBoxes(count) {
    const boxes = [];
    for (let layer = 0; boxes.length < count; layer++) {
      const rects = interlockLayer && layer % 2 === 1 ? interlockLayer : best;
      for (const r of rects) {
        if (boxes.length >= count) break;
        boxes.push({ x: r.x, y: config.baseHeight + layer * type.height, z: r.z, l: r.l, h: type.height, w: r.w });
      }
    }
    return boxes;
  }

  function makeUnit(boxCount, quantity, suffix) {
    const layers = Math.ceil(boxCount / best.length);
    return {
      id: `${type.id}::pallet-${suffix}`,
      palletOf: type.id,
      length: frame.L,
      width: frame.W,
      height: ROUND(config.baseHeight + layers * type.height),
      weight: ROUND(config.palletWeight + boxCount * type.weight),
      quantity,
      // Thùng không được xoay thì pallet chứa nó cũng không được xoay trong container.
      allowRotate: type.allowRotate,
      floorOnly: !config.stackable,
      noTopLoad: !config.stackable,
      baseHeight: config.baseHeight,
      boxCount,
      layers,
      boxes: buildBoxes(boxCount),
    };
  }

  const fullCount = Math.floor(type.quantity / perPallet);
  const remainder = type.quantity % perPallet;
  const units = [];
  if (fullCount > 0) units.push(makeUnit(perPallet, fullCount, 'full'));
  if (remainder > 0) units.push(makeUnit(remainder, 1, 'partial'));

  const full = units[0];
  return {
    ...plan,
    units,
    palletCount: fullCount + (remainder > 0 ? 1 : 0),
    perLayer: best.length,
    layers: full.layers,
    perPallet,
    pattern: interlockLayer ? 'interlock' : 'column',
    interlockFallback,
    limitedByWeight: byWeight < best.length * maxLayers,
    palletHeight: full.height,
    palletWeight: full.weight,
  };
}

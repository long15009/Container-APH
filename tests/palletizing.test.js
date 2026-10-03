// Kiểm tra đóng pallet (engine/palletizing.js) và phương án tổng (engine/planLoading.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planPallets } from '../src/engine/palletizing.js';
import { planLoading } from '../src/engine/planLoading.js';
import { boxesOverlap } from '../src/engine/geometry.js';
import { CONTAINER_PRESETS } from '../src/data/containerPresets.js';
import { PALLET_PRESETS, DEFAULT_PALLET_SETTINGS, resolvePalletConfig, validatePalletSettings } from '../src/data/palletPresets.js';
import { EPS, checkBoxesInContainer, createRandom, randomCargoTypes } from './helpers.js';

function palletConfig(presetId, overrides = {}) {
  return { ...resolvePalletConfig({ ...DEFAULT_PALLET_SETTINGS, presetId }), ...overrides };
}

const layerKey = (boxes, y) =>
  boxes
    .filter((b) => Math.abs(b.y - y) < EPS)
    .map((b) => `${b.x},${b.z},${b.l},${b.w}`)
    .sort()
    .join('|');

/** Số thùng/tầng tối thiểu phải đạt: lưới đều tốt nhất trong các hướng/khung được phép. */
function simpleGridBest(type, config) {
  const frames = [[config.length, config.width], [config.width, config.length]];
  const orientations = type.allowRotate ? [[type.length, type.width], [type.width, type.length]] : [[type.length, type.width]];
  let best = 0;
  for (const [L, W] of frames) {
    for (const [l, w] of orientations) best = Math.max(best, Math.floor(L / l) * Math.floor(W / w));
  }
  return best;
}

/** Kiểm tra mọi bất biến của 1 phương án đóng pallet. */
function assertValidPlan(type, config, containerHeight, plan, label) {
  const usable = Math.min(config.maxHeight, containerHeight) - config.baseHeight;
  if (plan.error) {
    const fitsFootprint = simpleGridBest(type, config) > 0;
    const fitsHeight = type.height <= usable;
    const fitsWeight = type.weight <= config.maxLoadWeight;
    assert.ok(!(fitsFootprint && fitsHeight && fitsWeight), `${label}: báo lỗi "${plan.error}" dù thùng đóng pallet được`);
    return;
  }

  assert.ok(plan.perLayer >= simpleGridBest(type, config), `${label}: số thùng/tầng kém hơn xếp lưới đơn giản`);
  if (config.maxLayers) assert.ok(plan.layers <= config.maxLayers, `${label}: vượt số tầng tối đa`);

  let boxesTotal = 0;
  for (const unit of plan.units) {
    const footprintOk =
      (unit.length === config.length && unit.width === config.width) ||
      (!type.allowRotate && unit.length === config.width && unit.width === config.length);
    assert.ok(footprintOk, `${label}: kích thước pallet sai`);
    assert.equal(unit.boxes.length, unit.boxCount, `${label}: số thùng trên pallet sai`);
    assert.ok(unit.boxCount <= plan.perPallet, `${label}: vượt số thùng/pallet`);
    assert.ok(unit.height <= Math.min(config.maxHeight, containerHeight) + EPS, `${label}: pallet cao quá giới hạn`);
    assert.ok(unit.boxCount * type.weight <= config.maxLoadWeight + EPS, `${label}: vượt tải hàng tối đa của pallet`);
    assert.ok(Math.abs(unit.weight - (config.palletWeight + unit.boxCount * type.weight)) < 1e-3, `${label}: cân nặng pallet sai`);
    assert.equal(unit.floorOnly, !config.stackable);
    assert.equal(unit.noTopLoad, !config.stackable);
    assert.equal(unit.allowRotate, type.allowRotate);

    for (const b of unit.boxes) {
      assert.ok(b.x >= -EPS && b.z >= -EPS && b.x + b.l <= unit.length + EPS && b.z + b.w <= unit.width + EPS, `${label}: thùng thò ra mép pallet`);
      assert.ok(b.y >= config.baseHeight - EPS && b.y + b.h <= unit.height + EPS, `${label}: thùng sai độ cao`);
      assert.equal(b.h, type.height, `${label}: thùng bị lật`);
      const layer = (b.y - config.baseHeight) / type.height;
      assert.ok(Math.abs(layer - Math.round(layer)) < 1e-6, `${label}: thùng không nằm đúng tầng`);
      const sameDir = b.l === type.length && b.w === type.width;
      assert.ok(sameDir || (type.allowRotate && b.l === type.width && b.w === type.length), `${label}: thùng xoay sai quy tắc`);
    }
    for (let i = 0; i < unit.boxes.length; i++) {
      for (let j = i + 1; j < unit.boxes.length; j++) {
        assert.ok(!boxesOverlap(unit.boxes[i], unit.boxes[j]), `${label}: thùng chồng lấn trên pallet`);
      }
    }
    boxesTotal += unit.boxCount * unit.quantity;

    const y1 = config.baseHeight + type.height;
    const hasSecondLayer = unit.boxes.some((b) => Math.abs(b.y - y1) < EPS);
    if (plan.pattern === 'interlock' && hasSecondLayer && unit.boxCount >= 2 * plan.perLayer) {
      assert.notEqual(layerKey(unit.boxes, config.baseHeight), layerKey(unit.boxes, y1), `${label}: răng lược nhưng 2 tầng giống nhau`);
    }
    if (plan.pattern === 'column' && unit.boxCount >= 2 * plan.perLayer) {
      assert.equal(layerKey(unit.boxes, config.baseHeight), layerKey(unit.boxes, y1), `${label}: thẳng cột nhưng 2 tầng khác nhau`);
    }
  }
  assert.equal(boxesTotal, type.quantity, `${label}: tổng thùng trên các pallet không bằng số lượng`);
  assert.equal(plan.palletCount, plan.units.reduce((s, u) => s + u.quantity, 0), `${label}: số pallet sai`);
}

test('ví dụ tính tay: thùng 40×30×30 trên pallet ISO 120×100', () => {
  const type = { id: 'a', length: 40, width: 30, height: 30, weight: 8, quantity: 100, allowRotate: true };
  const config = palletConfig('ISO', { maxHeight: 160 });
  const plan = planPallets(type, config, 239);
  // Diện tích 12.000 / 1.200 = tối đa 10 thùng/tầng; cao (160 − 15) / 30 = 4 tầng.
  assert.equal(plan.perLayer, 10);
  assert.equal(plan.layers, 4);
  assert.equal(plan.perPallet, 40);
  assert.equal(plan.palletCount, 3); // 40 + 40 + 20
  assert.equal(plan.palletHeight, 135);
  assert.equal(plan.palletWeight, 25 + 40 * 8);
  assertValidPlan(type, config, 239, plan, 'tính tay');
});

test('kiểu chong chóng: thùng 60×40 trên pallet vuông 110×110 được 4 thùng/tầng', () => {
  const type = { id: 'a', length: 60, width: 40, height: 50, weight: 1, quantity: 10, allowRotate: true };
  const plan = planPallets(type, palletConfig('SQ'), 239);
  assert.equal(plan.perLayer, 4);
});

test('thùng không cho xoay vẫn đóng được bằng cách xoay cả pallet', () => {
  // 50 × 110 không vừa pallet ISO theo chiều 120 × 100, nhưng vừa khi pallet đặt ngang (100 × 120).
  const type = { id: 'a', length: 50, width: 110, height: 30, weight: 1, quantity: 10, allowRotate: false };
  const config = palletConfig('ISO');
  const plan = planPallets(type, config, 239);
  assert.equal(plan.error, null);
  assert.equal(plan.perLayer, 2);
  assert.equal(plan.units[0].length, 100);
  assert.equal(plan.units[0].width, 120);
  assertValidPlan(type, config, 239, plan, 'xoay pallet');
});

test('giới hạn tải hàng tối đa và số tầng tối đa', () => {
  const type = { id: 'a', length: 40, width: 30, height: 30, weight: 30, quantity: 100, allowRotate: true };
  const byWeight = planPallets(type, palletConfig('ISO', { maxLoadWeight: 500 }), 239);
  assert.equal(byWeight.perPallet, 16); // 500 / 30
  assert.equal(byWeight.limitedByWeight, true);
  const byLayers = planPallets(type, palletConfig('ISO', { maxLayers: 2 }), 239);
  assert.equal(byLayers.perPallet, 20);
});

test('báo lỗi đúng khi không đóng pallet được', () => {
  const config = palletConfig('EUR');
  assert.match(planPallets({ id: 'a', length: 130, width: 90, height: 30, weight: 1, quantity: 1, allowRotate: true }, config, 239).error, /mặt pallet/);
  assert.match(planPallets({ id: 'a', length: 40, width: 30, height: 200, weight: 1, quantity: 1, allowRotate: true }, config, 239).error, /cao/);
  assert.match(planPallets({ id: 'a', length: 40, width: 30, height: 30, weight: 2000, quantity: 1, allowRotate: true }, config, 239).error, /nặng/);
});

test('chiều cao pallet không vượt chiều cao container', () => {
  const type = { id: 'a', length: 40, width: 30, height: 30, weight: 1, quantity: 500, allowRotate: true };
  const plan = planPallets(type, palletConfig('ISO', { maxHeight: 400 }), 220);
  assert.ok(plan.palletHeight <= 220);
});

test('ngẫu nhiên: mọi phương án đóng pallet hợp lệ', () => {
  const rand = createRandom(7);
  for (let run = 0; run < 600; run++) {
    const preset = rand.pick(PALLET_PRESETS);
    const config = palletConfig(preset.id, {
      maxHeight: rand.int(80, 260),
      maxLoadWeight: rand.int(100, 2000),
      maxLayers: rand.bool(0.3) ? rand.int(1, 8) : null,
      pattern: rand.pick(['column', 'interlock']),
      stackable: rand.bool(),
    });
    const [type] = randomCargoTypes(rand, { count: 1, maxQty: 300, minSize: 8, maxSize: 130 });
    const containerHeight = rand.pick([220, 239, 269]);
    assertValidPlan(type, config, containerHeight, planPallets(type, config, containerHeight), `lần ${run} (${preset.id})`);
  }
});

/** Đổi kết quả planLoading thành toàn bộ khối thật trong container: hàng rời, đế pallet, từng thùng trên pallet. */
function realBlocks(result) {
  const blocks = [];
  for (const item of result.placed) {
    if (!item.pallet) {
      blocks.push({ ...item, kind: 'loose' });
      continue;
    }
    blocks.push({ x: item.x, y: item.y, z: item.z, l: item.l, h: item.pallet.baseHeight, w: item.w, kind: 'base' });
    for (const b of item.pallet.boxes) {
      blocks.push({ ...b, x: item.x + b.x, y: item.y + b.y, z: item.z + b.z, typeId: item.typeId, kind: 'box', pallet: item });
    }
  }
  return blocks;
}

test('ngẫu nhiên: phương án tổng (pallet + hàng rời) hợp lệ trong container', () => {
  const rand = createRandom(99);
  for (let run = 0; run < 250; run++) {
    const container = rand.pick(CONTAINER_PRESETS);
    const cargo = randomCargoTypes(rand, { count: rand.int(1, 5), maxQty: 200, minSize: 10, maxSize: 90 });
    cargo.forEach((type) => (type.palletize = rand.bool(0.5)));
    const config = palletConfig(rand.pick(PALLET_PRESETS).id, {
      maxHeight: rand.int(100, 200),
      pattern: rand.pick(['column', 'interlock']),
      stackable: rand.bool(),
    });
    const label = `lần ${run}`;
    const result = planLoading(container, cargo, config);
    const blocks = realBlocks(result);

    // Mọi khối thật (thùng, đế pallet, hàng rời) nằm trong container và không chồng lấn nhau.
    assert.deepEqual(checkBoxesInContainer(blocks, container, { checkSupport: false }), [], `${label}: vi phạm hình học`);

    for (const block of blocks.filter((b) => b.kind === 'box')) {
      const type = cargo.find((t) => t.id === block.typeId);
      assert.equal(block.h, type.height, `${label}: thùng trên pallet bị lật`);
      if (!type.allowRotate) {
        assert.ok(block.l === type.length && block.w === type.width, `${label}: thùng cấm xoay bị xoay trong container`);
      }
      const p = block.pallet;
      assert.ok(block.x >= p.x - EPS && block.x + block.l <= p.x + p.l + EPS && block.z >= p.z - EPS && block.z + block.w <= p.z + p.w + EPS, `${label}: thùng thò ra mép pallet`);
    }

    // Pallet không chồng: chỉ nằm trên sàn và không có gì đè lên.
    if (!config.stackable) {
      for (const item of result.placed.filter((i) => i.pallet)) {
        assert.equal(item.y, 0, `${label}: pallet không chồng mà nằm trên cao`);
        const onTop = result.placed.some(
          (q) => q !== item && Math.abs(q.y - (item.y + item.h)) < EPS &&
            q.x < item.x + item.l - EPS && item.x < q.x + q.l - EPS && q.z < item.z + item.w - EPS && item.z < q.z + q.w - EPS,
        );
        assert.ok(!onTop, `${label}: có hàng đè lên pallet`);
      }
    }

    // Số liệu quy đổi về thùng khớp với các khối thật.
    for (const stat of result.typeStats) {
      const type = cargo.find((t) => t.id === stat.typeId);
      const looseCount = blocks.filter((b) => b.kind === 'loose' && b.typeId === stat.typeId).length;
      const boxCount = blocks.filter((b) => b.kind === 'box' && b.typeId === stat.typeId).length;
      assert.equal(stat.placed, looseCount + boxCount, `${label}: số xếp được của ${stat.typeId} sai`);
      assert.equal(stat.unplaced, type.quantity - stat.placed, `${label}: số còn dư sai`);
      if (type.palletize) {
        assert.equal(looseCount, 0, `${label}: hàng đóng pallet lại nằm rời`);
        const pallets = result.placed.filter((i) => i.pallet && i.typeId === stat.typeId).length;
        assert.equal(stat.palletsPlaced, pallets, `${label}: số pallet đã xếp sai`);
      } else {
        assert.equal(boxCount, 0, `${label}: hàng rời lại nằm trên pallet`);
      }
    }
    assert.equal(result.placedCount, result.typeStats.reduce((s, t) => s + t.placed, 0));
    assert.equal(result.totalPieces, cargo.reduce((s, t) => s + t.quantity, 0));
    assert.ok(result.totalWeight <= container.maxWeight + EPS, `${label}: vượt tải trọng`);
  }
});

test('kiểm tra form cấu hình pallet', () => {
  assert.deepEqual(validatePalletSettings(DEFAULT_PALLET_SETTINGS), {});
  assert.ok(validatePalletSettings({ ...DEFAULT_PALLET_SETTINGS, maxHeight: '10' }).maxHeight);
  assert.ok(validatePalletSettings({ ...DEFAULT_PALLET_SETTINGS, maxLayers: '2.5' }).maxLayers);
  assert.equal(resolvePalletConfig({ ...DEFAULT_PALLET_SETTINGS, baseHeight: '' }), null);
  const eur = resolvePalletConfig({ ...DEFAULT_PALLET_SETTINGS, presetId: 'EUR' });
  assert.equal(eur.length, 120);
  assert.equal(eur.width, 80);
});

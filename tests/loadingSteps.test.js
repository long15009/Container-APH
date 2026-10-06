// Kiểm tra chia bước đóng hàng (src/report/loadingSteps.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLoadingSteps } from '../src/report/loadingSteps.js';
import { planLoading } from '../src/engine/planLoading.js';
import { overlapLength } from '../src/engine/geometry.js';
import { CONTAINER_PRESETS } from '../src/data/containerPresets.js';
import { DEFAULT_PALLET_SETTINGS, resolvePalletConfig } from '../src/data/palletPresets.js';
import { EPS, createRandom, randomCargoTypes } from './helpers.js';

function restsOn(upper, lower) {
  return (
    Math.abs(lower.y + lower.h - upper.y) < EPS &&
    overlapLength(upper.x, upper.x + upper.l, lower.x, lower.x + lower.l) > EPS &&
    overlapLength(upper.z, upper.z + upper.w, lower.z, lower.z + lower.w) > EPS
  );
}

test('không có hàng thì không có bước nào', () => {
  assert.deepEqual(computeLoadingSteps({ length: 590 }, []), []);
});

test('kiện đè lên kiện của bước sau thì phải dời sang bước sau', () => {
  const container = { length: 600 };
  // Đoạn mỗi bước = 200 cm. Kiện B bắt đầu ở x=150 (đoạn 1) nhưng nằm trên kiện A bắt đầu ở x=200 (đoạn 2).
  const a = { typeId: 'a', x: 200, y: 0, z: 0, l: 100, h: 50, w: 50 };
  const b = { typeId: 'b', x: 150, y: 50, z: 0, l: 100, h: 50, w: 50 };
  const steps = computeLoadingSteps(container, [b, a]);
  assert.equal(steps.length, 1);
  assert.deepEqual(steps[0].items, [a, b], 'trong 1 bước, kiện dưới xếp trước');
});

test('ngẫu nhiên: mọi kiện thuộc đúng 1 bước, kiện đỡ không bao giờ ở bước sau, số lượng khớp', () => {
  const rand = createRandom(42);
  for (let run = 0; run < 60; run++) {
    const container = rand.pick(CONTAINER_PRESETS);
    const cargo = randomCargoTypes(rand, { count: rand.int(1, 4), maxQty: 150, minSize: 20, maxSize: 90 });
    cargo.forEach((t) => (t.palletize = rand.bool(0.3)));
    const config = { ...resolvePalletConfig(DEFAULT_PALLET_SETTINGS), stackable: rand.bool() };
    const result = planLoading(container, cargo, config);
    const steps = computeLoadingSteps(container, result.placed);

    const stepOf = new Map();
    steps.forEach((step, s) => step.items.forEach((item) => stepOf.set(item, s)));
    assert.equal(stepOf.size, result.placed.length, `lần ${run}: có kiện bị thiếu hoặc lặp`);
    for (const upper of result.placed) {
      for (const lower of result.placed) {
        if (upper !== lower && restsOn(upper, lower)) {
          assert.ok(stepOf.get(lower) <= stepOf.get(upper), `lần ${run}: kiện đỡ được xếp sau kiện nằm trên`);
        }
      }
    }
    steps.forEach((step, s) => assert.equal(step.number, s + 1));
    const pieces = steps.reduce((sum, step) => sum + [...step.countsByType.values()].reduce((a, c) => a + c.pieces, 0), 0);
    assert.equal(pieces, result.placedCount, `lần ${run}: tổng số thùng theo bước khác số đã xếp`);
  }
});

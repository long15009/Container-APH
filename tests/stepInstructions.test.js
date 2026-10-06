// Kiểm tra mô tả bằng chữ của từng bước đóng hàng (src/report/stepInstructions.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeLoadingStep } from '../src/report/stepInstructions.js';
import { computeLoadingSteps } from '../src/report/loadingSteps.js';
import { planLoading } from '../src/engine/planLoading.js';
import { DEFAULT_PALLET_SETTINGS, resolvePalletConfig } from '../src/data/palletPresets.js';

const container = { length: 600, width: 240, height: 240 };

test('lưới đều trên sàn, đặt dọc, phủ hết chiều rộng; tầng 2 xoay ngang sát vách phải', () => {
  const cargo = new Map([['a', { id: 'a', name: 'Thùng A', length: 60, width: 40, height: 50, unit: 'cm' }]]);
  const items = [];
  for (let z = 0; z < 240; z += 40) for (let x = 0; x < 120; x += 60) items.push({ typeId: 'a', x, y: 0, z, l: 60, h: 50, w: 40 });
  items.push({ typeId: 'a', x: 0, y: 50, z: 0, l: 40, h: 50, w: 60 });
  assert.deepEqual(describeLoadingStep({ items }, container, cargo), [
    {
      heading: '1) Trên sàn cont',
      details: [
        'Thùng A: 12 kiện — đặt dọc (cạnh 60 cm theo chiều dài cont), 6 theo chiều rộng × 2 theo chiều dài; đoạn 0 m – 1,2 m, phủ hết chiều rộng cont.',
      ],
    },
    {
      heading: '2) Tầng có đáy ở độ cao 50 cm, đặt lên trên hàng đã xếp',
      details: [
        'Thùng A: 1 kiện — xoay ngang (cạnh 60 cm theo chiều rộng cont); đoạn 0 m – 0,4 m, sát vách phải, chiếm 60 cm chiều rộng.',
      ],
    },
  ]);
});

test('kích thước hiển thị theo đơn vị người dùng đã nhập (mm)', () => {
  const cargo = new Map([['a', { id: 'a', name: 'Hộp', length: 50, width: 30, height: 20, unit: 'mm' }]]);
  const [level] = describeLoadingStep({ items: [{ typeId: 'a', x: 0, y: 0, z: 210, l: 50, h: 20, w: 30 }] }, container, cargo);
  assert.match(level.details[0], /cạnh 500 mm theo chiều dài cont/);
  assert.match(level.details[0], /sát vách trái, chiếm 30 cm chiều rộng/);
});

test('pallet được mô tả riêng, có số thùng/pallet và chiều cao', () => {
  const cargo = [{ id: 'p', name: 'Thùng nhỏ', length: 40, width: 30, height: 30, weight: 8, quantity: 80, allowRotate: true, palletize: true }];
  const result = planLoading({ length: 590, width: 235, height: 239, maxWeight: 28200 }, cargo, resolvePalletConfig(DEFAULT_PALLET_SETTINGS));
  const steps = computeLoadingSteps({ length: 590 }, result.placed);
  const text = steps
    .flatMap((s) => describeLoadingStep(s, { length: 590, width: 235, height: 239 }, new Map([['p', cargo[0]]])))
    .flatMap((level) => level.details)
    .join('\n');
  assert.match(text, /Thùng nhỏ: \d+ pallet \(mỗi pallet 40 thùng, cao 135 cm\) — dùng xe nâng/);
});

test('mọi kiện của bước đều được nhắc tới đúng số lượng', () => {
  const cargo = [
    { id: 'a', name: 'A', length: 45, width: 30, height: 30, weight: 6, quantity: 300, allowRotate: true },
    { id: 'b', name: 'B', length: 30, width: 20, height: 30, weight: 10, quantity: 200, allowRotate: false },
  ];
  const vehicle = { length: 1203, width: 235, height: 269, maxWeight: 26500 };
  const result = planLoading(vehicle, cargo, null);
  const cargoById = new Map(cargo.map((c) => [c.id, c]));
  for (const step of computeLoadingSteps(vehicle, result.placed)) {
    const details = describeLoadingStep(step, vehicle, cargoById).flatMap((level) => level.details);
    const mentioned = details.reduce((sum, line) => sum + Number(line.match(/^[AB]: ([\d.]+) kiện/)[1].replace(/\./g, '')), 0);
    assert.equal(mentioned, step.items.length);
  }
});

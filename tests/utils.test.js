// Kiểm tra quy đổi đơn vị và bộ lọc hiển thị mặt cắt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertLengthFields, fromCm, toCm } from '../src/utils/units.js';
import { DEFAULT_VIEW_FILTER, getSectionCut, isItemVisible } from '../src/three/visibility.js';

test('quy đổi cm / mm', () => {
  assert.equal(toCm(600, 'mm'), 60);
  assert.equal(toCm(505, 'mm'), 50.5);
  assert.equal(toCm(3, 'mm'), 0.3);
  assert.equal(fromCm(12.3, 'mm'), 123);
  // Các giá trị dễ sinh sai số dấu phẩy động (0.57 * 10 = 5.699999999999999 nếu không làm tròn).
  assert.equal(fromCm(0.57, 'mm'), 5.7);
  assert.equal(fromCm(0.07, 'mm'), 0.7);
  assert.equal(fromCm(60, 'cm'), 60);
  for (let v = 1; v < 3000; v += 7) assert.equal(fromCm(toCm(v, 'mm'), 'mm'), v, `mm ${v} đi rồi về bị lệch`);
  assert.deepEqual(convertLengthFields({ length: '60', width: '', height: 'abc', weight: '5' }, ['length', 'width', 'height'], 'cm', 'mm'), {
    length: '600',
    width: '',
    height: 'abc',
    weight: '5',
  });
});

test('mặt cắt và ẩn theo loại hàng', () => {
  const container = { length: 600, width: 200, height: 250 };
  const item = { typeId: 'a', x: 300, y: 100, z: 50 };
  assert.equal(isItemVisible(item, container, DEFAULT_VIEW_FILTER), true);
  assert.equal(getSectionCut(container, { ...DEFAULT_VIEW_FILTER, axis: 'x', ratio: 0.5 }), 300);
  assert.equal(isItemVisible(item, container, { ...DEFAULT_VIEW_FILTER, axis: 'x', ratio: 0.5 }), false, 'kiện bắt đầu đúng tại mặt cắt thì ẩn');
  assert.equal(isItemVisible(item, container, { ...DEFAULT_VIEW_FILTER, axis: 'x', ratio: 0.51 }), true);
  assert.equal(isItemVisible(item, container, { ...DEFAULT_VIEW_FILTER, axis: 'y', ratio: 0.3 }), false);
  assert.equal(isItemVisible(item, container, { ...DEFAULT_VIEW_FILTER, axis: 'z', ratio: 0.3 }), true);
  assert.equal(isItemVisible(item, container, { ...DEFAULT_VIEW_FILTER, ratio: 0 }), false);
  assert.equal(isItemVisible(item, container, { ...DEFAULT_VIEW_FILTER, hiddenTypeIds: new Set(['a']) }), false);
});

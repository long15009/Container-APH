// Kiểm tra đọc danh sách hàng từ bảng tính (src/import/parseCargoSheet.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBoolean, parseCargoRows, parseNumber } from '../src/import/parseCargoSheet.js';

test('đọc số kiểu Việt Nam và kiểu quốc tế', () => {
  assert.equal(parseNumber(12), 12);
  assert.equal(parseNumber('12,5'), 12.5);
  assert.equal(parseNumber('12.5'), 12.5);
  assert.equal(parseNumber('1.200'), 1200);
  assert.equal(parseNumber('1,200'), 1200);
  assert.equal(parseNumber('0,125'), 0.125);
  assert.equal(parseNumber('1.234,5'), 1234.5);
  assert.equal(parseNumber('1,234.5'), 1234.5);
  assert.equal(parseNumber(' 60 '), 60);
  assert.ok(Number.isNaN(parseNumber('abc')));
  assert.ok(Number.isNaN(parseNumber('')));
});

test('đọc ô Có/Không', () => {
  assert.equal(parseBoolean('Có', false), true);
  assert.equal(parseBoolean('co', false), true);
  assert.equal(parseBoolean('x', false), true);
  assert.equal(parseBoolean('Không', true), false);
  assert.equal(parseBoolean('', true), true);
  assert.equal(parseBoolean('', false), false);
  assert.equal(parseBoolean('có thể', true), undefined);
});

test('đọc file mẫu (tiêu đề tiếng Việt có dấu)', () => {
  const rows = [
    ['Tên hàng', 'Dài (cm)', 'Rộng (cm)', 'Cao (cm)', 'Cân nặng (kg)', 'Số lượng', 'Cho xoay (Có/Không)', 'Đóng pallet (Có/Không)'],
    ['Thùng nước', 40, 27, 25, 9, 600, 'Có', 'Không'],
    ['Thùng dầu', 30, 20, 30, 10, 250, 'Không', 'Có'],
    ['', '', '', '', '', '', '', ''],
  ];
  const { items, errors, warnings } = parseCargoRows(rows);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  assert.deepEqual(items, [
    { name: 'Thùng nước', length: 40, width: 27, height: 25, unit: 'cm', weight: 9, quantity: 600, allowRotate: true, palletize: false },
    { name: 'Thùng dầu', length: 30, width: 20, height: 30, unit: 'cm', weight: 10, quantity: 250, allowRotate: false, palletize: true },
  ]);
});

test('tiêu đề không dấu / tiếng Anh, đơn vị mm, cột xếp lộn xộn, có dòng tiêu đề phụ phía trên', () => {
  const rows = [
    ['DANH SACH HANG XUAT KHAU'],
    [],
    ['Qty', 'Length (mm)', 'Width (mm)', 'Height (mm)', 'Weight', 'Ten hang'],
    ['10', '600', '400', '505', '18,5', 'Carton A'],
  ];
  const { items, errors } = parseCargoRows(rows);
  assert.deepEqual(errors, []);
  assert.equal(items.length, 1);
  assert.deepEqual(items[0], {
    name: 'Carton A', length: 60, width: 40, height: 50.5, unit: 'mm', weight: 18.5, quantity: 10, allowRotate: true, palletize: false,
  });
});

test('"Trọng lượng" không bị nhận nhầm là cột Rộng', () => {
  const rows = [
    ['Tên', 'Dài', 'Rộng', 'Cao', 'Trọng lượng', 'SL'],
    ['A', 10, 20, 30, 5, 2],
  ];
  const { items, errors } = parseCargoRows(rows);
  assert.deepEqual(errors, []);
  assert.equal(items[0].width, 20);
  assert.equal(items[0].weight, 5);
});

test('báo lỗi theo từng dòng, vẫn nhận các dòng đúng', () => {
  const rows = [
    ['Tên hàng', 'Dài', 'Rộng', 'Cao', 'Cân nặng', 'Số lượng', 'Xoay'],
    ['OK', 10, 10, 10, 1, 5, ''],
    ['Thiếu dài', '', 10, 10, 1, 5, ''],
    ['SL lẻ', 10, 10, 10, 1, 2.5, ''],
    ['Xoay sai', 10, 10, 10, 1, 1, 'có thể'],
    ['', 20, 20, 20, '', 3, ''],
  ];
  const { items, errors } = parseCargoRows(rows);
  assert.equal(items.length, 2);
  assert.equal(items[1].name, 'Hàng 2', 'tên trống được đặt tự động');
  assert.equal(items[1].weight, 0, 'cân nặng trống tính là 0');
  assert.equal(errors.length, 3);
  assert.match(errors[0], /^Dòng 3: Dài/);
  assert.match(errors[1], /^Dòng 4: Số lượng/);
  assert.match(errors[2], /^Dòng 5: Cột xoay/);
});

test('thiếu cột bắt buộc thì báo rõ thiếu cột nào', () => {
  const { items, errors } = parseCargoRows([['Tên', 'Dài', 'Rộng'], ['A', 1, 2]]);
  assert.equal(items.length, 0);
  assert.match(errors[0], /Cao, Số lượng/);
});

test('không có cột cân nặng thì cảnh báo', () => {
  const { items, warnings } = parseCargoRows([['Dài', 'Rộng', 'Cao', 'Số lượng'], [1, 2, 3, 4]]);
  assert.equal(items.length, 1);
  assert.equal(warnings.length, 1);
});

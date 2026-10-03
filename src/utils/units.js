// Đơn vị nhập kích thước. Toàn bộ dữ liệu nội bộ (engine, 3D) luôn dùng cm;
// chỉ quy đổi ở ranh giới nhập liệu / hiển thị.
export const LENGTH_UNITS = [
  { value: 'cm', label: 'cm' },
  { value: 'mm', label: 'mm' },
];

export const DEFAULT_LENGTH_UNIT = 'cm';

const MM_PER_UNIT = { cm: 10, mm: 1 };

// Làm tròn để tránh sai số dấu phẩy động (vd 12.3 * 10 = 123.00000000000001).
function roundClean(value) {
  return Math.round(value * 1e6) / 1e6;
}

/** Quy đổi giá trị theo `unit` sang cm. */
export function toCm(value, unit = DEFAULT_LENGTH_UNIT) {
  return roundClean((value * MM_PER_UNIT[unit]) / MM_PER_UNIT.cm);
}

/** Quy đổi giá trị cm sang `unit`. */
export function fromCm(valueCm, unit = DEFAULT_LENGTH_UNIT) {
  return roundClean((valueCm * MM_PER_UNIT.cm) / MM_PER_UNIT[unit]);
}

/**
 * Quy đổi các ô kích thước (giá trị chuỗi trong form) khi người dùng đổi đơn vị, để kích thước thực không đổi.
 * Ô trống hoặc không phải số được giữ nguyên.
 */
export function convertLengthFields(values, fieldNames, fromUnit, toUnit) {
  const next = { ...values };
  for (const name of fieldNames) {
    const number = Number(values[name]);
    if (values[name] !== '' && Number.isFinite(number)) next[name] = String(fromCm(toCm(number, fromUnit), toUnit));
  }
  return next;
}

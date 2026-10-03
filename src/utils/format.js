// Định dạng số theo kiểu Việt Nam.
const integerFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

export function formatNumber(value) {
  return Number.isInteger(value) ? integerFormat.format(value) : decimalFormat.format(value);
}

export function formatPercent(ratio) {
  return `${decimalFormat.format(Math.round(ratio * 1000) / 10)}%`;
}

/** Thể tích cm³ -> m³ */
export function formatCubicMeters(volumeCm3) {
  return `${decimalFormat.format(volumeCm3 / 1e6)} m³`;
}

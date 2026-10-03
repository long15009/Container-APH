// Các loại pallet theo chuẩn quốc tế. Kích thước mặt pallet tính bằng mm;
// chiều cao đế (cm) và cân nặng pallet (kg) là giá trị thông dụng, người dùng sửa được.
export const PALLET_PRESETS = [
  { id: 'ISO', name: 'Pallet tiêu chuẩn (ISO)', lengthMm: 1200, widthMm: 1000, market: 'Châu Á, châu Âu', baseHeight: 15, palletWeight: 25 },
  { id: 'EUR', name: 'Euro pallet (EUR/EPAL)', lengthMm: 1200, widthMm: 800, market: 'Châu Âu', baseHeight: 14.4, palletWeight: 25 },
  { id: 'US', name: 'Pallet Mỹ (48" × 40")', lengthMm: 1219, widthMm: 1016, market: 'Mỹ, Canada', baseHeight: 14, palletWeight: 20 },
  { id: 'SQ', name: 'Pallet vuông', lengthMm: 1100, widthMm: 1100, market: 'Nhật Bản, Hàn Quốc, châu Á', baseHeight: 14, palletWeight: 20 },
];

export const STACKING_PATTERNS = [
  {
    value: 'column',
    label: 'Thẳng cột',
    description: 'Xếp thẳng cột (column stack): thùng chịu lực tốt nhất, nhưng khối hàng dễ bị đổ nghiêng.',
  },
  {
    value: 'interlock',
    label: 'Răng lược',
    description:
      'Xếp cài răng lược (interlock): các tầng đặt so le nên khối hàng chắc hơn, nhưng sức chịu nén của thùng giảm khoảng 40–50% — nên giảm số tầng tối đa.',
  },
];

/** Giá trị form cấu hình pallet (dạng chuỗi để gõ tự do). */
export const DEFAULT_PALLET_SETTINGS = {
  presetId: 'ISO',
  baseHeight: '15',
  palletWeight: '25',
  maxHeight: '160',
  maxLoadWeight: '1000',
  maxLayers: '',
  pattern: 'column',
  stackable: false,
};

export function getPalletPreset(id) {
  return PALLET_PRESETS.find((preset) => preset.id === id);
}

/** Kiểm tra từng ô; trả về object lỗi theo tên ô (rỗng nếu hợp lệ). */
export function validatePalletSettings(settings) {
  const errors = {};
  const num = (name) => Number(settings[name]);
  if (!(num('baseHeight') > 0)) errors.baseHeight = 'Phải lớn hơn 0';
  if (settings.palletWeight === '' || !(num('palletWeight') >= 0)) errors.palletWeight = 'Không hợp lệ';
  if (!(num('maxHeight') > num('baseHeight'))) errors.maxHeight = 'Phải cao hơn đế';
  if (!(num('maxLoadWeight') > 0)) errors.maxLoadWeight = 'Phải lớn hơn 0';
  if (settings.maxLayers !== '' && !(Number.isInteger(num('maxLayers')) && num('maxLayers') > 0)) {
    errors.maxLayers = 'Số nguyên > 0';
  }
  return errors;
}

/** Chuyển giá trị form sang cấu hình số (cm, kg) cho engine; null nếu chưa hợp lệ. */
export function resolvePalletConfig(settings) {
  if (Object.keys(validatePalletSettings(settings)).length > 0) return null;
  const preset = getPalletPreset(settings.presetId);
  return {
    presetId: preset.id,
    length: preset.lengthMm / 10,
    width: preset.widthMm / 10,
    baseHeight: Number(settings.baseHeight),
    palletWeight: Number(settings.palletWeight),
    maxHeight: Number(settings.maxHeight),
    maxLoadWeight: Number(settings.maxLoadWeight),
    maxLayers: settings.maxLayers === '' ? null : Number(settings.maxLayers),
    pattern: settings.pattern,
    stackable: settings.stackable,
  };
}

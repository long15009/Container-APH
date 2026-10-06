// Chuyển các dòng của bảng tính (mảng 2 chiều) thành danh sách loại hàng.
// Hàm thuần, không phụ thuộc thư viện đọc file -> dễ kiểm tra.
import { toCm } from '../utils/units.js';

const HEADER_SEARCH_ROWS = 10;

/** Bỏ dấu tiếng Việt, chữ thường, gọn khoảng trắng — để so khớp tiêu đề cột linh hoạt. */
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Nhận diện tiêu đề cột. Thứ tự kiểm tra quan trọng:
 * "trọng lượng" chứa "rong" nên phải xét cân nặng trước chiều rộng.
 */
function classifyHeader(header) {
  const h = normalizeText(header);
  if (!h) return null;
  if (h.includes('pallet')) return 'palletize';
  if (h.includes('xoay') || h.includes('rotate')) return 'allowRotate';
  if (h.includes('can nang') || h.includes('trong luong') || h.includes('weight') || h === 'kg') return 'weight';
  if (h.includes('so luong') || h === 'sl' || h.startsWith('sl ') || h.includes('qty') || h.includes('quantity')) return 'quantity';
  if (h.includes('ten') || h.includes('name') || h.includes('hang hoa') || h.includes('san pham') || h.includes('mo ta')) return 'name';
  if (h.includes('dai') || h.includes('length') || h === 'l' || h.startsWith('l (')) return 'length';
  if (h.includes('rong') || h.includes('width') || h === 'w' || h.startsWith('w (')) return 'width';
  if (h.includes('cao') || h.includes('height') || h === 'h' || h.startsWith('h (')) return 'height';
  return null;
}

function headerUnit(header) {
  const h = normalizeText(header);
  if (/\bmm\b/.test(h)) return 'mm';
  if (/\bcm\b/.test(h)) return 'cm';
  return null;
}

/**
 * Đọc số từ ô bảng tính. Chấp nhận số thật, "12,5" / "12.5" (thập phân), "1.200" / "1,200" (phân cách nghìn).
 * Trả về NaN nếu không đọc được.
 */
export function parseNumber(value) {
  if (typeof value === 'number') return value;
  let s = String(value ?? '').replace(/\s/g, '');
  if (s === '') return NaN;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    // Có cả 2 dấu: dấu xuất hiện sau cùng là dấu thập phân.
    const decimal = lastDot > lastComma ? '.' : ',';
    const thousands = decimal === '.' ? ',' : '.';
    s = s.split(thousands).join('').replace(decimal, '.');
  } else {
    const sep = lastDot >= 0 ? '.' : lastComma >= 0 ? ',' : null;
    if (sep) {
      const parts = s.split(sep);
      const looksLikeThousands = parts.length > 2 || (parts[1].length === 3 && parts[0] !== '0' && parts[0] !== '-0');
      s = looksLikeThousands ? parts.join('') : parts.join('.');
    }
  }
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

const TRUE_WORDS = new Set(['co', 'x', 'yes', 'y', '1', 'true', 'dung', 'v', 'ok', '✓', '✔']);
const FALSE_WORDS = new Set(['khong', 'ko', 'k', 'no', 'n', '0', 'false', 'sai']);

/** Đọc ô Có/Không. Ô trống -> giá trị mặc định; không hiểu -> undefined. */
export function parseBoolean(value, defaultValue) {
  if (typeof value === 'boolean') return value;
  const s = normalizeText(value);
  if (s === '') return defaultValue;
  if (TRUE_WORDS.has(s)) return true;
  if (FALSE_WORDS.has(s)) return false;
  return undefined;
}

const REQUIRED_COLUMNS = { length: 'Dài', width: 'Rộng', height: 'Cao', quantity: 'Số lượng' };

function findHeaderRow(rows) {
  let best = { index: -1, columns: {} };
  rows.slice(0, HEADER_SEARCH_ROWS).forEach((row, index) => {
    const columns = {};
    (row || []).forEach((cell, col) => {
      const key = classifyHeader(cell);
      if (key && columns[key] === undefined) columns[key] = col;
    });
    if (Object.keys(columns).length > Object.keys(best.columns).length) best = { index, columns };
  });
  return best;
}

/**
 * @param rows mảng các dòng (mỗi dòng là mảng giá trị ô), dòng đầu có thể là tiêu đề
 * @param defaultUnit đơn vị kích thước khi tiêu đề cột không ghi cm/mm
 * @returns {{ items: Array, errors: string[], warnings: string[] }}
 *   items: { name, length, width, height (cm), unit, weight, quantity, allowRotate, palletize }
 */
export function parseCargoRows(rows, defaultUnit = 'cm') {
  const items = [];
  const errors = [];
  const warnings = [];

  const { index: headerIndex, columns } = findHeaderRow(rows);
  const missing = Object.keys(REQUIRED_COLUMNS).filter((key) => columns[key] === undefined);
  if (headerIndex < 0 || missing.length > 0) {
    errors.push(
      `Không tìm thấy cột: ${missing.map((key) => REQUIRED_COLUMNS[key]).join(', ')}. ` +
        'Dòng tiêu đề cần có các cột Dài, Rộng, Cao, Số lượng (xem file mẫu).',
    );
    return { items, errors, warnings };
  }
  if (columns.weight === undefined) warnings.push('Không có cột Cân nặng — cân nặng được tính là 0 kg.');

  const header = rows[headerIndex];
  const units = ['length', 'width', 'height'].map((key) => headerUnit(header[columns[key]]) || defaultUnit);
  const displayUnit = units.every((u) => u === units[0]) ? units[0] : 'cm';

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    if (row.every((cell) => String(cell ?? '').trim() === '')) continue;
    const rowLabel = `Dòng ${r + 1}`;
    const cell = (key) => (columns[key] === undefined ? '' : row[columns[key]]);
    const rowErrors = [];

    const dims = ['length', 'width', 'height'].map((key, i) => {
      const n = parseNumber(cell(key));
      if (!(n > 0)) rowErrors.push(`${REQUIRED_COLUMNS[key]} không hợp lệ (“${cell(key)}”)`);
      return toCm(n, units[i]);
    });
    const weight = columns.weight === undefined || String(cell('weight')).trim() === '' ? 0 : parseNumber(cell('weight'));
    if (!(weight >= 0)) rowErrors.push(`Cân nặng không hợp lệ (“${cell('weight')}”)`);
    const quantity = parseNumber(cell('quantity'));
    if (!(Number.isInteger(quantity) && quantity > 0)) rowErrors.push(`Số lượng phải là số nguyên > 0 (“${cell('quantity')}”)`);
    const allowRotate = parseBoolean(cell('allowRotate'), true);
    if (allowRotate === undefined) rowErrors.push(`Cột xoay chỉ nhận Có/Không (“${cell('allowRotate')}”)`);
    const palletize = parseBoolean(cell('palletize'), false);
    if (palletize === undefined) rowErrors.push(`Cột pallet chỉ nhận Có/Không (“${cell('palletize')}”)`);

    if (rowErrors.length > 0) {
      errors.push(`${rowLabel}: ${rowErrors.join('; ')}`);
      continue;
    }
    const name = String(cell('name') ?? '').trim() || `Hàng ${items.length + 1}`;
    items.push({
      name,
      length: dims[0],
      width: dims[1],
      height: dims[2],
      unit: displayUnit,
      weight,
      quantity,
      allowRotate,
      palletize,
    });
  }

  if (items.length === 0 && errors.length === 0) errors.push('File không có dòng hàng hóa nào dưới dòng tiêu đề.');
  return { items, errors, warnings };
}

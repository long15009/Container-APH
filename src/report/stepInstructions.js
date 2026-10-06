// Sinh mô tả bằng chữ cho 1 bước đóng hàng: chia theo tầng (độ cao mặt đáy), mỗi tầng nói rõ
// từng loại hàng xếp bao nhiêu, đặt hướng nào, thành lưới mấy × mấy, nằm ở đoạn nào của cont.
// Quy ước trái/phải: đứng ở cửa cont nhìn vào trong (vách phải là z = 0, vách trái là z = chiều rộng).
import { formatNumber } from '../utils/format.js';
import { DEFAULT_LENGTH_UNIT, fromCm } from '../utils/units.js';

const WALL_TOLERANCE = 2; // cm — coi như sát vách nếu cách vách không quá 2 cm
const round = (v) => Math.round(v * 100) / 100;

function meters(cm) {
  return `${formatNumber(Math.round(cm) / 100)} m`;
}

function centimeters(cm) {
  return `${formatNumber(round(cm))} cm`;
}

function dimension(cm, unit) {
  return `${formatNumber(fromCm(cm, unit))} ${unit}`;
}

/** Mô tả vị trí theo chiều rộng cont. */
function widthPosition(zMin, zMax, containerWidth) {
  const touchesRight = zMin <= WALL_TOLERANCE;
  const touchesLeft = zMax >= containerWidth - WALL_TOLERANCE;
  if (touchesRight && touchesLeft) return 'phủ hết chiều rộng cont';
  if (touchesRight) return `sát vách phải, chiếm ${centimeters(zMax)} chiều rộng`;
  if (touchesLeft) return `sát vách trái, chiếm ${centimeters(containerWidth - zMin)} chiều rộng`;
  return `cách vách phải ${centimeters(zMin)}, cách vách trái ${centimeters(containerWidth - zMax)}`;
}

/** Cách đặt 1 nhóm kiện cùng hướng. */
function orientationText(sample, cargo, unit) {
  if (cargo.length === cargo.width) return '';
  const alongLength = sample.l === cargo.length;
  return alongLength
    ? `đặt dọc (cạnh ${dimension(cargo.length, unit)} theo chiều dài cont)`
    : `xoay ngang (cạnh ${dimension(cargo.length, unit)} theo chiều rộng cont)`;
}

/** Lưới đều: số vị trí khác nhau theo chiều rộng × chiều dài khớp đúng số kiện. */
function gridText(items) {
  const zs = new Set(items.map((i) => round(i.z)));
  const xs = new Set(items.map((i) => round(i.x)));
  if (items.length > 1 && zs.size * xs.size === items.length) {
    return `${formatNumber(zs.size)} theo chiều rộng × ${formatNumber(xs.size)} theo chiều dài`;
  }
  return '';
}

function describeGroup(items, cargo, container) {
  const unit = cargo.unit || DEFAULT_LENGTH_UNIT;
  const xMin = Math.min(...items.map((i) => i.x));
  const xMax = Math.max(...items.map((i) => i.x + i.l));
  const zMin = Math.min(...items.map((i) => i.z));
  const zMax = Math.max(...items.map((i) => i.z + i.w));
  const parts = [orientationText(items[0], cargo, unit), gridText(items)].filter(Boolean);
  return (
    `${cargo.name}: ${formatNumber(items.length)} kiện` +
    (parts.length ? ` — ${parts.join(', ')}` : '') +
    `; đoạn ${meters(xMin)} – ${meters(xMax)}, ${widthPosition(zMin, zMax, container.width)}.`
  );
}

function describePallets(items, cargo, container) {
  const boxes = items[0].pallet.boxes.length;
  const height = items[0].h;
  const xMin = Math.min(...items.map((i) => i.x));
  const xMax = Math.max(...items.map((i) => i.x + i.l));
  const zMin = Math.min(...items.map((i) => i.z));
  const zMax = Math.max(...items.map((i) => i.z + i.w));
  const longSide = Math.max(items[0].l, items[0].w);
  const longAlongLength = items[0].l >= items[0].w;
  return (
    `${cargo.name}: ${formatNumber(items.length)} pallet (mỗi pallet ${formatNumber(boxes)} thùng, cao ${centimeters(height)}) — ` +
    `dùng xe nâng đưa vào, cạnh ${centimeters(longSide)} của pallet ${longAlongLength ? 'theo chiều dài' : 'theo chiều rộng'} cont; ` +
    `đoạn ${meters(xMin)} – ${meters(xMax)}, ${widthPosition(zMin, zMax, container.width)}.`
  );
}

/**
 * @param step 1 bước từ computeLoadingSteps
 * @param container {length,width,height} (cm)
 * @param cargoById Map typeId -> loại hàng (name, length, width, unit…)
 * @returns các tầng theo thứ tự xếp (từ sàn lên): [{ heading: '1) Trên sàn cont', details: ['Thùng A: 12 kiện — …', …] }]
 */
export function describeLoadingStep(step, container, cargoById) {
  const levels = new Map();
  for (const item of step.items) {
    const y = round(item.y);
    if (!levels.has(y)) levels.set(y, []);
    levels.get(y).push(item);
  }

  return [...levels.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([y, items], index) => {
      // Gom theo loại hàng + kiểu (pallet / thùng rời) + hướng đặt, giữ thứ tự xuất hiện.
      const groups = new Map();
      for (const item of items) {
        const key = `${item.typeId}|${item.pallet ? 'pallet' : 'loose'}|${round(item.l)}x${round(item.w)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
      }
      const where = y === 0 ? 'Trên sàn cont' : `Tầng có đáy ở độ cao ${centimeters(y)}, đặt lên trên hàng đã xếp`;
      const details = [...groups.values()].map((group) => {
        const cargo = cargoById.get(group[0].typeId);
        return group[0].pallet ? describePallets(group, cargo, container) : describeGroup(group, cargo, container);
      });
      return { heading: `${index + 1}) ${where}`, details };
    });
}

// Điều phối toàn bộ phương án: loại hàng nào đóng pallet thì đóng pallet trước,
// sau đó xếp pallet + hàng rời vào container, rồi quy đổi kết quả về số thùng của từng loại hàng.
import { countPieces, packCargo } from './packing.js';
import { planPallets } from './palletizing.js';

/** Pallet bị xoay 90° trong container thì đổi trục x/z của các thùng trên pallet theo. */
function transposeBoxes(boxes) {
  return boxes.map((b) => ({ ...b, x: b.z, z: b.x, l: b.w, w: b.l }));
}

/**
 * @param container {length,width,height,maxWeight}
 * @param cargoTypes danh sách loại hàng; loại có `palletize: true` sẽ được đóng pallet
 * @param palletConfig cấu hình pallet (cm, kg), có thể null nếu không loại nào đóng pallet
 * @returns kết quả như packCargo, trong đó:
 *   - placed[i].pallet = { baseHeight, boxes } nếu kiện đó là 1 pallet (boxes tọa độ tương đối với góc pallet)
 *   - typeStats tính theo số thùng, kèm palletsPlaced/palletsTotal cho loại đóng pallet
 *   - palletPlans: phương án đóng pallet của từng loại
 */
export function planLoading(container, cargoTypes, palletConfig) {
  const palletPlans = [];
  const packTypes = [];
  const unitById = new Map();

  for (const type of cargoTypes) {
    if (type.palletize && palletConfig) {
      const plan = planPallets(type, palletConfig, container.height);
      palletPlans.push(plan);
      for (const unit of plan.units) {
        packTypes.push(unit);
        unitById.set(unit.id, unit);
      }
    } else {
      packTypes.push(type);
    }
  }

  const packing = packCargo(container, packTypes);

  const placed = packing.placed.map((item) => {
    const unit = unitById.get(item.typeId);
    if (!unit) return item;
    const rotated = unit.length !== unit.width && item.l !== unit.length;
    return {
      ...item,
      typeId: unit.palletOf,
      pallet: { baseHeight: unit.baseHeight, boxes: rotated ? transposeBoxes(unit.boxes) : unit.boxes },
    };
  });

  const placedCountById = new Map(packing.typeStats.map((stat) => [stat.typeId, stat.placed]));
  const typeStats = cargoTypes.map((type) => {
    const plan = palletPlans.find((p) => p.typeId === type.id);
    if (!plan) return packing.typeStats.find((stat) => stat.typeId === type.id);
    let placedBoxes = 0;
    let palletsPlaced = 0;
    for (const unit of plan.units) {
      const count = placedCountById.get(unit.id) || 0;
      placedBoxes += count * unit.boxCount;
      palletsPlaced += count;
    }
    return {
      typeId: type.id,
      requested: type.quantity,
      placed: placedBoxes,
      unplaced: type.quantity - placedBoxes,
      palletsPlaced,
      palletsTotal: plan.palletCount,
    };
  });

  return {
    ...packing,
    placed,
    typeStats,
    palletPlans,
    totalPieces: countPieces(cargoTypes),
    placedCount: typeStats.reduce((sum, stat) => sum + stat.placed, 0),
  };
}

import Button from '../ui/Button.jsx';
import { formatNumber } from '../../utils/format.js';
import { DEFAULT_LENGTH_UNIT, fromCm } from '../../utils/units.js';

export default function CargoListItem({ cargo, onEdit, onDelete }) {
  const unit = cargo.unit || DEFAULT_LENGTH_UNIT;
  return (
    <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-white p-2">
      <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-sm" style={{ backgroundColor: cargo.color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium text-slate-800">{cargo.name}</p>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">× {formatNumber(cargo.quantity)}</p>
        </div>
        <p className="text-xs tabular-nums text-slate-500">
          {formatNumber(fromCm(cargo.length, unit))} × {formatNumber(fromCm(cargo.width, unit))} ×{' '}
          {formatNumber(fromCm(cargo.height, unit))} {unit} ·{' '}
          {formatNumber(cargo.weight)} kg
          {!cargo.allowRotate && <span className="ml-1 text-amber-700">· Không xoay</span>}
          {cargo.palletize && <span className="ml-1 font-medium text-amber-900">· Đóng pallet</span>}
        </p>
      </div>
      <div className="flex shrink-0">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Sửa
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete}>
          Xóa
        </Button>
      </div>
    </div>
  );
}

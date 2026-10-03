import { formatCubicMeters, formatNumber } from '../../utils/format.js';

export default function VehicleSummary({ vehicle }) {
  const volume = vehicle.length * vehicle.width * vehicle.height;
  return (
    <dl className="mt-2 grid grid-cols-3 gap-2 rounded-md bg-slate-50 p-2 text-xs">
      <div className="col-span-3">
        <dt className="text-slate-500">Kích thước lòng thùng (D × R × C)</dt>
        <dd className="font-semibold tabular-nums text-slate-800">
          {formatNumber(vehicle.length)} × {formatNumber(vehicle.width)} × {formatNumber(vehicle.height)} cm
        </dd>
      </div>
      <div className="col-span-2">
        <dt className="text-slate-500">Thể tích</dt>
        <dd className="font-semibold tabular-nums text-slate-800">{formatCubicMeters(volume)}</dd>
      </div>
      <div>
        <dt className="text-slate-500">Tải trọng</dt>
        <dd className="font-semibold tabular-nums text-slate-800">{formatNumber(vehicle.maxWeight)} kg</dd>
      </div>
    </dl>
  );
}

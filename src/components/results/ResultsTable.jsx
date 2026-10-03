import { formatNumber } from '../../utils/format.js';

/** Bảng chi tiết theo từng loại hàng: yêu cầu / xếp được / còn dư (tính theo thùng), kèm số pallet nếu có. */
export default function ResultsTable({ result }) {
  const cargoById = new Map(result.cargoList.map((cargo) => [cargo.id, cargo]));
  const hasPallets = result.typeStats.some((stat) => stat.palletsTotal !== undefined);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">Loại hàng</th>
            <th className="px-3 py-2 text-right font-medium">Yêu cầu</th>
            <th className="px-3 py-2 text-right font-medium">Xếp được</th>
            <th className="px-3 py-2 text-right font-medium">Còn dư</th>
            {hasPallets && <th className="px-3 py-2 text-right font-medium">Pallet</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 tabular-nums">
          {result.typeStats.map((stat) => {
            const cargo = cargoById.get(stat.typeId);
            return (
              <tr key={stat.typeId}>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: cargo.color }} />
                    <span className="truncate">{cargo.name}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-right">{formatNumber(stat.requested)}</td>
                <td className="px-3 py-2 text-right font-semibold text-emerald-700">{formatNumber(stat.placed)}</td>
                <td className={`px-3 py-2 text-right font-semibold ${stat.unplaced > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                  {formatNumber(stat.unplaced)}
                </td>
                {hasPallets && (
                  <td className="px-3 py-2 text-right text-slate-600">
                    {stat.palletsTotal !== undefined
                      ? `${formatNumber(stat.palletsPlaced)}/${formatNumber(stat.palletsTotal)}`
                      : '—'}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

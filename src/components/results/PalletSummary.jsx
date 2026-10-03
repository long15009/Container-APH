import { getPalletPreset } from '../../data/palletPresets.js';
import { formatNumber } from '../../utils/format.js';

const PATTERN_LABELS = { column: 'Thẳng cột', interlock: 'Răng lược' };

/** Phương án đóng pallet của từng loại hàng: số thùng/tầng, số tầng, chiều cao, cân nặng, số pallet. */
export default function PalletSummary({ result }) {
  const { palletPlans, palletConfig, cargoList, typeStats } = result;
  if (!palletPlans || palletPlans.length === 0) return null;

  const preset = getPalletPreset(palletConfig.presetId);

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-slate-100 px-3 py-2">
        <h3 className="text-sm font-semibold text-slate-800">Phương án đóng pallet</h3>
        <p className="text-xs text-slate-500">
          {preset.name} {formatNumber(preset.lengthMm)} × {formatNumber(preset.widthMm)} mm ·{' '}
          {palletConfig.stackable ? 'Cho chồng pallet' : 'Không chồng pallet'}
        </p>
      </header>
      <ul className="divide-y divide-slate-100">
        {palletPlans.map((plan) => {
          const cargo = cargoList.find((c) => c.id === plan.typeId);
          const stat = typeStats.find((s) => s.typeId === plan.typeId);
          return (
            <li key={plan.typeId} className="px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: cargo.color }} />
                  <span className="truncate font-medium">{cargo.name}</span>
                </span>
                {!plan.error && (
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatNumber(stat.palletsPlaced)} / {formatNumber(stat.palletsTotal)} pallet
                  </span>
                )}
              </div>
              {plan.error ? (
                <p className="mt-0.5 text-xs text-red-600">Không đóng pallet được: {plan.error}</p>
              ) : (
                <>
                  <p className="mt-0.5 text-xs tabular-nums text-slate-600">
                    {formatNumber(plan.perLayer)} thùng/tầng × {formatNumber(plan.layers)} tầng ={' '}
                    <strong>{formatNumber(plan.perPallet)} thùng/pallet</strong> · {PATTERN_LABELS[plan.pattern]} · cao{' '}
                    {formatNumber(plan.palletHeight)} cm · nặng {formatNumber(plan.palletWeight)} kg
                  </p>
                  {plan.interlockFallback && (
                    <p className="mt-0.5 text-xs text-amber-700">
                      Kích thước thùng này chỉ có 1 cách xếp kín tầng nên không cài răng lược được — đã xếp thẳng cột.
                    </p>
                  )}
                  {plan.limitedByWeight && (
                    <p className="mt-0.5 text-xs text-amber-700">Số thùng/pallet bị giới hạn bởi tải hàng tối đa của pallet.</p>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

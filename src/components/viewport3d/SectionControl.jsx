import SegmentedControl from '../ui/SegmentedControl.jsx';
import { SECTION_AXES, getSectionCut } from '../../three/visibility.js';
import { formatNumber } from '../../utils/format.js';

/**
 * Thanh điều khiển mặt cắt: chọn trục rồi kéo để ẩn các kiện nằm sau mặt cắt,
 * giúp nhìn thấy kiện bị che bên trong.
 */
export default function SectionControl({ container, filter, onChange, visibleCount, totalCount }) {
  const axis = SECTION_AXES.find((a) => a.value === filter.axis);
  const max = container[axis.dimension];
  const cut = getSectionCut(container, filter);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-200 bg-white px-3 py-2">
      <SegmentedControl
        label="Mặt cắt"
        options={SECTION_AXES}
        value={filter.axis}
        onChange={(value) => onChange({ ...filter, axis: value, ratio: 1 })}
      />
      <input
        type="range"
        min="0"
        max="1"
        step="0.005"
        value={filter.ratio}
        onChange={(event) => onChange({ ...filter, ratio: Number(event.target.value) })}
        aria-label={`Vị trí mặt cắt theo chiều ${axis.label.toLowerCase()}`}
        className="h-1.5 min-w-[120px] flex-1 cursor-pointer accent-red-500"
      />
      <span className="w-[92px] text-right text-xs tabular-nums text-slate-600">
        {formatNumber(Math.round(cut))} / {formatNumber(max)} cm
      </span>
      <span className="text-xs tabular-nums text-slate-500">
        Hiện {formatNumber(visibleCount)}/{formatNumber(totalCount)} kiện
      </span>
    </div>
  );
}

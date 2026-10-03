import { PALLET_WOOD_COLOR } from '../../three/buildMeshes.js';

/**
 * Chú thích màu từng loại hàng, nổi ở góc trên trái viewport. Bấm vào 1 loại để ẩn/hiện loại đó.
 * Có pallet thì thêm dòng chú thích màu gỗ của đế pallet.
 */
export default function ViewportLegend({ cargoList, hiddenTypeIds, onToggleType, showPalletBase }) {
  if (cargoList.length === 0) return null;
  return (
    <ul className="absolute left-2 top-2 max-h-[60%] max-w-[55%] space-y-0.5 overflow-y-auto rounded-md bg-white/90 p-1 text-[11px] text-slate-700 shadow-sm">
      {cargoList.map((cargo) => {
        const hidden = hiddenTypeIds.has(cargo.id);
        return (
          <li key={cargo.id}>
            <button
              type="button"
              onClick={() => onToggleType(cargo.id)}
              aria-pressed={!hidden}
              title={hidden ? 'Bấm để hiện loại hàng này' : 'Bấm để ẩn loại hàng này'}
              className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-slate-100"
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-sm border ${hidden ? 'border-slate-400 bg-transparent' : 'border-transparent'}`}
                style={hidden ? undefined : { backgroundColor: cargo.color }}
              />
              <span className={`truncate ${hidden ? 'text-slate-400 line-through' : ''}`}>{cargo.name}</span>
            </button>
          </li>
        );
      })}
      {showPalletBase && (
        <li className="mt-0.5 flex items-center gap-1.5 border-t border-slate-200 px-1 pt-1">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: PALLET_WOOD_COLOR }} />
          <span className="truncate text-slate-600">Đế pallet gỗ</span>
        </li>
      )}
    </ul>
  );
}

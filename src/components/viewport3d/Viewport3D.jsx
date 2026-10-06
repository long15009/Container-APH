import { useEffect, useMemo, useRef, useState } from 'react';
import { createViewer } from '../../three/viewer.js';
import { DEFAULT_VIEW_FILTER, isItemVisible } from '../../three/visibility.js';
import SectionControl from './SectionControl.jsx';
import ViewportLegend from './ViewportLegend.jsx';
import { formatNumber } from '../../utils/format.js';
import { DEFAULT_LENGTH_UNIT, fromCm } from '../../utils/units.js';

/** Bọc canvas Three.js: hiển thị khung phương tiện và các kiện hàng đã xếp. */
export default function Viewport3D({ vehicle, placedItems, cargoList, isCalculating }) {
  const mountRef = useRef(null);
  const viewerRef = useRef(null);
  const [filter, setFilter] = useState(DEFAULT_VIEW_FILTER);
  const [showDimensions, setShowDimensions] = useState(true);

  // Chữ in lên khối: kích thước D×R×C theo đúng đơn vị người dùng đã nhập cho loại hàng đó.
  const typeInfoById = useMemo(
    () =>
      new Map(
        cargoList.map((cargo) => {
          const unit = cargo.unit || DEFAULT_LENGTH_UNIT;
          const dims = [cargo.length, cargo.width, cargo.height].map((v) => formatNumber(fromCm(v, unit)));
          return [cargo.id, { color: cargo.color, label: `${dims.join('×')} ${unit}` }];
        }),
      ),
    [cargoList],
  );
  const visibleCount = useMemo(
    () => placedItems.filter((item) => isItemVisible(item, vehicle, filter)).length,
    [placedItems, vehicle, filter],
  );

  useEffect(() => {
    const mount = mountRef.current;
    const viewer = createViewer(mount);
    viewerRef.current = viewer;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      viewer.setSize(Math.floor(width), Math.floor(height));
    });
    observer.observe(mount);

    return () => {
      observer.disconnect();
      viewer.dispose();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    viewerRef.current?.setData(vehicle, placedItems, typeInfoById, { showDimensions });
  }, [vehicle, placedItems, typeInfoById, showDimensions]);

  useEffect(() => {
    viewerRef.current?.setFilter(filter);
  }, [filter]);

  function toggleType(typeId) {
    setFilter((current) => {
      const hiddenTypeIds = new Set(current.hiddenTypeIds);
      if (hiddenTypeIds.has(typeId)) hiddenTypeIds.delete(typeId);
      else hiddenTypeIds.add(typeId);
      return { ...current, hiddenTypeIds };
    });
  }

  const isFiltered = filter.ratio < 1 || filter.hiddenTypeIds.size > 0;

  return (
    <div className="flex h-[75vw] max-h-[520px] min-h-[340px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-100 md:h-full md:max-h-none md:min-h-[400px]">
      <div className="relative min-h-0 flex-1">
        <div ref={mountRef} className="absolute inset-0" />

        <ViewportLegend
          cargoList={cargoList}
          hiddenTypeIds={filter.hiddenTypeIds}
          onToggleType={toggleType}
          showPalletBase={placedItems.some((item) => item.pallet)}
        />

        <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => viewerRef.current?.resetView()}
            className="rounded-md border border-slate-200 bg-white/90 px-2 py-1 text-xs font-medium text-slate-600 shadow-sm hover:bg-white"
          >
            Góc nhìn mặc định
          </button>
          {placedItems.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDimensions((value) => !value)}
              aria-pressed={showDimensions}
              className="rounded-md border border-slate-200 bg-white/90 px-2 py-1 text-xs font-medium text-slate-600 shadow-sm hover:bg-white"
            >
              {showDimensions ? 'Ẩn kích thước' : 'Hiện kích thước'}
            </button>
          )}
          {isFiltered && (
            <button
              type="button"
              onClick={() => setFilter(DEFAULT_VIEW_FILTER)}
              className="rounded-md border border-red-200 bg-white/90 px-2 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-white"
            >
              Hiện tất cả kiện
            </button>
          )}
        </div>

        <p className="pointer-events-none absolute bottom-2 right-2 hidden text-[11px] text-slate-400 sm:block">
          Kéo để xoay · Lăn chuột / chụm 2 ngón để zoom · Bấm tên hàng để ẩn/hiện
        </p>

        {isCalculating && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm font-medium text-slate-700">
            Đang tính toán…
          </div>
        )}
      </div>

      {placedItems.length > 0 && (
        <SectionControl
          container={vehicle}
          filter={filter}
          onChange={setFilter}
          visibleCount={visibleCount}
          totalCount={placedItems.length}
        />
      )}
    </div>
  );
}

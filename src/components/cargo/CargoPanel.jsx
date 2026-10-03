import { useState } from 'react';
import Accordion from '../ui/Accordion.jsx';
import Button from '../ui/Button.jsx';
import CargoForm from './CargoForm.jsx';
import CargoList from './CargoList.jsx';
import { formatNumber } from '../../utils/format.js';
import { countPieces } from '../../engine/packing.js';

/** Khu vực nhập danh sách hàng hóa: danh sách đã thêm + form thêm mới. */
export default function CargoPanel({ cargoList, nextColor, onAdd, onUpdate, onDelete, onLoadSample }) {
  const [editingId, setEditingId] = useState(null);
  const totalPieces = countPieces(cargoList);

  const badge = cargoList.length > 0 && (
    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-700">
      {cargoList.length} loại · {formatNumber(totalPieces)} kiện
    </span>
  );

  return (
    <Accordion title="2. Hàng hóa" badge={badge}>
      <div className="space-y-3">
        {cargoList.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">
            Chưa có loại hàng nào.{' '}
            <Button variant="ghost" size="sm" className="!px-1 text-blue-700 underline" onClick={onLoadSample}>
              Dùng dữ liệu mẫu
            </Button>
          </p>
        ) : (
          <CargoList
            cargoList={cargoList}
            editingId={editingId}
            onStartEdit={setEditingId}
            onCancelEdit={() => setEditingId(null)}
            onUpdate={(id, values) => {
              onUpdate(id, values);
              setEditingId(null);
            }}
            onDelete={(id) => {
              onDelete(id);
              if (editingId === id) setEditingId(null);
            }}
          />
        )}

        <div className="rounded-md bg-slate-50 p-2">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: nextColor }} />
            <h3 className="text-xs font-semibold text-slate-600">Thêm loại hàng</h3>
          </div>
          <CargoForm
            defaultName={`Hàng ${cargoList.length + 1}`}
            color={nextColor}
            submitLabel="+ Thêm vào danh sách"
            onSubmit={onAdd}
          />
        </div>
      </div>
    </Accordion>
  );
}

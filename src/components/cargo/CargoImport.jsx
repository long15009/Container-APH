import { useRef, useState } from 'react';
import Button from '../ui/Button.jsx';
import { parseCargoRows } from '../../import/parseCargoSheet.js';
import { ACCEPTED_FILE_TYPES, downloadCargoTemplate, readSpreadsheetRows } from '../../import/spreadsheetFile.js';
import { formatNumber } from '../../utils/format.js';
import { fromCm } from '../../utils/units.js';

const MAX_ERRORS_SHOWN = 8;

/**
 * Nhập danh sách hàng từ file Excel/CSV: chọn file -> xem trước (số dòng hợp lệ, lỗi từng dòng)
 * -> thêm vào hoặc thay thế danh sách hiện tại.
 */
export default function CargoImport({ hasExistingCargo, onImport }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [isReading, setIsReading] = useState(false);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = ''; // cho phép chọn lại cùng 1 file
    if (!file) return;
    setIsReading(true);
    try {
      const rows = await readSpreadsheetRows(file);
      setPreview({ fileName: file.name, ...parseCargoRows(rows) });
    } catch {
      setPreview({ fileName: file.name, items: [], warnings: [], errors: ['Không đọc được file. Hãy dùng file .xlsx, .xls hoặc .csv.'] });
    } finally {
      setIsReading(false);
    }
  }

  function confirm(replace) {
    onImport(preview.items, replace);
    setPreview(null);
  }

  const totalPieces = preview ? preview.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={isReading}>
          {isReading ? 'Đang đọc file…' : 'Nhập từ Excel'}
        </Button>
        <Button variant="ghost" size="sm" className="text-blue-700 underline" onClick={downloadCargoTemplate}>
          Tải file mẫu
        </Button>
        <input ref={inputRef} type="file" accept={ACCEPTED_FILE_TYPES} className="hidden" onChange={handleFile} />
      </div>

      {preview && (
        <div className="mt-2 space-y-2 rounded-md border border-blue-200 bg-blue-50/60 p-2 text-xs">
          <p className="text-slate-700">
            <span className="font-semibold">{preview.fileName}</span>:{' '}
            {preview.items.length > 0
              ? `đọc được ${formatNumber(preview.items.length)} loại hàng, tổng ${formatNumber(totalPieces)} kiện.`
              : 'không có dòng hàng hợp lệ.'}
          </p>

          {preview.items.length > 0 && (
            <ul className="max-h-40 space-y-0.5 overflow-y-auto rounded bg-white p-1.5 tabular-nums text-slate-700">
              {preview.items.map((item, index) => (
                <li key={index} className="flex justify-between gap-2">
                  <span className="truncate">{item.name}</span>
                  <span className="shrink-0 text-slate-500">
                    {formatNumber(fromCm(item.length, item.unit))}×{formatNumber(fromCm(item.width, item.unit))}×
                    {formatNumber(fromCm(item.height, item.unit))} {item.unit} · {formatNumber(item.weight)} kg · ×
                    {formatNumber(item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {preview.warnings.map((warning) => (
            <p key={warning} className="text-amber-800">
              {warning}
            </p>
          ))}

          {preview.errors.length > 0 && (
            <div className="rounded bg-red-50 p-1.5 text-red-700">
              <p className="font-medium">
                {preview.items.length > 0 ? `Bỏ qua ${formatNumber(preview.errors.length)} dòng lỗi:` : 'Lỗi:'}
              </p>
              <ul className="list-inside list-disc">
                {preview.errors.slice(0, MAX_ERRORS_SHOWN).map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
              {preview.errors.length > MAX_ERRORS_SHOWN && (
                <p>… và {formatNumber(preview.errors.length - MAX_ERRORS_SHOWN)} lỗi khác.</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {preview.items.length > 0 && (
              <Button size="sm" onClick={() => confirm(false)}>
                {hasExistingCargo ? 'Thêm vào danh sách' : 'Nhập vào danh sách'}
              </Button>
            )}
            {preview.items.length > 0 && hasExistingCargo && (
              <Button variant="secondary" size="sm" onClick={() => confirm(true)}>
                Thay thế danh sách hiện tại
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
              Hủy
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

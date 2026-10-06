import ResultsSummary from './ResultsSummary.jsx';
import ResultsTable from './ResultsTable.jsx';
import PalletSummary from './PalletSummary.jsx';
import ExportPdfButton from './ExportPdfButton.jsx';

function Notice({ children }) {
  return <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">{children}</p>;
}

export default function ResultsPanel({ result, isStale }) {
  if (!result) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
        Chọn phương tiện, nhập hàng hóa rồi bấm <strong>“Tính toán xếp hàng”</strong> để xem phương án.
      </p>
    );
  }

  return (
    <section className="space-y-2 md:space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Kết quả</h2>
        <ExportPdfButton result={result} isStale={isStale} />
      </div>
      {isStale && (
        <Notice>Dữ liệu đầu vào đã thay đổi — kết quả dưới đây là của lần tính trước. Bấm tính lại để cập nhật.</Notice>
      )}
      <ResultsSummary result={result} />
      <ResultsTable result={result} />
      <PalletSummary result={result} />
    </section>
  );
}

import { useState } from 'react';
import Button from '../ui/Button.jsx';

/** Nút xuất báo cáo PDF. Module tạo PDF (khá nặng) chỉ được tải khi bấm. */
export default function ExportPdfButton({ result, isStale }) {
  const [status, setStatus] = useState('idle'); // idle | working | error

  async function handleExport() {
    if (isStale && !window.confirm('Dữ liệu đã thay đổi sau lần tính gần nhất. Vẫn xuất PDF theo kết quả cũ?')) return;
    setStatus('working');
    try {
      const { exportReportPdf } = await import('../../report/exportReportPdf.js');
      await exportReportPdf(result);
      setStatus('idle');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status === 'error' && <span className="text-xs text-red-600">Không tạo được PDF, thử lại.</span>}
      <Button variant="secondary" size="sm" onClick={handleExport} disabled={status === 'working'}>
        {status === 'working' ? 'Đang tạo PDF…' : 'Xuất PDF'}
      </Button>
    </div>
  );
}

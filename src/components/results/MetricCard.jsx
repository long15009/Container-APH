const TONES = {
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-red-500',
  neutral: 'bg-blue-600',
};

/** Thẻ số liệu: giá trị lớn, mô tả nhỏ, thanh tiến độ tùy chọn (ratio 0..1). */
export default function MetricCard({ label, value, detail, ratio, tone = 'neutral', className = '' }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-3 ${className}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {ratio !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${TONES[tone]}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
        </div>
      )}
      {detail && <p className="mt-1.5 text-xs tabular-nums text-slate-500">{detail}</p>}
    </div>
  );
}

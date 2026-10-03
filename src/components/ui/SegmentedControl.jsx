/** Nhóm nút chọn 1 trong vài giá trị ngắn (vd đơn vị cm / mm). */
export default function SegmentedControl({ label, options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} role="radiogroup" aria-label={label}>
      {label && <span className="text-xs font-medium text-slate-600">{label}</span>}
      <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${
              value === option.value ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

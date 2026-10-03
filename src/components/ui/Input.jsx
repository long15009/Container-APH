export default function Input({ label, unit, error, className = '', id, ...props }) {
  const inputId = id || props.name;
  return (
    <label htmlFor={inputId} className={`block ${className}`}>
      {label && <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>}
      <span className="relative block">
        <input
          id={inputId}
          className={`w-full rounded-md border bg-white px-2.5 py-1.5 text-sm tabular-nums outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 ${
            error ? 'border-red-400' : 'border-slate-300'
          } ${unit ? 'pr-9' : ''}`}
          {...props}
        />
        {unit && (
          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-slate-400">
            {unit}
          </span>
        )}
      </span>
      {error && <span className="mt-0.5 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

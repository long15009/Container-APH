export default function Select({ label, options, className = '', id, ...props }) {
  const selectId = id || props.name;
  return (
    <label htmlFor={selectId} className={`block ${className}`}>
      {label && <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>}
      <select
        id={selectId}
        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

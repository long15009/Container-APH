import { COLOR_PALETTE } from '../../data/colorPalette.js';

export default function ColorPicker({ value, onChange }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-slate-600">Màu hiển thị</span>
      <div className="flex flex-wrap gap-1.5">
        {COLOR_PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Chọn màu ${color}`}
            aria-pressed={value === color}
            onClick={() => onChange(color)}
            className={`h-6 w-6 rounded-full border-2 ${value === color ? 'border-slate-900' : 'border-white shadow'}`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}

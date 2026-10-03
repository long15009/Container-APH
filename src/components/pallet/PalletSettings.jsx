import Accordion from '../ui/Accordion.jsx';
import Checkbox from '../ui/Checkbox.jsx';
import Input from '../ui/Input.jsx';
import SegmentedControl from '../ui/SegmentedControl.jsx';
import Select from '../ui/Select.jsx';
import { PALLET_PRESETS, STACKING_PATTERNS, getPalletPreset, validatePalletSettings } from '../../data/palletPresets.js';
import { formatNumber } from '../../utils/format.js';

const PRESET_OPTIONS = PALLET_PRESETS.map((preset) => ({
  value: preset.id,
  label: `${preset.name} — ${formatNumber(preset.lengthMm)} × ${formatNumber(preset.widthMm)} mm`,
}));

const NUMBER_FIELDS = [
  { name: 'baseHeight', label: 'Cao đế pallet', unit: 'cm' },
  { name: 'palletWeight', label: 'Nặng pallet rỗng', unit: 'kg' },
  { name: 'maxHeight', label: 'Cao tối đa cả hàng', unit: 'cm' },
  { name: 'maxLoadWeight', label: 'Tải hàng tối đa', unit: 'kg' },
  { name: 'maxLayers', label: 'Số tầng thùng tối đa', unit: 'tầng', placeholder: 'Không giới hạn' },
];

/** Cấu hình đóng pallet, áp dụng cho các loại hàng có tích "Đóng lên pallet". */
export default function PalletSettings({ settings, onChange, palletizedCount }) {
  const errors = validatePalletSettings(settings);
  const preset = getPalletPreset(settings.presetId);
  const pattern = STACKING_PATTERNS.find((p) => p.value === settings.pattern);

  function setField(name, value) {
    onChange({ ...settings, [name]: value });
  }

  function changePreset(presetId) {
    const next = getPalletPreset(presetId);
    onChange({ ...settings, presetId, baseHeight: String(next.baseHeight), palletWeight: String(next.palletWeight) });
  }

  const badge = palletizedCount > 0 && (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
      {palletizedCount} loại hàng
    </span>
  );

  return (
    <Accordion title="3. Đóng pallet" badge={badge}>
      <div className="space-y-2.5">
        {palletizedCount === 0 && (
          <p className="rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-500">
            Tích “Đóng lên pallet” ở loại hàng cần đóng pallet. Mỗi pallet chỉ chứa 1 loại hàng.
          </p>
        )}

        <div>
          <Select
            name="palletPreset"
            label="Loại pallet"
            options={PRESET_OPTIONS}
            value={settings.presetId}
            onChange={(event) => changePreset(event.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">Thị trường hay dùng: {preset.market}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {NUMBER_FIELDS.map((field) => (
            <Input
              key={field.name}
              id={`pallet-${field.name}`}
              name={field.name}
              type="number"
              inputMode="decimal"
              min="0"
              label={field.label}
              unit={field.unit}
              placeholder={field.placeholder}
              value={settings[field.name]}
              error={errors[field.name]}
              onChange={(event) => setField(field.name, event.target.value)}
            />
          ))}
        </div>

        <div>
          <SegmentedControl
            label="Kiểu xếp thùng"
            options={STACKING_PATTERNS}
            value={settings.pattern}
            onChange={(value) => setField('pattern', value)}
          />
          <p className="mt-1 text-xs text-slate-500">{pattern.description}</p>
        </div>

        <div>
          <Checkbox
            label="Cho phép chồng pallet lên nhau"
            checked={settings.stackable}
            onChange={(event) => setField('stackable', event.target.checked)}
          />
          <p className="mt-0.5 text-xs text-slate-500">
            {settings.stackable
              ? 'Pallet được chồng lên pallet khác nếu còn đủ chiều cao.'
              : 'Pallet chỉ đặt trên sàn, không hàng nào được đè lên pallet.'}
          </p>
        </div>

        <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
          Thùng luôn nằm gọn trong mặt pallet, không thò ra mép (overhang) để tránh mất sức chịu lực và móp khi va chạm.
        </p>
      </div>
    </Accordion>
  );
}

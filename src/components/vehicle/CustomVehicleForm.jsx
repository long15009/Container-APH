import Input from '../ui/Input.jsx';
import SegmentedControl from '../ui/SegmentedControl.jsx';
import { LENGTH_UNITS, convertLengthFields } from '../../utils/units.js';

const DIMENSION_FIELDS = ['length', 'width', 'height'];

// unit = null nghĩa là dùng đơn vị kích thước đang chọn (values.unit).
const FIELDS = [
  { name: 'length', label: 'Dài', unit: null },
  { name: 'width', label: 'Rộng', unit: null },
  { name: 'height', label: 'Cao', unit: null },
  { name: 'maxWeight', label: 'Tải trọng tối đa', unit: 'kg' },
];

/**
 * Nhập tay kích thước lòng thùng + tải trọng. Giá trị giữ dạng chuỗi để người dùng gõ tự do;
 * values.unit (cm/mm) là đơn vị của 3 ô kích thước, quy đổi sang cm ở nơi dùng.
 */
export default function CustomVehicleForm({ values, onChange }) {
  return (
    <div className="mt-2 space-y-2">
      <SegmentedControl
        label="Đơn vị kích thước"
        options={LENGTH_UNITS}
        value={values.unit}
        onChange={(unit) => onChange({ ...convertLengthFields(values, DIMENSION_FIELDS, values.unit, unit), unit })}
      />
      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map((field) => {
          const value = values[field.name];
          const invalid = !(Number(value) > 0);
          return (
            <Input
              key={field.name}
              id={`custom-${field.name}`}
              name={field.name}
              type="number"
              inputMode="decimal"
              min="0"
              label={field.label}
              unit={field.unit || values.unit}
              value={value}
              error={invalid ? 'Phải lớn hơn 0' : null}
              onChange={(event) => onChange({ ...values, [field.name]: event.target.value })}
            />
          );
        })}
      </div>
    </div>
  );
}

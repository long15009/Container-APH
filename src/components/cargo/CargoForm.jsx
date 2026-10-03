import { useState } from 'react';
import Button from '../ui/Button.jsx';
import Checkbox from '../ui/Checkbox.jsx';
import Input from '../ui/Input.jsx';
import SegmentedControl from '../ui/SegmentedControl.jsx';
import ColorPicker from './ColorPicker.jsx';
import { DEFAULT_LENGTH_UNIT, LENGTH_UNITS, convertLengthFields, fromCm, toCm } from '../../utils/units.js';

const EMPTY_VALUES = {
  name: '',
  length: '',
  width: '',
  height: '',
  weight: '',
  quantity: '1',
  allowRotate: true,
  palletize: false,
};

const DIMENSION_FIELDS = ['length', 'width', 'height'];

// unit = null nghĩa là dùng đơn vị kích thước đang chọn (cm/mm).
const NUMBER_FIELDS = [
  { name: 'length', label: 'Dài', unit: null },
  { name: 'width', label: 'Rộng', unit: null },
  { name: 'height', label: 'Cao', unit: null },
  { name: 'weight', label: 'Cân nặng', unit: 'kg' },
  { name: 'quantity', label: 'Số lượng', unit: 'kiện' },
];

function toFormValues(cargo) {
  if (!cargo) return EMPTY_VALUES;
  return {
    name: cargo.name,
    length: String(fromCm(cargo.length, cargo.unit)),
    width: String(fromCm(cargo.width, cargo.unit)),
    height: String(fromCm(cargo.height, cargo.unit)),
    weight: String(cargo.weight),
    quantity: String(cargo.quantity),
    allowRotate: cargo.allowRotate,
    palletize: Boolean(cargo.palletize),
  };
}

function validate(values) {
  const errors = {};
  for (const field of NUMBER_FIELDS) {
    const number = Number(values[field.name]);
    if (values[field.name] === '' || !Number.isFinite(number)) errors[field.name] = 'Bắt buộc';
    else if (field.name === 'weight' ? number < 0 : number <= 0) errors[field.name] = 'Không hợp lệ';
    else if (field.name === 'quantity' && !Number.isInteger(number)) errors[field.name] = 'Số nguyên';
  }
  return errors;
}

/**
 * Form thêm mới hoặc sửa 1 loại hàng.
 * onSubmit nhận object đã chuẩn hóa, kích thước luôn quy về cm:
 * { name, length, width, height, unit, weight, quantity, allowRotate, color }.
 * `unit` là đơn vị người dùng đã nhập, giữ lại để hiển thị và khi sửa.
 */
export default function CargoForm({ initialCargo, defaultName, color: initialColor, onSubmit, onCancel, submitLabel }) {
  const [values, setValues] = useState(() => toFormValues(initialCargo));
  const [unit, setUnit] = useState(initialCargo?.unit || DEFAULT_LENGTH_UNIT);
  const [color, setColor] = useState(initialColor);
  const [errors, setErrors] = useState({});
  const idPrefix = initialCargo ? `edit-${initialCargo.id}` : 'new';

  function setField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function changeUnit(nextUnit) {
    setValues((current) => convertLengthFields(current, DIMENSION_FIELDS, unit, nextUnit));
    setUnit(nextUnit);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      name: values.name.trim() || defaultName,
      ...Object.fromEntries(DIMENSION_FIELDS.map((name) => [name, toCm(Number(values[name]), unit)])),
      unit,
      weight: Number(values.weight),
      quantity: Number(values.quantity),
      allowRotate: values.allowRotate,
      palletize: values.palletize,
      // Form thêm mới luôn dùng màu kế tiếp do cha truyền xuống; form sửa cho chọn lại màu.
      color: initialCargo ? color : initialColor,
    });
    if (!initialCargo) {
      // Giữ nguyên đơn vị đang chọn để nhập liên tiếp nhiều loại hàng cùng đơn vị.
      setValues(EMPTY_VALUES);
      setErrors({});
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2" noValidate>
      <Input
        id={`${idPrefix}-name`}
        name="name"
        label="Tên hàng"
        placeholder={defaultName}
        value={values.name}
        onChange={(event) => setField('name', event.target.value)}
      />
      <SegmentedControl label="Đơn vị kích thước" options={LENGTH_UNITS} value={unit} onChange={changeUnit} />
      <div className="grid grid-cols-3 gap-2">
        {NUMBER_FIELDS.map((field) => (
          <Input
            key={field.name}
            id={`${idPrefix}-${field.name}`}
            name={field.name}
            type="number"
            inputMode="decimal"
            min="0"
            label={field.label}
            unit={field.unit || unit}
            value={values[field.name]}
            error={errors[field.name]}
            onChange={(event) => setField(field.name, event.target.value)}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <Checkbox
          label="Cho phép xoay ngang 90°"
          checked={values.allowRotate}
          onChange={(event) => setField('allowRotate', event.target.checked)}
        />
        <Checkbox
          label="Đóng lên pallet"
          checked={values.palletize}
          onChange={(event) => setField('palletize', event.target.checked)}
        />
      </div>
      {initialCargo && <ColorPicker value={color} onChange={setColor} />}
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant={initialCargo ? 'primary' : 'secondary'} className="flex-1">
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Hủy
          </Button>
        )}
      </div>
    </form>
  );
}

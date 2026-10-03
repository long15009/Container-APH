import Select from '../ui/Select.jsx';
import SectionTitle from '../ui/SectionTitle.jsx';
import CustomVehicleForm from './CustomVehicleForm.jsx';
import VehicleSummary from './VehicleSummary.jsx';
import { CONTAINER_PRESETS, CUSTOM_VEHICLE_ID } from '../../data/containerPresets.js';

const OPTIONS = [
  ...CONTAINER_PRESETS.map((preset) => ({ value: preset.id, label: preset.name })),
  { value: CUSTOM_VEHICLE_ID, label: 'Tùy chỉnh…' },
];

export default function VehicleSelector({ vehicleId, onVehicleIdChange, customValues, onCustomValuesChange, vehicle }) {
  return (
    <section>
      <SectionTitle>1. Phương tiện chứa hàng</SectionTitle>
      <Select
        name="vehicle"
        options={OPTIONS}
        value={vehicleId}
        onChange={(event) => onVehicleIdChange(event.target.value)}
      />
      {vehicleId === CUSTOM_VEHICLE_ID && (
        <CustomVehicleForm values={customValues} onChange={onCustomValuesChange} />
      )}
      {vehicle && <VehicleSummary vehicle={vehicle} />}
    </section>
  );
}

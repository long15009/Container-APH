import { useMemo, useRef, useState } from 'react';
import AppLayout from './components/layout/AppLayout.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import MainPanel from './components/layout/MainPanel.jsx';
import CalculateBar from './components/layout/CalculateBar.jsx';
import VehicleSelector from './components/vehicle/VehicleSelector.jsx';
import CargoPanel from './components/cargo/CargoPanel.jsx';
import Viewport3D from './components/viewport3d/Viewport3D.jsx';
import ResultsPanel from './components/results/ResultsPanel.jsx';
import PalletSettings from './components/pallet/PalletSettings.jsx';
import { DEFAULT_PALLET_SETTINGS, resolvePalletConfig } from './data/palletPresets.js';
import { CONTAINER_PRESETS, CUSTOM_VEHICLE_ID, DEFAULT_CUSTOM_VEHICLE } from './data/containerPresets.js';
import { getPaletteColor } from './data/colorPalette.js';
import { SAMPLE_CARGO } from './data/sampleCargo.js';
import { usePacking } from './hooks/usePacking.js';
import { DEFAULT_LENGTH_UNIT, toCm } from './utils/units.js';

function resolveVehicle(vehicleId, customValues) {
  if (vehicleId !== CUSTOM_VEHICLE_ID) return CONTAINER_PRESETS.find((preset) => preset.id === vehicleId);
  const vehicle = {
    id: CUSTOM_VEHICLE_ID,
    name: 'Tùy chỉnh',
    length: toCm(Number(customValues.length), customValues.unit),
    width: toCm(Number(customValues.width), customValues.unit),
    height: toCm(Number(customValues.height), customValues.unit),
    maxWeight: Number(customValues.maxWeight),
  };
  const valid = [vehicle.length, vehicle.width, vehicle.height, vehicle.maxWeight].every((v) => v > 0);
  return valid ? vehicle : null;
}

export default function App() {
  const [vehicleId, setVehicleId] = useState(CONTAINER_PRESETS[0].id);
  const [customValues, setCustomValues] = useState(() => ({
    ...Object.fromEntries(Object.entries(DEFAULT_CUSTOM_VEHICLE).map(([key, value]) => [key, String(value)])),
    unit: DEFAULT_LENGTH_UNIT,
  }));
  const [cargoList, setCargoList] = useState([]);
  // Màu và id được cấp theo bộ đếm tăng dần để loại hàng giữ nguyên màu khi xóa loại khác.
  const counterRef = useRef(0);
  const [nextColorIndex, setNextColorIndex] = useState(0);

  const [palletSettings, setPalletSettings] = useState(DEFAULT_PALLET_SETTINGS);

  const vehicle = useMemo(() => resolveVehicle(vehicleId, customValues), [vehicleId, customValues]);
  const palletizedCount = cargoList.filter((cargo) => cargo.palletize).length;
  const palletConfig = useMemo(() => resolvePalletConfig(palletSettings), [palletSettings]);
  // Chỉ truyền cấu hình pallet khi thực sự có hàng đóng pallet, để đổi cấu hình không làm kết quả bị coi là cũ.
  const activePalletConfig = palletizedCount > 0 ? palletConfig : null;
  const { result, isCalculating, isStale, calculate } = usePacking(vehicle, cargoList, activePalletConfig);

  function addCargo(values) {
    counterRef.current += 1;
    const cargo = { ...values, id: `cargo-${counterRef.current}` };
    setCargoList((list) => [...list, cargo]);
    setNextColorIndex((index) => index + 1);
  }

  function updateCargo(id, values) {
    setCargoList((list) => list.map((cargo) => (cargo.id === id ? { ...cargo, ...values } : cargo)));
  }

  function deleteCargo(id) {
    setCargoList((list) => list.filter((cargo) => cargo.id !== id));
  }

  function loadSample() {
    SAMPLE_CARGO.forEach((sample, index) => addCargo({ ...sample, color: getPaletteColor(nextColorIndex + index) }));
  }

  /** Nhập nhiều loại hàng từ file; replace = true thì thay toàn bộ danh sách (màu đánh lại từ đầu). */
  function importCargo(items, replace) {
    const firstColorIndex = replace ? 0 : nextColorIndex;
    const created = items.map((item, index) => {
      counterRef.current += 1;
      return { ...item, color: getPaletteColor(firstColorIndex + index), id: `cargo-${counterRef.current}` };
    });
    setCargoList((list) => (replace ? created : [...list, ...created]));
    setNextColorIndex(firstColorIndex + items.length);
  }

  function clearAllCargo() {
    setCargoList([]);
    setNextColorIndex(0);
  }

  let disabledReason = null;
  if (!vehicle) disabledReason = 'Kích thước / tải trọng phương tiện chưa hợp lệ';
  else if (cargoList.length === 0) disabledReason = 'Thêm ít nhất 1 loại hàng để tính toán';
  else if (palletizedCount > 0 && !palletConfig) disabledReason = 'Cấu hình pallet chưa hợp lệ';

  // Có kết quả thì hiển thị đúng dữ liệu đã dùng để tính; chưa có thì chỉ hiện khung phương tiện đang chọn.
  const viewVehicle = result ? result.vehicle : vehicle || CONTAINER_PRESETS[0];
  const viewItems = result ? result.placed : [];
  const viewCargoList = result ? result.cargoList : cargoList;

  return (
    <AppLayout
      sidebar={
        <Sidebar
          footer={
            <CalculateBar
              onCalculate={calculate}
              disabled={disabledReason !== null}
              disabledReason={disabledReason}
              isCalculating={isCalculating}
            />
          }
        >
          <VehicleSelector
            vehicleId={vehicleId}
            onVehicleIdChange={setVehicleId}
            customValues={customValues}
            onCustomValuesChange={setCustomValues}
            vehicle={vehicle}
          />
          <CargoPanel
            cargoList={cargoList}
            nextColor={getPaletteColor(nextColorIndex)}
            onAdd={addCargo}
            onUpdate={updateCargo}
            onDelete={deleteCargo}
            onLoadSample={loadSample}
            onImport={importCargo}
            onClearAll={clearAllCargo}
          />
          <PalletSettings settings={palletSettings} onChange={setPalletSettings} palletizedCount={palletizedCount} />
        </Sidebar>
      }
      main={
        <MainPanel
          viewport={
            <Viewport3D
              vehicle={viewVehicle}
              placedItems={viewItems}
              cargoList={viewCargoList}
              isCalculating={isCalculating}
            />
          }
          results={<ResultsPanel result={result} isStale={isStale} />}
        />
      }
    />
  );
}

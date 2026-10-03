// Danh sách phương tiện chứa hàng có sẵn. Đơn vị: cm (kích thước lòng thùng), kg (tải trọng).
export const CONTAINER_PRESETS = [
  { id: '20DC', name: "Cont 20' (20DC)", length: 590, width: 235, height: 239, maxWeight: 28200 },
  { id: '20HC', name: "Cont 20' cao (20HC)", length: 590, width: 235, height: 269, maxWeight: 28000 },
  { id: '40DC', name: "Cont 40' (40DC)", length: 1203, width: 235, height: 239, maxWeight: 26700 },
  { id: '40HC', name: "Cont 40' cao (40HC)", length: 1203, width: 235, height: 269, maxWeight: 26500 },
  { id: '45HC', name: "Cont 45' cao (45HC)", length: 1355, width: 235, height: 269, maxWeight: 25000 },
  { id: 'TRUCK5', name: 'Xe tải thùng kín 5 tấn', length: 620, width: 210, height: 220, maxWeight: 5000 },
  { id: 'TRUCK8', name: 'Xe tải thùng kín 8 tấn', length: 760, width: 230, height: 250, maxWeight: 8000 },
  { id: 'TRUCK15', name: 'Xe tải thùng kín 15 tấn', length: 920, width: 240, height: 240, maxWeight: 15000 },
];

export const CUSTOM_VEHICLE_ID = 'custom';

export const DEFAULT_CUSTOM_VEHICLE = { length: 600, width: 240, height: 240, maxWeight: 10000 };

// Gọi engine lập phương án (đóng pallet + xếp hàng) và quản lý trạng thái tính toán.
import { useCallback, useMemo, useState } from 'react';
import { planLoading } from '../engine/planLoading.js';

function makeSignature(vehicle, cargoList, palletConfig) {
  return JSON.stringify({ vehicle, cargoList, palletConfig });
}

/** palletConfig: cấu hình pallet (cm, kg) hoặc null khi không có loại hàng nào đóng pallet. */
export function usePacking(vehicle, cargoList, palletConfig) {
  const [result, setResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const currentSignature = useMemo(
    () => makeSignature(vehicle, cargoList, palletConfig),
    [vehicle, cargoList, palletConfig],
  );

  const calculate = useCallback(() => {
    setIsCalculating(true);
    const signature = currentSignature;
    // Nhường 1 nhịp cho trình duyệt vẽ trạng thái "Đang tính..." trước khi chạy thuật toán đồng bộ.
    setTimeout(() => {
      const plan = planLoading(vehicle, cargoList, palletConfig);
      setResult({ ...plan, vehicle, cargoList, palletConfig, signature, computedAt: new Date() });
      setIsCalculating(false);
    }, 30);
  }, [vehicle, cargoList, palletConfig, currentSignature]);

  const isStale = result !== null && result.signature !== currentSignature;

  return { result, isCalculating, isStale, calculate };
}

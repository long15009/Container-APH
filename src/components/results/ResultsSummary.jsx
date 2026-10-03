import MetricCard from './MetricCard.jsx';
import { formatCubicMeters, formatNumber, formatPercent } from '../../utils/format.js';

export default function ResultsSummary({ result }) {
  const { vehicle } = result;
  const allPlaced = result.placedCount === result.totalPieces;
  const palletsPlaced = result.placed.filter((item) => item.pallet).length;
  const remainingText = allPlaced
    ? 'Xếp hết toàn bộ hàng'
    : `Còn dư ${formatNumber(result.totalPieces - result.placedCount)} kiện`;

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
      <MetricCard
        label="Lấp đầy thể tích"
        value={formatPercent(result.volumeUtilization)}
        ratio={result.volumeUtilization}
        detail={`${formatCubicMeters(result.usedVolume)} / ${formatCubicMeters(result.containerVolume)}`}
      />
      <MetricCard
        label="Sử dụng tải trọng"
        value={formatPercent(result.weightUtilization)}
        ratio={result.weightUtilization}
        tone={result.weightUtilization > 0.95 ? 'warn' : 'neutral'}
        detail={`${formatNumber(result.totalWeight)} / ${formatNumber(vehicle.maxWeight)} kg`}
      />
      <MetricCard
        className="col-span-2 md:col-span-1"
        label="Số kiện đã xếp"
        value={`${formatNumber(result.placedCount)} / ${formatNumber(result.totalPieces)}`}
        ratio={result.totalPieces > 0 ? result.placedCount / result.totalPieces : 0}
        tone={allPlaced ? 'good' : 'bad'}
        detail={palletsPlaced > 0 ? `${remainingText} · trên ${formatNumber(palletsPlaced)} pallet` : remainingText}
      />
    </div>
  );
}

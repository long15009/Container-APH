import Button from '../ui/Button.jsx';

/** Thanh chứa nút "Tính toán xếp hàng": fixed ở đáy màn hình trên điện thoại, sticky ở đáy sidebar trên desktop. */
export default function CalculateBar({ onCalculate, disabled, disabledReason, isCalculating }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur md:sticky md:inset-x-auto md:shadow-none">
      {disabledReason && <p className="mb-1.5 text-center text-xs text-slate-500">{disabledReason}</p>}
      <Button size="lg" className="w-full" onClick={onCalculate} disabled={disabled || isCalculating}>
        {isCalculating ? 'Đang tính toán…' : 'Tính toán xếp hàng'}
      </Button>
    </div>
  );
}

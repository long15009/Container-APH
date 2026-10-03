// Bảng màu gán lần lượt cho từng loại hàng theo thứ tự thêm.
export const COLOR_PALETTE = [
  '#3b82f6', // xanh dương
  '#22c55e', // xanh lá
  '#f97316', // cam
  '#a855f7', // tím
  '#ef4444', // đỏ
  '#eab308', // vàng
  '#14b8a6', // xanh ngọc
  '#ec4899', // hồng
  '#6366f1', // chàm
  '#84cc16', // xanh nõn chuối
  '#06b6d4', // xanh lơ
  '#d946ef', // tím hồng (tránh màu nâu vì nâu dùng cho đế pallet gỗ)
];

export function getPaletteColor(index) {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

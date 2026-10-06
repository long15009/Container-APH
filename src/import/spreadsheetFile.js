// Đọc / tạo file bảng tính bằng SheetJS. Thư viện được nạp động (chỉ tải khi người dùng nhập/tải file)
// để không làm nặng lần tải trang đầu.

export const ACCEPTED_FILE_TYPES = '.xlsx,.xls,.csv';

const TEMPLATE_FILE_NAME = 'mau-nhap-hang-container-aph.xlsx';
const TEMPLATE_ROWS = [
  ['Tên hàng', 'Dài (cm)', 'Rộng (cm)', 'Cao (cm)', 'Cân nặng (kg)', 'Số lượng', 'Cho xoay (Có/Không)', 'Đóng pallet (Có/Không)'],
  ['Thùng nước giải khát', 40, 27, 25, 9, 600, 'Có', 'Không'],
  ['Thùng mì gói', 50, 35, 30, 6, 500, 'Có', 'Không'],
  ['Thùng bánh kẹo', 45, 30, 28, 4, 450, 'Có', 'Không'],
  ['Thùng sữa hộp', 35, 25, 22, 12, 400, 'Có', 'Không'],
  ['Thùng dầu ăn', 30, 20, 30, 10, 250, 'Không', 'Không'],
];

/** Đọc sheet đầu tiên của file thành mảng các dòng (mỗi dòng là mảng giá trị ô). */
export async function readSpreadsheetRows(file) {
  const XLSX = await import('xlsx');
  // CSV: để trình duyệt tự giải mã UTF-8 (tiếng Việt có dấu) rồi mới đưa chuỗi cho SheetJS.
  // raw: true giữ nguyên chữ trong ô — nếu để SheetJS tự đọc số thì "3,5" (kiểu Việt Nam) bị hiểu thành 35;
  // parseNumber của app sẽ đọc đúng.
  const isCsv = file.name.toLowerCase().endsWith('.csv');
  const workbook = isCsv
    ? XLSX.read(await file.text(), { type: 'string', raw: true })
    : XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '', blankrows: false });
}

/** Tải về file Excel mẫu có sẵn tiêu đề cột và vài dòng ví dụ. */
export async function downloadCargoTemplate() {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet(TEMPLATE_ROWS);
  sheet['!cols'] = [{ wch: 26 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 20 }, { wch: 22 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Hàng hóa');
  XLSX.writeFile(workbook, TEMPLATE_FILE_NAME);
}

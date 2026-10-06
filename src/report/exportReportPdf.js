// Xuất báo cáo phương án đóng hàng ra file PDF (A4 ngang), tạo hoàn toàn trên trình duyệt.
// jsPDF, bảng (jspdf-autotable) và phông chữ chỉ được tải khi người dùng bấm xuất.
import regularFontUrl from './fonts/BeVietnamPro-Regular.ttf?url';
import boldFontUrl from './fonts/BeVietnamPro-Bold.ttf?url';
import { computeLoadingSteps } from './loadingSteps.js';
import { describeLoadingStep } from './stepInstructions.js';
import { createViewRenderer } from './renderViews.js';
import { getPalletPreset } from '../data/palletPresets.js';
import { formatCubicMeters, formatNumber, formatPercent } from '../utils/format.js';
import { DEFAULT_LENGTH_UNIT, fromCm } from '../utils/units.js';

const FONT = 'BeVietnamPro';
const PAGE = { width: 297, height: 210, margin: 12 };
const CONTENT_WIDTH = PAGE.width - 2 * PAGE.margin;
const DONE_TYPE_ID = '__done';
const DONE_COLOR = '#d1d5db';
const PATTERN_LABELS = { column: 'Thẳng cột', interlock: 'Răng lược' };
const TABLE_STYLES = {
  styles: { font: FONT, fontSize: 9, cellPadding: 1.6, lineColor: [226, 232, 240], lineWidth: 0.1 },
  headStyles: { font: FONT, fontStyle: 'bold', fillColor: [30, 64, 175], textColor: 255 },
  footStyles: { font: FONT, fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] },
  margin: { left: PAGE.margin, right: PAGE.margin },
};

async function fetchBase64(url) {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function meters(cm) {
  return `${formatNumber(Math.round(cm) / 100)} m`;
}

function cargoDims(cargo) {
  const unit = cargo.unit || DEFAULT_LENGTH_UNIT;
  return `${[cargo.length, cargo.width, cargo.height].map((v) => formatNumber(fromCm(v, unit))).join(' × ')} ${unit}`;
}

function formatDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * @param result kết quả usePacking (planLoading + vehicle, cargoList, palletConfig, computedAt)
 */
export async function exportReportPdf(result) {
  const [{ jsPDF }, { autoTable }, regular, bold] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    fetchBase64(regularFontUrl),
    fetchBase64(boldFontUrl),
  ]);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.addFileToVFS('BeVietnamPro-Regular.ttf', regular);
  doc.addFont('BeVietnamPro-Regular.ttf', FONT, 'normal');
  doc.addFileToVFS('BeVietnamPro-Bold.ttf', bold);
  doc.addFont('BeVietnamPro-Bold.ttf', FONT, 'bold');
  doc.setFont(FONT, 'normal');

  const { vehicle, cargoList, placed, typeStats } = result;
  const cargoById = new Map(cargoList.map((c) => [c.id, c]));
  const typeInfoById = new Map(cargoList.map((c) => [c.id, { color: c.color }]));
  typeInfoById.set(DONE_TYPE_ID, { color: DONE_COLOR });
  const statById = new Map(typeStats.map((s) => [s.typeId, s]));
  const palletCount = placed.filter((item) => item.pallet).length;
  const views = createViewRenderer();

  let y = PAGE.margin;

  function heading(text, size = 13) {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(size);
    doc.setTextColor(15, 23, 42);
    doc.text(text, PAGE.margin, y + size * 0.35);
    y += size * 0.35 + 4;
    doc.setFont(FONT, 'normal');
  }

  function note(text, color = [71, 85, 105], size = 9) {
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
    doc.text(lines, PAGE.margin, y + 3);
    y += lines.length * size * 0.42 + 2;
  }

  function newPage() {
    doc.addPage();
    y = PAGE.margin;
  }

  /**
   * Mô tả cách xếp của 1 bước: mỗi tầng 1 tiêu đề in đậm, mỗi loại hàng 1 gạch đầu dòng.
   * Tự xuống dòng và sang trang khi cần.
   */
  function instructionText(levels) {
    const size = 9;
    const lineHeight = size * 0.45;
    const bottom = PAGE.height - PAGE.margin - 4;
    function line(text, x, style) {
      if (y + lineHeight > bottom) newPage();
      doc.setFont(FONT, style);
      doc.text(text, x, y + 3);
      y += lineHeight;
    }
    if (y + 3 * lineHeight > bottom) newPage();
    doc.setFontSize(size);
    doc.setTextColor(15, 23, 42);
    line('Cách xếp:', PAGE.margin, 'bold');
    y += 0.8;
    doc.setTextColor(30, 41, 59);
    for (const level of levels) {
      line(level.heading, PAGE.margin + 2, 'bold');
      for (const detail of level.details) {
        doc.splitTextToSize(detail, CONTENT_WIDTH - 12).forEach((wrapped, i) => {
          if (i === 0) {
            if (y + lineHeight > bottom) newPage();
            doc.setFont(FONT, 'normal');
            doc.text('•', PAGE.margin + 6, y + 3);
          }
          line(wrapped, PAGE.margin + 9, 'normal');
        });
      }
      y += 1;
    }
  }

  /** Chèn ảnh giữ đúng tỉ lệ, tự sang trang nếu không đủ chỗ. */
  function imageBlock(title, image, maxHeight = 85) {
    const scale = Math.min(CONTENT_WIDTH / image.width, maxHeight / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    if (y + h + 9 > PAGE.height - PAGE.margin) newPage();
    doc.setFont(FONT, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(title, PAGE.margin, y + 3.5);
    doc.setFont(FONT, 'normal');
    y += 5.5;
    doc.setDrawColor(203, 213, 225);
    doc.rect(PAGE.margin + (CONTENT_WIDTH - w) / 2, y, w, h);
    doc.addImage(image.dataUrl, 'JPEG', PAGE.margin + (CONTENT_WIDTH - w) / 2, y, w, h, undefined, 'FAST');
    y += h + 5;
  }

  try {
    // ---------- Trang 1: tổng quan ----------
    heading('PHƯƠNG ÁN ĐÓNG HÀNG', 18);
    note(`Container APH · Lập lúc ${formatDateTime(result.computedAt || new Date())}`);
    y += 2;

    const summaryRows = [
      ['Phương tiện', vehicle.name],
      ['Kích thước lòng (D × R × C)', `${formatNumber(vehicle.length)} × ${formatNumber(vehicle.width)} × ${formatNumber(vehicle.height)} cm`],
      ['Thể tích lòng', formatCubicMeters(vehicle.length * vehicle.width * vehicle.height)],
      ['Tải trọng tối đa', `${formatNumber(vehicle.maxWeight)} kg`],
      ['Số kiện đã xếp', `${formatNumber(result.placedCount)} / ${formatNumber(result.totalPieces)}`],
      ...(palletCount > 0 ? [['Số pallet đã xếp', formatNumber(palletCount)]] : []),
      ['Còn dư (chưa xếp được)', `${formatNumber(result.totalPieces - result.placedCount)} kiện`],
      ['Lấp đầy thể tích', `${formatPercent(result.volumeUtilization)} (${formatCubicMeters(result.usedVolume)})`],
      ['Tải trọng sử dụng', `${formatPercent(result.weightUtilization)} (${formatNumber(result.totalWeight)} kg)`],
    ];
    const overview = views.render(vehicle, placed, typeInfoById, 'perspective', 1600);
    const tableWidth = 92;
    const imageX = PAGE.margin + tableWidth + 6;
    const imageW = PAGE.width - PAGE.margin - imageX;
    const imageH = (imageW * overview.height) / overview.width;
    autoTable(doc, {
      ...TABLE_STYLES,
      startY: y,
      tableWidth,
      body: summaryRows,
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 46 }, 1: {} },
      theme: 'grid',
    });
    doc.setDrawColor(203, 213, 225);
    doc.rect(imageX, y, imageW, imageH);
    doc.addImage(overview.dataUrl, 'JPEG', imageX, y, imageW, imageH, undefined, 'FAST');
    y = Math.max(doc.lastAutoTable.finalY, y + imageH) + 6;

    note(
      'Quy ước: chiều dài tính từ vách đầu cont (phía trong cùng, x = 0) ra tới cửa cont. ' +
        'Hàng được đóng theo thứ tự các bước ở phần "Hướng dẫn đóng hàng".',
    );
    const leftovers = typeStats.filter((s) => s.unplaced > 0);
    if (leftovers.length > 0) {
      note(
        `Hàng chưa xếp được: ${leftovers.map((s) => `${cargoById.get(s.typeId).name} ${formatNumber(s.unplaced)} kiện`).join('; ')}.`,
        [185, 28, 28],
      );
    }

    // ---------- Trang 2: chi tiết hàng hóa ----------
    newPage();
    heading('CHI TIẾT HÀNG HÓA');
    const totals = { requested: 0, placed: 0, unplaced: 0, weight: 0 };
    const cargoRows = cargoList.map((cargo, i) => {
      const stat = statById.get(cargo.id);
      const placedWeight = stat.placed * cargo.weight;
      totals.requested += stat.requested;
      totals.placed += stat.placed;
      totals.unplaced += stat.unplaced;
      totals.weight += placedWeight;
      return [
        i + 1,
        '',
        cargo.name,
        cargoDims(cargo),
        formatNumber(cargo.weight),
        formatNumber(stat.requested),
        formatNumber(stat.placed),
        formatNumber(stat.unplaced),
        cargo.allowRotate ? 'Có' : 'Không',
        cargo.palletize ? `Có (${formatNumber(stat.palletsPlaced)}/${formatNumber(stat.palletsTotal)})` : 'Không',
        formatNumber(placedWeight),
      ];
    });
    autoTable(doc, {
      ...TABLE_STYLES,
      startY: y,
      theme: 'grid',
      head: [['#', 'Màu', 'Tên hàng', 'Kích thước (D × R × C)', 'KL/kiện (kg)', 'Yêu cầu', 'Xếp được', 'Còn dư', 'Xoay 90°', 'Đóng pallet', 'KL đã xếp (kg)']],
      body: cargoRows,
      foot: [['', '', 'Tổng cộng', '', '', formatNumber(totals.requested), formatNumber(totals.placed), formatNumber(totals.unplaced), '', '', formatNumber(totals.weight)]],
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 10 },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        10: { halign: 'right' },
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          doc.setFillColor(cargoList[data.row.index].color);
          doc.rect(data.cell.x + 2.5, data.cell.y + 1.5, data.cell.width - 5, data.cell.height - 3, 'F');
        }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 7 && data.cell.raw !== '0') data.cell.styles.textColor = [185, 28, 28];
      },
    });
    y = doc.lastAutoTable.finalY + 8;

    if (result.palletPlans?.length > 0) {
      const preset = getPalletPreset(result.palletConfig.presetId);
      heading('PHƯƠNG ÁN ĐÓNG PALLET', 11);
      note(
        `${preset.name} ${formatNumber(preset.lengthMm)} × ${formatNumber(preset.widthMm)} mm · ` +
          `${result.palletConfig.stackable ? 'Cho phép chồng pallet' : 'Không chồng pallet (không hàng nào đè lên pallet)'} · ` +
          'Thùng không thò ra mép pallet.',
      );
      autoTable(doc, {
        ...TABLE_STYLES,
        startY: y,
        theme: 'grid',
        head: [['Loại hàng', 'Kiểu xếp', 'Thùng/tầng × số tầng', 'Thùng/pallet', 'Cao pallet', 'Nặng pallet', 'Pallet (xếp/tổng)', 'Ghi chú']],
        body: result.palletPlans.map((plan) => {
          const stat = statById.get(plan.typeId);
          const name = cargoById.get(plan.typeId).name;
          if (plan.error) return [name, '—', '—', '—', '—', '—', '0/0', plan.error];
          const notes = [
            plan.interlockFallback ? 'Không cài răng lược được, đã xếp thẳng cột' : '',
            plan.limitedByWeight ? 'Giới hạn bởi tải tối đa pallet' : '',
          ].filter(Boolean);
          return [
            name,
            PATTERN_LABELS[plan.pattern],
            `${formatNumber(plan.perLayer)} × ${formatNumber(plan.layers)}`,
            formatNumber(plan.perPallet),
            `${formatNumber(plan.palletHeight)} cm`,
            `${formatNumber(plan.palletWeight)} kg`,
            `${formatNumber(stat.palletsPlaced)}/${formatNumber(stat.palletsTotal)}`,
            notes.join('; '),
          ];
        }),
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    // ---------- Các mặt cắt / hình chiếu ----------
    newPage();
    heading('CÁC HÌNH CHIẾU VÀ MẶT CẮT');
    const halfW = vehicle.width / 2;
    const halfL = vehicle.length / 2;
    imageBlock('Hình chiếu đứng — nhìn từ hông cont', views.render(vehicle, placed, typeInfoById, 'side'), 70);
    imageBlock(
      `Mặt cắt dọc giữa cont — cắt tại ${meters(halfW)} chiều rộng, nhìn từ hông vào`,
      views.render(vehicle, placed.filter((i) => i.z < halfW - 1e-6), typeInfoById, 'side'),
      70,
    );
    imageBlock('Mặt bằng — nhìn từ trên xuống', views.render(vehicle, placed, typeInfoById, 'top'), 70);
    imageBlock(
      'Lớp sàn — các kiện đặt trực tiếp trên sàn, nhìn từ trên xuống',
      views.render(vehicle, placed.filter((i) => i.y < 1e-6), typeInfoById, 'top'),
      70,
    );
    const endView = views.render(vehicle, placed, typeInfoById, 'end', 900);
    const crossSection = views.render(vehicle, placed.filter((i) => i.x < halfL - 1e-6), typeInfoById, 'end', 900);
    const pairH = 80;
    const pairW = (pairH * endView.width) / endView.height;
    if (y + pairH + 9 > PAGE.height - PAGE.margin) newPage();
    doc.setFont(FONT, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    const leftX = PAGE.margin + (CONTENT_WIDTH / 2 - pairW) / 2;
    const rightX = PAGE.margin + CONTENT_WIDTH / 2 + (CONTENT_WIDTH / 2 - pairW) / 2;
    doc.text('Nhìn từ cửa cont vào', leftX, y + 3.5);
    doc.text(`Mặt cắt ngang giữa cont — tại ${meters(halfL)} chiều dài`, rightX, y + 3.5);
    doc.setFont(FONT, 'normal');
    y += 5.5;
    doc.addImage(endView.dataUrl, 'JPEG', leftX, y, pairW, pairH, undefined, 'FAST');
    doc.addImage(crossSection.dataUrl, 'JPEG', rightX, y, pairW, pairH, undefined, 'FAST');
    doc.rect(leftX, y, pairW, pairH);
    doc.rect(rightX, y, pairW, pairH);
    y += pairH + 5;

    // ---------- Hướng dẫn đóng hàng theo bước ----------
    const steps = computeLoadingSteps(vehicle, placed);
    newPage();
    heading('HƯỚNG DẪN ĐÓNG HÀNG');
    note(
      `Đóng lần lượt ${steps.length} bước, từ vách đầu cont ra phía cửa. Trong mỗi bước làm theo thứ tự các mục 1), 2)… ` +
        '(xếp từ sàn lên, từ trong ra ngoài). Trên hình: màu xám là hàng đã xếp ở các bước trước, màu là hàng cần xếp ở bước đó.',
    );
    note(
      'Quy ước: "vách trái / vách phải" tính khi đứng ở cửa cont nhìn vào trong; "đoạn a – b m" là khoảng cách tính từ vách đầu cont; ' +
        '"đặt dọc" là cạnh Dài của thùng (theo số liệu đã nhập) nằm theo chiều dài cont, "xoay ngang" là cạnh đó nằm theo chiều rộng cont.',
    );
    let doneItems = [];
    let cumulativePieces = 0;
    let cumulativeWeight = 0;
    const stepImageW = 150; // vừa 2 bước / trang
    for (const step of steps) {
      const image = views.render(
        vehicle,
        [...doneItems, ...step.items],
        typeInfoById,
        'perspective',
        1200,
      );
      const stepImageH = (stepImageW * image.height) / image.width;
      if (y + stepImageH + 10 > PAGE.height - PAGE.margin) newPage();

      const stepPieces = [...step.countsByType.values()].reduce((sum, c) => sum + c.pieces, 0);
      const stepWeight = step.items.reduce((sum, item) => sum + item.weight, 0);
      cumulativePieces += stepPieces;
      cumulativeWeight += stepWeight;

      doc.setFont(FONT, 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 64, 175);
      doc.text(`Bước ${step.number}: đoạn ${meters(step.fromX)} – ${meters(step.toX)} tính từ vách đầu cont`, PAGE.margin, y + 4);
      doc.setFont(FONT, 'normal');
      y += 6.5;
      doc.setDrawColor(203, 213, 225);
      doc.rect(PAGE.margin, y, stepImageW, stepImageH);
      doc.addImage(image.dataUrl, 'JPEG', PAGE.margin, y, stepImageW, stepImageH, undefined, 'FAST');

      const tableX = PAGE.margin + stepImageW + 5;
      autoTable(doc, {
        ...TABLE_STYLES,
        startY: y,
        margin: { left: tableX, right: PAGE.margin },
        theme: 'grid',
        head: [['Loại hàng', 'Số kiện', 'Pallet']],
        body: [...step.countsByType.entries()].map(([typeId, count]) => [
          cargoById.get(typeId).name,
          formatNumber(count.pieces),
          count.pallets > 0 ? formatNumber(count.pallets) : '—',
        ]),
        foot: [
          ['Bước này', formatNumber(stepPieces), `${formatNumber(stepWeight)} kg`],
          ['Lũy kế', formatNumber(cumulativePieces), `${formatNumber(cumulativeWeight)} kg`],
        ],
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const typeId = [...step.countsByType.keys()][data.row.index];
            data.cell.styles.textColor = cargoById.get(typeId).color;
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });
      y = Math.max(y + stepImageH, doc.lastAutoTable.finalY) + 4;
      instructionText(describeLoadingStep(step, vehicle, cargoById));
      y += 5;
      doneItems = [...doneItems, ...step.items.map((item) => ({ ...item, typeId: DONE_TYPE_ID }))];
    }
  } finally {
    views.dispose();
  }

  // Chân trang: số trang
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Container APH · ${vehicle.name}`, PAGE.margin, PAGE.height - 6);
    doc.text(`Trang ${i}/${pageCount}`, PAGE.width - PAGE.margin, PAGE.height - 6, { align: 'right' });
  }

  const date = result.computedAt || new Date();
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  doc.save(`phuong-an-dong-hang-${vehicle.id}-${stamp}.pdf`);
}

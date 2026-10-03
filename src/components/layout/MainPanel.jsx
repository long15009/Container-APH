/** Khu vực chính: viewport 3D phía trên, kết quả phía dưới. Chừa khoảng trống đáy cho nút sticky trên điện thoại. */
export default function MainPanel({ viewport, results }) {
  return (
    <main className="flex flex-1 flex-col gap-3 p-3 pb-24 md:min-h-0 md:overflow-y-auto md:p-4">
      <div className="md:min-h-[360px] md:flex-1">{viewport}</div>
      <div className="shrink-0">{results}</div>
    </main>
  );
}

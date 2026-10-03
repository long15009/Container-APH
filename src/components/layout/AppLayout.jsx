import Header from './Header.jsx';

/**
 * Bố cục chung: md trở lên là 2 cột (sidebar trái cố định, khu vực chính cuộn riêng),
 * màn hình hẹp là 1 cột cuộn dọc theo thứ tự thao tác.
 */
export default function AppLayout({ sidebar, main }) {
  return (
    <div className="flex min-h-full flex-col md:h-full">
      <Header />
      <div className="flex flex-1 flex-col md:min-h-0 md:flex-row">
        {sidebar}
        {main}
      </div>
    </div>
  );
}

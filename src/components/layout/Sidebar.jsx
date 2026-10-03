/** Cột nhập liệu. `footer` (nút tính toán) dính đáy sidebar trên desktop, dính đáy màn hình trên điện thoại. */
export default function Sidebar({ children, footer }) {
  return (
    <aside className="flex flex-col border-slate-200 bg-white md:w-[380px] md:shrink-0 md:overflow-y-auto md:border-r lg:w-[420px]">
      <div className="flex-1 space-y-5 p-4">{children}</div>
      {footer}
    </aside>
  );
}

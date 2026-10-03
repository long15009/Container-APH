export default function Header() {
  return (
    <header className="flex shrink-0 items-center gap-2 bg-blue-800 px-4 py-2.5 text-white">
      <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
        <rect x="2" y="8" width="28" height="18" rx="2" fill="currentColor" opacity="0.25" />
        <path d="M8 11v12M13 11v12M18 11v12M23 11v12" stroke="currentColor" strokeWidth="2" />
      </svg>
      <h1 className="text-base font-bold tracking-wide">Container APH</h1>
      <span className="hidden text-xs text-blue-200 sm:inline">· Lên phương án đóng hàng container / xe tải</span>
    </header>
  );
}

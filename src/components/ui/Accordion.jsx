import { useState } from 'react';

/**
 * Accordion chỉ thu gọn được trên màn hình hẹp; từ breakpoint md trở lên nội dung luôn hiển thị.
 */
export default function Accordion({ title, badge, actions, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2 py-1 text-left md:pointer-events-none"
        >
          <svg
            viewBox="0 0 20 20"
            className={`h-4 w-4 text-slate-500 transition-transform md:hidden ${open ? 'rotate-90' : ''}`}
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M7 4l6 6-6 6V4z" />
          </svg>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{title}</h2>
          {badge}
        </button>
        {actions}
      </div>
      <div className={`${open ? 'block' : 'hidden'} pt-2 md:block`}>{children}</div>
    </section>
  );
}

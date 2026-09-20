import { useEffect, type ReactNode } from 'react';

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/45 p-4" role="presentation" onMouseDown={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
          <button className="rounded-lg px-2 py-1 text-2xl leading-none text-stone-500 hover:bg-stone-100" onClick={onClose} aria-label="Close dialog">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}
import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={`rounded-2xl border border-stone-200 bg-white shadow-[0_18px_50px_-30px_rgba(28,25,23,0.45)] ${className}`} {...props}>
      {children}
    </div>
  );
}
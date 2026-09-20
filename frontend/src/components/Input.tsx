import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string };

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label className="grid gap-2 text-sm font-medium text-stone-700" htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        className={`min-h-11 rounded-xl border border-stone-300 bg-white px-3.5 text-base font-normal text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <span className="font-normal text-red-700">{error}</span>}
    </label>
  );
}
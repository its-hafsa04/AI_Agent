import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
};

export function Button({ children, variant = 'primary', isLoading, className = '', ...props }: ButtonProps) {
  const styles = {
    primary: 'bg-teal-700 text-white shadow-sm hover:bg-teal-800 focus-visible:ring-teal-700',
    secondary: 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 focus-visible:ring-stone-500',
    ghost: 'text-stone-600 hover:bg-stone-100 focus-visible:ring-stone-500',
  }[variant];

  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? 'Please wait...' : children}
    </button>
  );
}
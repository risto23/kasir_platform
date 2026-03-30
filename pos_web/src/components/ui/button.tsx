import * as React from 'react';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'outline'
  | 'ghost';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function getVariantClass(variant: ButtonVariant) {
  switch (variant) {
    case 'secondary':
      return 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200';
    case 'danger':
      return 'bg-red-600 text-white hover:bg-red-700';
    case 'success':
      return 'bg-emerald-600 text-white hover:bg-emerald-700';
    case 'outline':
      return 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50';
    case 'ghost':
      return 'bg-transparent text-slate-700 hover:bg-slate-100';
    case 'primary':
    default:
      return 'bg-blue-600 text-white hover:bg-blue-700';
  }
}

export function Button({
  className,
  variant = 'primary',
  type = 'button',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        getVariantClass(variant),
        className
      )}
      {...props}
    />
  );
}
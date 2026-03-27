import { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      {...props}
      className={clsx(
        'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500',
        className
      )}
    />
  );
}
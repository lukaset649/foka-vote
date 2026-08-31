import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'default' | 'sm';

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300',
  secondary:
    'bg-white text-zinc-900 border border-zinc-300 hover:bg-zinc-50 disabled:text-zinc-400',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300',
  ghost: 'bg-transparent text-zinc-700 hover:bg-zinc-100 disabled:text-zinc-400',
};

const sizeClasses: Record<Size, string> = {
  default: 'px-4 py-2 text-sm',
  sm: 'px-3 py-1.5 text-sm',
};

const Button = ({ variant = 'primary', size = 'default', className, ...props }: ButtonProps) => {
  return (
    <button
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
        'disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
};

export default Button;

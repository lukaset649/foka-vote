import { cn } from '../../lib/cn';

type Variant = 'primary' | 'success' | 'danger';
type Size = 'sm' | 'md';

interface ProgressBarProps {
  /** Progress from 0 to 1; ignored when indeterminate. */
  value: number;
  label: string;
  indeterminate?: boolean;
  variant?: Variant;
  size?: Size;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-indigo-600',
  success: 'bg-emerald-600',
  danger: 'bg-rose-600',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
};

const ProgressBar = ({
  value,
  label,
  indeterminate = false,
  variant = 'primary',
  size = 'md',
  className,
}: ProgressBarProps) => {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : percent}
      className={cn(
        'w-full overflow-hidden rounded-full bg-zinc-200',
        sizeClasses[size],
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all',
          variantClasses[variant],
          indeterminate && 'animate-pulse',
        )}
        style={{ width: indeterminate ? '100%' : `${percent}%` }}
      />
    </div>
  );
};

export default ProgressBar;

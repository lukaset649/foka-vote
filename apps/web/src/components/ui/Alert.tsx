import { cn } from '../../lib/cn';

type Variant = 'error' | 'info';

interface AlertProps {
  variant: Variant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

const variantIcon: Record<Variant, string> = {
  error: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill',
};

const Alert = ({ variant, children, className }: AlertProps) => {
  return (
    <div
      role={variant === 'error' ? 'alert' : undefined}
      className={cn(
        'flex items-start gap-2 rounded-md border p-3 text-sm',
        variantClasses[variant],
        className,
      )}
    >
      <i className={cn('bi mt-0.5', variantIcon[variant])} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
};

export default Alert;

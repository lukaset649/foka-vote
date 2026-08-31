import { cn } from '../../lib/cn';

interface EmptyStateProps {
  icon: string;
  text: string;
  className?: string;
}

const EmptyState = ({ icon, text, className }: EmptyStateProps) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-300 py-10 text-center text-zinc-500',
        className,
      )}
    >
      <i className={cn('bi text-2xl', icon)} aria-hidden="true" />
      <p className="text-sm">{text}</p>
    </div>
  );
};

export default EmptyState;

import type { ContestStatus } from '@foka-vote/shared';
import { cn } from '../../lib/cn';

type BadgeColor = 'zinc' | 'blue' | 'amber' | 'emerald' | 'rose';

interface BadgeProps {
  color: BadgeColor;
  children: React.ReactNode;
  className?: string;
}

const colorClasses: Record<BadgeColor, string> = {
  zinc: 'bg-zinc-100 text-zinc-700',
  blue: 'bg-blue-100 text-blue-800',
  amber: 'bg-amber-100 text-amber-800',
  emerald: 'bg-emerald-100 text-emerald-800',
  rose: 'bg-rose-100 text-rose-800',
};

const contestStatusColor: Record<ContestStatus, BadgeColor> = {
  DRAFT: 'zinc',
  SUBMISSIONS: 'blue',
  VOTING: 'amber',
  CLOSED: 'emerald',
};

const Badge = ({ color, children, className }: BadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colorClasses[color],
        className,
      )}
    >
      {children}
    </span>
  );
};

export const ContestStatusBadge = ({ status }: { status: ContestStatus }) => (
  <Badge color={contestStatusColor[status]}>{status}</Badge>
);

export default Badge;

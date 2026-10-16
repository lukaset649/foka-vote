import { Link } from 'react-router';
import { cn } from '../../lib/cn';

export interface SegmentedTabItem {
  key: string;
  label: string;
  to?: string;
  onClick?: () => void;
}

interface SegmentedTabsProps {
  items: SegmentedTabItem[];
  activeKey: string;
  className?: string;
}

const segmentClasses = 'min-h-8 rounded px-3 py-1 text-sm font-medium transition-colors';

const SegmentedTabs = ({ items, activeKey, className }: SegmentedTabsProps) => {
  return (
    <nav className={cn('inline-flex w-fit rounded-md bg-zinc-100 p-1', className)}>
      {items.map((item) => {
        const itemClasses = cn(
          segmentClasses,
          item.key === activeKey ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500',
        );

        return item.to ? (
          <Link key={item.key} to={item.to} className={itemClasses}>
            {item.label}
          </Link>
        ) : (
          <button key={item.key} type="button" onClick={item.onClick} className={itemClasses}>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
};

export default SegmentedTabs;

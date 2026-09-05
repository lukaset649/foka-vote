import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface ActionBarProps {
  children: ReactNode;
  className?: string;
}

const ActionBar = ({ children, className }: ActionBarProps) => {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10">
      <div
        className={cn(
          'mx-auto max-w-3xl rounded-t-lg border-x border-t border-zinc-200 bg-white px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] sm:px-6',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default ActionBar;

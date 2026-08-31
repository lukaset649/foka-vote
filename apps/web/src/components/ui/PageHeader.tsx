import { Link } from 'react-router';
import { cn } from '../../lib/cn';

interface PageHeaderProps {
  title: string;
  backTo?: string;
  backLabel?: string;
  children?: React.ReactNode;
  className?: string;
}

const PageHeader = ({
  title,
  backTo,
  backLabel = 'Back',
  children,
  className,
}: PageHeaderProps) => {
  return (
    <div className={cn('mb-4 flex flex-col gap-2 sm:mb-6', className)}>
      {backTo && (
        <Link
          to={backTo}
          className="inline-flex w-fit items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
        >
          <i className="bi bi-arrow-left" aria-hidden="true" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">{title}</h1>
        {children}
      </div>
    </div>
  );
};

export default PageHeader;

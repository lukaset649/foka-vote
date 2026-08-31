import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

type TableProps = ComponentPropsWithoutRef<'table'>;

const Table = ({ className, ...props }: TableProps) => {
  return (
    <div className="overflow-x-auto rounded-md border border-zinc-200">
      <table className={cn('w-full min-w-max text-left text-sm', className)} {...props} />
    </div>
  );
};

export const TableHead = ({ className, ...props }: ComponentPropsWithoutRef<'thead'>) => (
  <thead className={cn('bg-zinc-50 text-xs uppercase text-zinc-500', className)} {...props} />
);

export const TableBody = ({ className, ...props }: ComponentPropsWithoutRef<'tbody'>) => (
  <tbody className={cn('divide-y divide-zinc-200', className)} {...props} />
);

export const TableRow = ({ className, ...props }: ComponentPropsWithoutRef<'tr'>) => (
  <tr className={cn('hover:bg-zinc-50', className)} {...props} />
);

export const TableHeaderCell = ({ className, ...props }: ComponentPropsWithoutRef<'th'>) => (
  <th className={cn('whitespace-nowrap px-3 py-2 font-medium', className)} {...props} />
);

export const TableCell = ({ className, ...props }: ComponentPropsWithoutRef<'td'>) => (
  <td className={cn('whitespace-nowrap px-3 py-2', className)} {...props} />
);

export default Table;

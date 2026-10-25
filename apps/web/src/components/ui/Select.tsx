import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

type SelectProps = ComponentPropsWithoutRef<'select'>;

const Select = ({ className, ...props }: SelectProps) => {
  return (
    <select
      className={cn(
        'min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 sm:text-sm',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
        className,
      )}
      {...props}
    />
  );
};

export default Select;

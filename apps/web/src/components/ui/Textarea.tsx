import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

type TextareaProps = ComponentPropsWithoutRef<'textarea'>;

const Textarea = ({ className, ...props }: TextareaProps) => {
  return (
    <textarea
      className={cn(
        'w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900',
        'placeholder:text-zinc-400',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
        className,
      )}
      {...props}
    />
  );
};

export default Textarea;

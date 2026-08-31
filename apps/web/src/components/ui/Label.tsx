import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

type LabelProps = ComponentPropsWithoutRef<'label'>;

const Label = ({ className, ...props }: LabelProps) => {
  return (
    <label className={cn('mb-1 block text-sm font-medium text-zinc-700', className)} {...props} />
  );
};

export default Label;

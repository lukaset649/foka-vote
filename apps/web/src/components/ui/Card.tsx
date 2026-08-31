import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';

type CardProps = ComponentPropsWithoutRef<'div'>;

const Card = ({ className, ...props }: CardProps) => {
  return (
    <div
      className={cn('rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6', className)}
      {...props}
    />
  );
};

export default Card;

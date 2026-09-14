import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'default' | 'sm' | 'icon';

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClassNames: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
};

const sizeClassNames: Record<ButtonSize, string> = {
  default: 'btn-default',
  sm: 'btn-sm',
  icon: 'btn-icon',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'default',
  className?: string,
): string {
  return cn('btn-base', variantClassNames[variant], sizeClassNames[size], className);
}

const Button = ({ variant = 'primary', size = 'default', className, ...props }: ButtonProps) => {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
};

export default Button;

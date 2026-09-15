import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn';
import './Button.css';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'ghost'
  | 'success'
  | 'warning'
  | 'secondaryAccent'
  | 'secondaryDanger';
export type ButtonSize = 'default' | 'sm' | 'icon' | 'navItem';

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClassNames: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
  success: 'btn-success',
  warning: 'btn-warning',
  secondaryAccent: 'btn-secondary-accent',
  secondaryDanger: 'btn-secondary-danger',
};

const sizeClassNames: Record<ButtonSize, string> = {
  default: 'btn-default',
  sm: 'btn-sm',
  icon: 'btn-icon',
  navItem: 'btn-nav-item',
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

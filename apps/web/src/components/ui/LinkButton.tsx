import { Link, type LinkProps } from 'react-router';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './Button';

interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const LinkButton = ({
  variant = 'primary',
  size = 'default',
  className,
  ...props
}: LinkButtonProps) => {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
};

export default LinkButton;

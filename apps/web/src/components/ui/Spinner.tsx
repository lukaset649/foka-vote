import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';

interface SpinnerProps {
  label?: string;
  className?: string;
}

const Spinner = ({ label, className }: SpinnerProps) => {
  const { t } = useTranslation();
  return (
    <div className={cn('flex items-center justify-center gap-2 py-16 text-zinc-500', className)}>
      <i className="bi bi-arrow-repeat animate-spin text-lg" aria-hidden="true" />
      <span>{label ?? t('common.loading')}</span>
    </div>
  );
};

export default Spinner;

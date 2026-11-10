import { useTranslation } from 'react-i18next';
import type { LoadError } from '../lib/loadError';
import Alert from './ui/Alert';

interface LoadErrorAlertProps {
  error: LoadError;
  message: string;
  className?: string;
}

const LoadErrorAlert = ({ error, message, className }: LoadErrorAlertProps) => {
  const { t } = useTranslation();

  return (
    <Alert variant="error" className={className}>
      {error === 'network' ? t('errors.network') : message}
    </Alert>
  );
};

export default LoadErrorAlert;

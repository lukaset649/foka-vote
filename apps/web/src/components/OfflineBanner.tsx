import { useTranslation } from 'react-i18next';
import useOnlineStatus from '../lib/useOnlineStatus';

const OfflineBanner = () => {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div role="status" aria-live="polite" className="border-b border-amber-200 bg-amber-50">
      <p className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 text-sm text-amber-900 sm:px-6">
        <i className="bi bi-wifi-off text-base" aria-hidden="true" />
        {t('components.offlineBanner.message')}
      </p>
    </div>
  );
};

export default OfflineBanner;

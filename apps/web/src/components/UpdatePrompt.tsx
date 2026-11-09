import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';
import Button from './ui/Button';

// 1 hour
const UPDATE_CHECK_INTERVAL_MS = 3600000;

const UpdatePrompt = () => {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_swUrl, registration) => {
      if (!registration) {
        return;
      }
      setInterval(() => {
        if (registration.installing || !navigator.onLine) {
          return;
        }
        registration.update().catch(() => undefined);
      }, UPDATE_CHECK_INTERVAL_MS);
    },
  });

  if (!needRefresh) {
    return null;
  }

  return (
    <div role="status" aria-live="polite" className="border-b border-indigo-200 bg-indigo-50">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2 text-sm text-indigo-900">
          <i className="bi bi-arrow-repeat text-base" aria-hidden="true" />
          {t('components.updatePrompt.message')}
        </p>
        <div className="flex gap-3">
          <Button size="sm" variant="ghost" onClick={() => void updateServiceWorker(true)}>
            {t('components.updatePrompt.refresh')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
            {t('components.updatePrompt.later')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UpdatePrompt;

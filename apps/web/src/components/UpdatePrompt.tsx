import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';
import Button from './ui/Button';

const UpdatePrompt = () => {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

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
        <div className="flex gap-2">
          <Button size="sm" onClick={() => void updateServiceWorker(true)}>
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

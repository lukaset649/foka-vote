import { useTranslation } from 'react-i18next';
import useInstallPrompt from '../lib/useInstallPrompt';

const InstalledNotice = () => {
  const { t } = useTranslation();
  const { justInstalled, dismissInstalled } = useInstallPrompt();

  if (!justInstalled) {
    return null;
  }

  return (
    <div role="status" aria-live="polite" className="border-b border-emerald-200 bg-emerald-50">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 text-sm text-emerald-900 sm:px-6">
        <i className="bi bi-check-circle-fill text-base" aria-hidden="true" />
        <p className="grow">{t('components.installedNotice.message')}</p>
        <button
          type="button"
          onClick={dismissInstalled}
          aria-label={t('common.close')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-emerald-700 transition-colors hover:bg-emerald-100"
        >
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default InstalledNotice;

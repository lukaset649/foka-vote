import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useInstallPrompt from '../lib/useInstallPrompt';
import Button, { type ButtonSize, type ButtonVariant } from './ui/Button';
import Modal from './ui/Modal';

interface InstallButtonProps {
  variant: ButtonVariant;
  size: ButtonSize;
  label: string;
}

const InstallButton = ({ variant, size, label }: InstallButtonProps) => {
  const { t } = useTranslation();
  const { canPrompt, needsIosInstructions, promptInstall } = useInstallPrompt();
  const [isIosModalOpen, setIsIosModalOpen] = useState(false);
  const titleId = useId();

  if (!canPrompt && !needsIosInstructions) {
    return null;
  }

  const handleClick = () => {
    if (canPrompt) {
      void promptInstall();
      return;
    }
    setIsIosModalOpen(true);
  };

  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={handleClick}>
        <i className="bi bi-download" aria-hidden="true" />
        {label}
      </Button>

      <Modal
        open={isIosModalOpen}
        onClose={() => setIsIosModalOpen(false)}
        ariaLabelledBy={titleId}
        className="max-w-sm p-6"
      >
        <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
          {t('components.installInstructions.title')}
        </h2>
        <ol className="mt-4 flex flex-col gap-3 text-sm text-zinc-700">
          <li className="flex items-start gap-3">
            <i className="bi bi-box-arrow-up text-lg text-indigo-600" aria-hidden="true" />
            {t('components.installInstructions.share')}
          </li>
          <li className="flex items-start gap-3">
            <i className="bi bi-plus-square text-lg text-indigo-600" aria-hidden="true" />
            {t('components.installInstructions.addToHomeScreen')}
          </li>
          <li className="flex items-start gap-3">
            <i className="bi bi-check2-circle text-lg text-indigo-600" aria-hidden="true" />
            {t('components.installInstructions.confirm')}
          </li>
        </ol>
        <div className="mt-6 flex justify-end">
          <Button type="button" variant="secondary" onClick={() => setIsIosModalOpen(false)}>
            {t('common.close')}
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default InstallButton;

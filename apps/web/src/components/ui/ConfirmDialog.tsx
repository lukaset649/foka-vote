import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ButtonVariant } from './Button';
import Button from './Button';
import Input from './Input';
import Label from './Label';
import Modal from './Modal';

const TITLE_ID = 'confirm-dialog-title';
const PROMPT_ID = 'confirm-dialog-prompt';

interface ConfirmDialogProps {
  open: boolean;
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  promptLabel?: string;
  onConfirm: (promptValue: string) => void;
  onCancel: () => void;
}

const ConfirmDialog = ({
  open,
  message,
  title,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'primary',
  promptLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const { t } = useTranslation();
  const [promptValue, setPromptValue] = useState('');

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    onConfirm(promptValue);
  };

  return (
    <Modal open={open} onClose={onCancel} ariaLabelledBy={TITLE_ID} className="max-w-md">
      <div className="px-6 py-5">
        <h2 id={TITLE_ID} className="text-lg font-semibold text-zinc-900">
          {title ?? t('common.confirmTitle')}
        </h2>
        <p className="mt-2 text-sm text-zinc-600">{message}</p>

        {promptLabel && (
          <div className="mt-4">
            <Label htmlFor={PROMPT_ID}>{promptLabel}</Label>
            <Input
              id={PROMPT_ID}
              autoFocus
              value={promptValue}
              onChange={(event) => setPromptValue(event.target.value)}
              onKeyDown={handlePromptKeyDown}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-zinc-200 px-6 py-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {cancelLabel ?? t('common.cancel')}
        </Button>
        <Button
          type="button"
          variant={confirmVariant}
          autoFocus={!promptLabel}
          onClick={() => onConfirm(promptValue)}
        >
          {confirmLabel ?? t('common.confirm')}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;

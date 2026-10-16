import { useCallback, useState, type ReactNode } from 'react';
import type { ButtonVariant } from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export interface ConfirmOptions {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
}

interface PromptOptions extends ConfirmOptions {
  promptLabel: string;
}

interface PendingRequest extends ConfirmOptions {
  promptLabel?: string;
  resolve: (value: string | null) => void;
}

const useConfirm = () => {
  const [pending, setPending] = useState<PendingRequest | null>(null);

  const ask = useCallback(
    (options: ConfirmOptions & { promptLabel?: string }) =>
      new Promise<string | null>((resolve) => {
        setPending({ ...options, resolve });
      }),
    [],
  );

  const confirm = useCallback(
    (options: ConfirmOptions) => ask(options).then((value) => value !== null),
    [ask],
  );

  const promptFor = useCallback((options: PromptOptions) => ask(options), [ask]);

  const settle = (value: string | null) => {
    pending?.resolve(value);
    setPending(null);
  };

  const confirmDialog: ReactNode = pending && (
    <ConfirmDialog
      open
      message={pending.message}
      {...(pending.title !== undefined ? { title: pending.title } : {})}
      {...(pending.confirmLabel !== undefined ? { confirmLabel: pending.confirmLabel } : {})}
      {...(pending.cancelLabel !== undefined ? { cancelLabel: pending.cancelLabel } : {})}
      {...(pending.confirmVariant !== undefined ? { confirmVariant: pending.confirmVariant } : {})}
      {...(pending.promptLabel !== undefined ? { promptLabel: pending.promptLabel } : {})}
      onConfirm={settle}
      onCancel={() => settle(null)}
    />
  );

  return { confirm, promptFor, confirmDialog };
};

export default useConfirm;

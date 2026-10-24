import { useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import Modal from './Modal';

export interface DescriptionItem {
  title: string;
  text: string;
  thumbUrl: string;
}

interface DescriptionModalProps {
  items: DescriptionItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const DescriptionModal = ({ items, index, onIndexChange, onClose }: DescriptionModalProps) => {
  const { t } = useTranslation();
  const titleId = useId();
  const item = items[index];
  const hasPrevious = index > 0;
  const hasNext = index < items.length - 1;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && hasPrevious) {
        onIndexChange(index - 1);
      } else if (event.key === 'ArrowRight' && hasNext) {
        onIndexChange(index + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [index, hasPrevious, hasNext, onIndexChange]);

  if (!item) {
    return null;
  }

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabelledBy={titleId}
      className="flex h-[min(85vh,32rem)] max-w-lg flex-col p-6"
    >
      <div className="flex items-start gap-4 border-b border-zinc-200 pb-4">
        <img
          src={item.thumbUrl}
          alt=""
          className="size-16 shrink-0 rounded-md border border-zinc-200 object-cover sm:size-20"
        />
        <h2
          id={titleId}
          className="min-w-0 pt-2.5 text-lg font-semibold break-words text-zinc-900 sm:pt-4"
        >
          {item.title}
        </h2>
      </div>
      <p className="mt-4 min-h-0 flex-1 overflow-y-auto text-sm break-words whitespace-pre-line text-zinc-700">
        {item.text}
      </p>
      <div className="mt-6 flex items-center justify-between gap-2">
        {items.length > 1 ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              disabled={!hasPrevious}
              onClick={() => onIndexChange(index - 1)}
              aria-label={t('components.descriptionModal.previous')}
            >
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </Button>
            <span className="min-w-12 text-center text-sm text-zinc-500 tabular-nums">
              {index + 1} / {items.length}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              disabled={!hasNext}
              onClick={() => onIndexChange(index + 1)}
              aria-label={t('components.descriptionModal.next')}
            >
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <span />
        )}
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
      </div>
    </Modal>
  );
};

export default DescriptionModal;

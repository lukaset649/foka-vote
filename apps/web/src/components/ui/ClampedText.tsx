import { useId, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import Modal from './Modal';

interface ClampedTextProps {
  text: string;
  title: string;
  thumbUrl?: string | null;
  className?: string;
}

const ClampedText = ({ text, title, thumbUrl, className }: ClampedTextProps) => {
  const { t } = useTranslation();
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const titleId = useId();

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) {
      return;
    }
    const measure = () => setIsOverflowing(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div className={className}>
      <p ref={textRef} className="line-clamp-3 whitespace-pre-line break-words">
        {text}
      </p>
      {isOverflowing && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="cursor-pointer font-medium text-indigo-600 hover:text-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {t('components.clampedText.readMore')}
        </button>
      )}

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ariaLabelledBy={titleId}
        className="flex max-h-[85vh] max-w-lg flex-col p-6"
      >
        <div className="flex items-center gap-4">
          {thumbUrl && (
            <img
              src={thumbUrl}
              alt=""
              className="size-16 shrink-0 rounded-md border border-zinc-200 object-cover sm:size-20"
            />
          )}
          <h2 id={titleId} className="min-w-0 text-lg font-semibold break-words text-zinc-900">
            {title}
          </h2>
        </div>
        <p className="mt-3 overflow-y-auto text-sm break-words whitespace-pre-line text-zinc-700">
          {text}
        </p>
        <div className="mt-6 flex justify-end">
          <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
            {t('common.close')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ClampedText;

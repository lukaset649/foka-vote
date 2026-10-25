import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ClampedTextProps {
  text: string;
  onReadMore: () => void;
  className?: string;
}

const ClampedText = ({ text, onReadMore, className }: ClampedTextProps) => {
  const { t } = useTranslation();
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

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
          onClick={onReadMore}
          className="cursor-pointer font-medium text-indigo-600 hover:text-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {t('components.clampedText.readMore')}
        </button>
      )}
    </div>
  );
};

export default ClampedText;

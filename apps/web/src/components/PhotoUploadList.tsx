import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ALLOWED_ARTWORK_MIME_TYPES, MAX_ARTWORK_FILE_SIZE_MB } from '@foka-vote/shared';
import type { PhotoUploadQueue, RejectedFile } from '../lib/usePhotoUploadQueue';
import Alert from './ui/Alert';
import Button from './ui/Button';
import PhotoUploadCard from './PhotoUploadCard';
import PhotoUploadSummary from './PhotoUploadSummary';

interface PhotoUploadListProps {
  queue: PhotoUploadQueue;
}

const PhotoUploadList = ({ queue }: PhotoUploadListProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rejected, setRejected] = useState<RejectedFile[]>([]);
  const { items, max } = queue;

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    // Cleared so that picking the same file again still fires a change event.
    event.target.value = '';
    setRejected(queue.add(files));
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">
        {t('components.photoUpload.hint', { size: MAX_ARTWORK_FILE_SIZE_MB })}
      </p>

      {items.map((item, index) => (
        <PhotoUploadCard
          key={item.key}
          item={item}
          index={index}
          count={items.length}
          onMove={(direction) => queue.move(item.key, direction)}
          onRemove={() => queue.remove(item.key)}
          onRetry={() => queue.retry(item.key)}
          onChange={(changes) => queue.update(item.key, changes)}
        />
      ))}

      {rejected.length > 0 && (
        <Alert variant="error">
          {rejected.map((file) => (
            <span key={`${file.name}-${file.reason}`} className="block">
              {t(`components.photoUpload.rejected.${file.reason}`, {
                name: file.name,
                size: MAX_ARTWORK_FILE_SIZE_MB,
                max,
              })}
            </span>
          ))}
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {items.length < max && (
          <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
            <i className="bi bi-images" aria-hidden="true" />
            {items.length === 0
              ? t('components.photoUpload.pickPhotos')
              : t('components.photoUpload.addMore')}
          </Button>
        )}
        <span className="text-sm text-zinc-500">
          {t('components.photoUpload.counter', { count: items.length, max })}
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_ARTWORK_MIME_TYPES.join(',')}
          onChange={handleFiles}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* Sticks to the bottom of the screen while the cards above are scrolled through. */}
      <PhotoUploadSummary summary={queue.summary} className="sticky bottom-2 z-10" />
    </div>
  );
};

export default PhotoUploadList;

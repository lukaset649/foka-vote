import { useTranslation } from 'react-i18next';
import type { PhotoUploadItem } from '../lib/usePhotoUploadQueue';
import Button from './ui/Button';
import Input from './ui/Input';
import Label from './ui/Label';
import ProgressBar from './ui/ProgressBar';

interface PhotoUploadCardProps {
  item: PhotoUploadItem;
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onRetry: () => void;
  onChange: (changes: Partial<Pick<PhotoUploadItem, 'title' | 'description'>>) => void;
}

const statusIcon: Record<PhotoUploadItem['status'], string> = {
  queued: 'bi-hourglass-split text-zinc-400',
  uploading: 'bi-cloud-arrow-up text-indigo-600',
  processing: 'bi-gear text-indigo-600',
  done: 'bi-check-circle-fill text-emerald-600',
  error: 'bi-exclamation-circle-fill text-rose-600',
};

const PhotoUploadCard = ({
  item,
  index,
  count,
  onMove,
  onRemove,
  onRetry,
  onChange,
}: PhotoUploadCardProps) => {
  const { t } = useTranslation();
  const statusText = t(`components.photoUpload.status.${item.status}`, {
    percent: Math.round(item.progress * 100),
  });
  const barVariant =
    item.status === 'error' ? 'danger' : item.status === 'done' ? 'success' : 'primary';

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
      <legend className="px-1 text-sm font-semibold text-zinc-700">
        {t('components.photoUpload.photoLabel', { index: index + 1 })}
      </legend>

      <div className="flex gap-4">
        <img
          src={item.previewUrl}
          alt=""
          decoding="async"
          className="h-24 w-24 shrink-0 rounded-md bg-zinc-100 object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          {item.file && <p className="truncate text-sm text-zinc-500">{item.file.name}</p>}
          <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-900">
            <i className={`bi ${statusIcon[item.status]}`} aria-hidden="true" />
            {statusText}
          </p>
          <ProgressBar
            value={item.progress}
            label={statusText}
            size="sm"
            indeterminate={item.status === 'processing'}
            variant={barVariant}
          />
          {item.error && <p className="text-sm text-rose-600">{item.error}</p>}
          {item.status === 'error' && (
            <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={onRetry}>
              <i className="bi bi-arrow-clockwise" aria-hidden="true" />
              {t('components.photoUpload.retry')}
            </Button>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor={`${item.key}-title`}>{t('common.titleOptional')}</Label>
        <Input
          id={`${item.key}-title`}
          value={item.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </div>

      <div>
        <Label htmlFor={`${item.key}-description`}>{t('common.descriptionOptional')}</Label>
        <Input
          id={`${item.key}-description`}
          value={item.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={t('components.photoUpload.moveUp')}
            title={t('components.photoUpload.moveUp')}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <i className="bi bi-arrow-up" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={t('components.photoUpload.moveDown')}
            title={t('components.photoUpload.moveDown')}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <i className="bi bi-arrow-down" aria-hidden="true" />
          </Button>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <i className="bi bi-trash" aria-hidden="true" />
          {t('common.remove')}
        </Button>
      </div>
    </fieldset>
  );
};

export default PhotoUploadCard;

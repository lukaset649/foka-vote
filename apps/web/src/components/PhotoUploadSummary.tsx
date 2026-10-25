import { useTranslation } from 'react-i18next';
import { cn } from '../lib/cn';
import type { PhotoUploadSummary as Summary } from '../lib/usePhotoUploadQueue';
import ProgressBar from './ui/ProgressBar';

interface PhotoUploadSummaryProps {
  summary: Summary;
  className?: string;
}

const PhotoUploadSummary = ({ summary, className }: PhotoUploadSummaryProps) => {
  const { t } = useTranslation();

  if (summary.total === 0) {
    return null;
  }

  const percent = Math.round(summary.fraction * 100);
  const variant = summary.busy ? 'primary' : summary.failed > 0 ? 'danger' : 'success';
  const message = summary.busy
    ? t('components.photoUpload.summary.uploading', { done: summary.done, total: summary.total })
    : summary.failed > 0
      ? t('components.photoUpload.summary.failed')
      : t('components.photoUpload.summary.done');

  return (
    <div
      aria-live="polite"
      className={cn('rounded-lg border border-zinc-200 bg-white p-3 shadow-sm', className)}
    >
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span
          className={cn(
            'font-medium',
            variant === 'primary' && 'text-zinc-900',
            variant === 'danger' && 'text-rose-700',
            variant === 'success' && 'text-emerald-700',
          )}
        >
          {variant === 'success' && (
            <i className="bi bi-check-circle-fill mr-1" aria-hidden="true" />
          )}
          {message}
        </span>
        {summary.busy && <span className="tabular-nums text-zinc-500">{percent}%</span>}
      </div>
      <ProgressBar value={summary.fraction} label={message} variant={variant} />
    </div>
  );
};

export default PhotoUploadSummary;

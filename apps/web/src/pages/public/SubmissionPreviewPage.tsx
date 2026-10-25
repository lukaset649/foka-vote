import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ErrorCode } from '@foka-vote/shared';
import { errorMessage } from '../../lib/errorMessage';
import useOnlineStatus from '../../lib/useOnlineStatus';
import { ApiError, mediaUrl } from '../../services/apiClient';
import { createSubmission } from '../../services/submissions';
import type { SubmissionDraftState } from './SubmissionFormPage';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';

const SubmissionPreviewPage = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const draft = (location.state as SubmissionDraftState | null) ?? null;
  const isOnline = useOnlineStatus();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!draft) {
    return (
      <Alert variant="info">
        {t('pages.submissionPreview.noDataFound')}{' '}
        <Link to={`/contest/${slug}/submit`} className="font-medium underline">
          {t('pages.submissionPreview.goBackToForm')}
        </Link>
        .
      </Alert>
    );
  }

  const handleBack = () => {
    void navigate(`/contest/${slug}/submit`, { state: draft, replace: true });
  };

  const submit = async () => {
    if (!slug) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const submission = await createSubmission(slug, {
        firstName: draft.firstName,
        lastName: draft.lastName,
        ...(draft.description ? { description: draft.description } : {}),
        ...(draft.reservationId ? { reservationId: draft.reservationId } : {}),
        rulesAccepted: true,
        artworks: draft.artworks.map((artwork) => ({
          uploadId: artwork.uploadId,
          ...(artwork.title ? { title: artwork.title } : {}),
          ...(artwork.description ? { description: artwork.description } : {}),
        })),
      });
      void navigate(`/contest/${slug}/submit/confirmation`, { state: { submission } });
    } catch (err) {
      if (err instanceof ApiError && err.code === ErrorCode.UNAUTHORIZED) {
        const redirect = `/contest/${slug}/submit/preview`;
        void navigate(`/contest/${slug}/gate?redirect=${encodeURIComponent(redirect)}`, {
          state: draft,
        });
        return;
      }
      setError(errorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    void submit();
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
        {t('pages.submissionPreview.heading')}
      </h1>

      <Card>
        <p className="font-medium text-zinc-900">
          {draft.firstName} {draft.lastName}
        </p>
        {draft.description && <p className="mt-1 text-sm text-zinc-600">{draft.description}</p>}
      </Card>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {draft.artworks.map((artwork, index) => (
          <li key={artwork.uploadId}>
            <div className="flex flex-col gap-2 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
              <img
                src={mediaUrl(artwork.thumbUrl)}
                alt={
                  artwork.title ||
                  t('pages.submissionPreview.artworkFallbackAlt', { index: index + 1 })
                }
                className="aspect-square w-full object-cover"
              />
              <div className="px-4 pb-4">
                {artwork.title && <p className="font-medium text-zinc-900">{artwork.title}</p>}
                {artwork.description && (
                  <p className="text-sm text-zinc-600">{artwork.description}</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={handleBack} disabled={submitting}>
          <i className="bi bi-pencil-square" aria-hidden="true" />
          {t('pages.submissionPreview.edit')}
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleSubmit}
          disabled={submitting || !isOnline}
        >
          <i
            className={submitting ? 'bi bi-arrow-repeat animate-spin' : 'bi bi-send'}
            aria-hidden="true"
          />
          {t('common.submit')}
        </Button>
      </div>

      {!isOnline && <Alert variant="info">{t('common.offlineSubmitHint')}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
};

export default SubmissionPreviewPage;

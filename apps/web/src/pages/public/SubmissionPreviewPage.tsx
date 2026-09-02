import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ErrorCode } from '@foka-vote/shared';
import { ApiError } from '../../services/apiClient';
import { createSubmission } from '../../services/submissions';
import type { SubmissionDraftState } from './SubmissionFormPage';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';

const SubmissionPreviewPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const draft = (location.state as SubmissionDraftState | null) ?? null;

  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) {
      return;
    }
    const urls = draft.artworks.map((artwork) => URL.createObjectURL(artwork.file));
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draft is a one-time navigation payload, not expected to change
  }, []);

  if (!draft) {
    return (
      <Alert variant="info">
        No submission data found.{' '}
        <Link to={`/contest/${slug}/submit`} className="font-medium underline">
          Go back to the form
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
    setUploadProgress(0);

    try {
      const submission = await createSubmission(
        slug,
        { firstName: draft.firstName, lastName: draft.lastName, description: draft.description },
        draft.artworks,
        (fraction) => setUploadProgress(Math.round(fraction * 100)),
      );
      void navigate(`/contest/${slug}/submit/confirmation`, { state: { submission } });
    } catch (err) {
      if (err instanceof ApiError && err.code === ErrorCode.UNAUTHORIZED) {
        const redirect = `/contest/${slug}/submit/preview`;
        void navigate(`/contest/${slug}/gate?redirect=${encodeURIComponent(redirect)}`, {
          state: draft,
        });
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to submit');
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
        Preview your submission
      </h1>

      <Card>
        <p className="font-medium text-zinc-900">
          {draft.firstName} {draft.lastName}
        </p>
        {draft.description && <p className="mt-1 text-sm text-zinc-600">{draft.description}</p>}
      </Card>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {draft.artworks.map((artwork, index) => (
          <li key={index}>
            <div className="flex flex-col gap-2 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
              <img
                src={previewUrls[index]}
                alt={artwork.title || `Artwork ${index + 1}`}
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
          Edit
        </Button>
        <Button type="button" variant="primary" onClick={handleSubmit} disabled={submitting}>
          <i className="bi bi-send" aria-hidden="true" />
          Submit
        </Button>
      </div>

      {submitting && (
        <div className="flex flex-col gap-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm text-zinc-600">
            {uploadProgress < 100 ? `Uploading… ${uploadProgress}%` : 'Processing…'}
          </p>
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
};

export default SubmissionPreviewPage;

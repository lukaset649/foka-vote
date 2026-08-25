import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { createSubmission } from '../../services/submissions';
import type { SubmissionDraftState } from './SubmissionFormPage';

const SubmissionPreviewPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const draft = (location.state as SubmissionDraftState | null) ?? null;

  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
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
      <p>
        No submission data found. <Link to={`/contest/${slug}/submit`}>Go back to the form</Link>.
      </p>
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
      const submission = await createSubmission(
        slug,
        { firstName: draft.firstName, lastName: draft.lastName, description: draft.description },
        draft.artworks,
      );
      void navigate(`/contest/${slug}/submit/confirmation`, { state: { submission } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    void submit();
  };

  return (
    <div>
      <h1>Preview your submission</h1>

      <p>
        {draft.firstName} {draft.lastName}
      </p>
      {draft.description && <p>{draft.description}</p>}

      <ul>
        {draft.artworks.map((artwork, index) => (
          <li key={index}>
            <img
              src={previewUrls[index]}
              alt={artwork.title || `Artwork ${index + 1}`}
              width={200}
            />
            {artwork.title && <p>{artwork.title}</p>}
            {artwork.description && <p>{artwork.description}</p>}
          </li>
        ))}
      </ul>

      <button type="button" onClick={handleBack} disabled={submitting}>
        Popraw
      </button>
      <button type="button" onClick={handleSubmit} disabled={submitting}>
        Wyślij
      </button>

      {error && <p role="alert">{error}</p>}
    </div>
  );
};

export default SubmissionPreviewPage;

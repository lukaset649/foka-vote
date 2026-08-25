import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import type { SubmissionDraftState } from './SubmissionFormPage';

const SubmissionPreviewPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const draft = (location.state as SubmissionDraftState | null) ?? null;

  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

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

  const handleSubmit = () => {
    // Wired to the real API call in the next step.
    console.log('submit', draft);
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

      <button type="button" onClick={handleBack}>
        Popraw
      </button>
      <button type="button" onClick={handleSubmit}>
        Wyślij
      </button>
    </div>
  );
};

export default SubmissionPreviewPage;

import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import type { SubmissionDto } from '@foka-vote/shared';
import { mediaUrl } from '../../services/apiClient';
import { fetchSubmissions } from '../../services/submissions';

const GalleryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [submissions, setSubmissions] = useState<SubmissionDto[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) {
      return;
    }
    let cancelled = false;

    fetchSubmissions(slug)
      .then((data) => {
        if (!cancelled) {
          setSubmissions(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return <p role="alert">Failed to load gallery</p>;
  }

  if (submissions === null) {
    return <p>Loading…</p>;
  }

  if (submissions.length === 0) {
    return <p>No submissions yet</p>;
  }

  return (
    <div>
      <h1>Gallery</h1>

      <ul>
        {submissions.map((submission) => (
          <li key={submission.id}>
            <h2>{submission.alias}</h2>
            {submission.description && <p>{submission.description}</p>}

            <ul>
              {submission.artworks.map((artwork) => (
                <li key={artwork.id}>
                  <img
                    src={mediaUrl(artwork.thumbUrl)}
                    alt={artwork.title ?? submission.alias}
                    width={200}
                  />
                  {artwork.title && <p>{artwork.title}</p>}
                  {artwork.description && <p>{artwork.description}</p>}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GalleryPage;

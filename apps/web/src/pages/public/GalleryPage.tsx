import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import type { SubmissionDto } from '@foka-vote/shared';
import { mediaUrl } from '../../services/apiClient';
import { fetchSubmissions } from '../../services/submissions';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';

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
    return <Alert variant="error">Failed to load gallery</Alert>;
  }

  if (submissions === null) {
    return <Spinner />;
  }

  return (
    <div>
      <PageHeader title="Gallery" backTo={`/contest/${slug}`} backLabel="Back to the contest" />

      {submissions.length === 0 ? (
        <EmptyState icon="bi-images" text="No submissions yet" />
      ) : (
        <ul className="flex flex-col gap-6">
          {submissions.map((submission) => (
            <li key={submission.id}>
              <Card>
                <h2 className="text-lg font-semibold text-zinc-900">{submission.alias}</h2>
                {submission.description && (
                  <p className="mt-1 text-sm text-zinc-600">{submission.description}</p>
                )}

                <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {submission.artworks.map((artwork) => (
                    <li key={artwork.id}>
                      <div className="overflow-hidden rounded-md border border-zinc-200">
                        <img
                          src={mediaUrl(artwork.thumbUrl)}
                          alt={artwork.title ?? submission.alias}
                          className="aspect-square w-full object-cover"
                        />
                      </div>
                      {artwork.title && (
                        <p className="mt-1 text-sm font-medium text-zinc-900">{artwork.title}</p>
                      )}
                      {artwork.description && (
                        <p className="text-sm text-zinc-600">{artwork.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GalleryPage;

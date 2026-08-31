import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { SubmissionDto } from '@foka-vote/shared';
import { isUnauthorizedError, mediaUrl } from '../../services/apiClient';
import { contestGatePath } from '../../services/contests';
import { fetchSubmissions } from '../../services/submissions';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import ArtworkLightbox from '../../components/ArtworkLightbox';

interface OpenLightbox {
  submissionId: string;
  index: number;
}

const GalleryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<SubmissionDto[] | null>(null);
  const [error, setError] = useState(false);
  const [lightbox, setLightbox] = useState<OpenLightbox | null>(null);

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
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        if (isUnauthorizedError(err)) {
          void navigate(contestGatePath(slug, `/contest/${slug}/gallery`), { replace: true });
          return;
        }
        setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  if (error) {
    return <Alert variant="error">Failed to load gallery</Alert>;
  }

  if (submissions === null) {
    return <Spinner />;
  }

  const openSubmission = submissions.find((submission) => submission.id === lightbox?.submissionId);

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
                  {submission.artworks.map((artwork, index) => (
                    <li key={artwork.id}>
                      <button
                        type="button"
                        onClick={() => setLightbox({ submissionId: submission.id, index })}
                        className="group block w-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      >
                        <img
                          src={mediaUrl(artwork.thumbUrl)}
                          alt={artwork.title ?? submission.alias}
                          className="aspect-square w-full rounded-md border border-zinc-200 object-cover transition-transform duration-200 group-hover:rotate-2 group-hover:scale-105"
                        />
                      </button>
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

      {openSubmission && lightbox && (
        <ArtworkLightbox
          artworks={openSubmission.artworks}
          startIndex={lightbox.index}
          open
          onClose={() => setLightbox(null)}
          authorAlias={openSubmission.alias}
        />
      )}
    </div>
  );
};

export default GalleryPage;

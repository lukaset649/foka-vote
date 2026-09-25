import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import type { ContestDto, SubmissionDto } from '@foka-vote/shared';
import { isUnauthorizedError, mediaUrl } from '../../services/apiClient';
import { contestGatePath, fetchContest } from '../../services/contests';
import { fetchSubmissions, submissionDisplayName } from '../../services/submissions';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import ArtworkLightbox from '../../components/ArtworkLightbox';
import ThumbnailTile from '../../components/ui/ThumbnailTile';

interface OpenLightbox {
  submissionId: string;
  index: number;
}

const GalleryPage = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [contest, setContest] = useState<ContestDto | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionDto[] | null>(null);
  const [error, setError] = useState(false);
  const [lightbox, setLightbox] = useState<OpenLightbox | null>(null);

  const cameFromGallery = searchParams.get('from') === 'gallery';
  const currentPath = `/contest/${slug}/gallery${cameFromGallery ? '?from=gallery' : ''}`;

  useEffect(() => {
    if (!slug) {
      return;
    }
    let cancelled = false;

    Promise.all([fetchContest(slug), fetchSubmissions(slug)])
      .then(([contestData, submissionsData]) => {
        if (!cancelled) {
          setContest(contestData);
          setSubmissions(submissionsData);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        if (isUnauthorizedError(err)) {
          void navigate(contestGatePath(slug, currentPath), { replace: true });
          return;
        }
        setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, navigate, currentPath]);

  if (error) {
    return <Alert variant="error">{t('pages.gallery.failedToLoad')}</Alert>;
  }

  if (submissions === null || contest === null) {
    return <Spinner />;
  }

  const openSubmission = submissions.find((submission) => submission.id === lightbox?.submissionId);

  return (
    <div>
      <PageHeader
        title={t('pages.gallery.heading', { title: contest.title })}
        backTo={cameFromGallery ? '/gallery' : `/contest/${slug}`}
        backLabel={cameFromGallery ? t('pages.album.backToGallery') : t('common.backToContest')}
      />

      {submissions.length === 0 ? (
        <EmptyState icon="bi-images" text={t('components.contestGalleryCard.noSubmissionsYet')} />
      ) : (
        <ul className="flex flex-col gap-6">
          {submissions.map((submission) => (
            <li key={submission.id}>
              <Card>
                <h2 className="text-lg font-semibold text-zinc-900">
                  {submissionDisplayName(submission)}
                </h2>
                {submission.description && (
                  <p className="mt-1 text-sm text-zinc-600">{submission.description}</p>
                )}

                <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {submission.artworks.map((artwork, index) => (
                    <li key={artwork.id}>
                      <ThumbnailTile
                        thumbUrl={mediaUrl(artwork.thumbUrl)}
                        alt={artwork.title ?? submissionDisplayName(submission)}
                        bordered
                        onClick={() => setLightbox({ submissionId: submission.id, index })}
                      />
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
          authorAlias={submissionDisplayName(openSubmission)}
        />
      )}
    </div>
  );
};

export default GalleryPage;

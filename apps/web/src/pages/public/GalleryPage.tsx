import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import type { ContestDto, SubmissionDto } from '@foka-vote/shared';
import { mediaUrl } from '../../services/apiClient';
import { fetchContest, isGalleryVisible } from '../../services/contests';
import { fetchSubmissions, submissionDisplayName } from '../../services/submissions';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import ArtworkLightbox from '../../components/ArtworkLightbox';
import ClampedText from '../../components/ui/ClampedText';
import DescriptionModal from '../../components/ui/DescriptionModal';
import type { DescriptionItem } from '../../components/ui/DescriptionModal';
import ThumbnailTile from '../../components/ui/ThumbnailTile';

interface OpenLightbox {
  submissionId: string;
  index: number;
}

interface OpenDescription {
  submissionId: string;
  index: number;
}

const descriptionItems = (submission: SubmissionDto): DescriptionItem[] =>
  submission.artworks.flatMap((artwork) =>
    artwork.description
      ? [
          {
            title: artwork.title ?? submissionDisplayName(submission),
            text: artwork.description,
            thumbUrl: mediaUrl(artwork.thumbUrl),
          },
        ]
      : [],
  );

const GalleryPage = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [contest, setContest] = useState<ContestDto | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionDto[] | null>(null);
  const [error, setError] = useState(false);
  const [lightbox, setLightbox] = useState<OpenLightbox | null>(null);
  const [description, setDescription] = useState<OpenDescription | null>(null);

  const cameFromGallery = searchParams.get('from') === 'gallery';
  const currentPath = `/contest/${slug}/gallery${cameFromGallery ? '?from=gallery' : ''}`;

  useEffect(() => {
    if (!slug) {
      return;
    }
    let cancelled = false;

    fetchContest(slug)
      .then(async (contestData) => {
        if (cancelled) {
          return;
        }
        if (!isGalleryVisible(contestData.status)) {
          void navigate(`/contest/${slug}`, { replace: true });
          return;
        }
        const submissionsData = await fetchSubmissions(slug);
        if (!cancelled) {
          setContest(contestData);
          setSubmissions(submissionsData);
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
  }, [slug, navigate, currentPath]);

  if (error) {
    return <Alert variant="error">{t('pages.gallery.failedToLoad')}</Alert>;
  }

  if (submissions === null || contest === null) {
    return <Spinner />;
  }

  const openSubmission = submissions.find((submission) => submission.id === lightbox?.submissionId);
  const descriptionSubmission = submissions.find(
    (submission) => submission.id === description?.submissionId,
  );

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
                        <p
                          title={artwork.title}
                          className="mt-1 line-clamp-2 text-sm font-medium break-words text-zinc-900"
                        >
                          {artwork.title}
                        </p>
                      )}
                      {artwork.description && (
                        <ClampedText
                          text={artwork.description}
                          onReadMore={() =>
                            setDescription({
                              submissionId: submission.id,
                              index: submission.artworks
                                .slice(0, index)
                                .filter((previous) => previous.description).length,
                            })
                          }
                          className="text-sm text-zinc-600"
                        />
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

      {descriptionSubmission && description && (
        <DescriptionModal
          items={descriptionItems(descriptionSubmission)}
          index={description.index}
          onIndexChange={(index) => setDescription({ ...description, index })}
          onClose={() => setDescription(null)}
        />
      )}
    </div>
  );
};

export default GalleryPage;

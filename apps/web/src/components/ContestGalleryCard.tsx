import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ContestDto, SubmissionDto } from '@foka-vote/shared';
import { mediaUrl } from '../services/apiClient';
import { fetchSubmissions, submissionDisplayName } from '../services/submissions';
import ArtworkLightbox from './ArtworkLightbox';
import Card from './ui/Card';
import EmptyState from './ui/EmptyState';
import LinkButton from './ui/LinkButton';
import Spinner from './ui/Spinner';
import ThumbnailPreviewGrid from './ui/ThumbnailPreviewGrid';

interface ContestGalleryCardProps {
  contest: ContestDto;
}

const ContestGalleryCard = ({ contest }: ContestGalleryCardProps) => {
  const { t } = useTranslation();
  const [galleryPreview, setGalleryPreview] = useState<SubmissionDto[] | null>(null);
  const [lightboxSubmission, setLightboxSubmission] = useState<SubmissionDto | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchSubmissions(contest.slug)
      .then((data) => {
        if (!cancelled) {
          setGalleryPreview(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGalleryPreview([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [contest.slug]);

  const galleryPath = `/contest/${contest.slug}/gallery`;

  return (
    <>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">{t('common.actions.gallery')}</h2>
          <LinkButton to={galleryPath} variant="secondary" size="sm">
            {t('components.contestGalleryCard.viewGallery')}
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </LinkButton>
        </div>

        {galleryPreview === null ? (
          <div className="mt-4">
            <Spinner />
          </div>
        ) : galleryPreview.length === 0 ? (
          <EmptyState
            icon="bi-images"
            text={t('components.contestGalleryCard.noSubmissionsYet')}
            className="mt-4"
          />
        ) : (
          <ThumbnailPreviewGrid
            className="mt-4"
            totalCount={galleryPreview.length}
            overflowTo={galleryPath}
            items={galleryPreview.map((submission) => ({
              id: submission.id,
              thumbUrl: submission.artworks[0] ? mediaUrl(submission.artworks[0].thumbUrl) : null,
              alt: submissionDisplayName(submission),
              label: submissionDisplayName(submission),
              onClick: () => setLightboxSubmission(submission),
            }))}
          />
        )}
      </Card>

      {lightboxSubmission && (
        <ArtworkLightbox
          artworks={lightboxSubmission.artworks}
          startIndex={0}
          open
          onClose={() => setLightboxSubmission(null)}
          authorAlias={submissionDisplayName(lightboxSubmission)}
        />
      )}
    </>
  );
};

export default ContestGalleryCard;

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { ErrorCode } from '@foka-vote/shared';
import type { AlbumDetailDto, AlbumSubmissionDto } from '@foka-vote/shared';
import { ApiError, mediaUrl } from '../../services/apiClient';
import { fetchAlbum } from '../../services/gallery';
import ArtworkLightbox from '../../components/ArtworkLightbox';
import Alert from '../../components/ui/Alert';
import Card from '../../components/ui/Card';
import ClampedText from '../../components/ui/ClampedText';
import DescriptionModal from '../../components/ui/DescriptionModal';
import type { DescriptionItem } from '../../components/ui/DescriptionModal';
import EmptyState from '../../components/ui/EmptyState';
import LinkButton from '../../components/ui/LinkButton';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';
import ThumbnailTile from '../../components/ui/ThumbnailTile';

interface OpenItem {
  submissionId: string;
  index: number;
}

const descriptionItems = (submission: AlbumSubmissionDto): DescriptionItem[] =>
  submission.photos.flatMap((photo) =>
    photo.description
      ? [
          {
            title: photo.title ?? submission.authorName,
            text: photo.description,
            thumbUrl: mediaUrl(photo.thumbUrl),
          },
        ]
      : [],
  );

const AlbumPage = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [album, setAlbum] = useState<AlbumDetailDto | null>(null);
  const [error, setError] = useState<'notFound' | 'failed' | null>(null);
  const [lightbox, setLightbox] = useState<OpenItem | null>(null);
  const [description, setDescription] = useState<OpenItem | null>(null);

  useEffect(() => {
    if (!slug) {
      return;
    }
    let cancelled = false;

    fetchAlbum(slug)
      .then((data) => {
        if (!cancelled) {
          setAlbum(data);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setError(
          err instanceof ApiError && err.code === ErrorCode.NOT_FOUND ? 'notFound' : 'failed',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return (
      <div>
        <PageHeader
          title={t('pages.album.title')}
          backTo="/gallery"
          backLabel={t('pages.album.backToGallery')}
        />
        <Alert variant="error">
          {error === 'notFound' ? t('pages.album.notFound') : t('pages.album.failedToLoad')}
        </Alert>
      </div>
    );
  }

  if (album === null) {
    return <Spinner />;
  }

  const lightboxSubmission = album.submissions.find(
    (submission) => submission.id === lightbox?.submissionId,
  );
  const descriptionSubmission = album.submissions.find(
    (submission) => submission.id === description?.submissionId,
  );

  return (
    <div>
      <PageHeader title={album.title} backTo="/gallery" backLabel={t('pages.album.backToGallery')}>
        <LinkButton to={`/gallery/${album.slug}/add-photos`} variant="primary" size="sm">
          <i className="bi bi-plus-lg" aria-hidden="true" />
          {t('pages.album.addPhotos')}
        </LinkButton>
      </PageHeader>

      <Card>
        <p className="text-sm text-zinc-500">
          {t('components.albumCard.createdOn', {
            date: new Date(album.createdAt).toLocaleDateString(),
          })}
          {` · ${t('components.albumCard.submissionsCount', { count: album.submissions.length })}`}
        </p>
        {album.description && <p className="mt-2 text-sm text-zinc-600">{album.description}</p>}

        {album.submissions.length === 0 && (
          <EmptyState icon="bi-images" text={t('pages.album.noPhotosYet')} className="mt-4" />
        )}
      </Card>

      {album.submissions.length > 0 && (
        <ul className="mt-6 flex flex-col gap-6">
          {album.submissions.map((submission) => (
            <li key={submission.id}>
              <Card>
                <h2 className="text-lg font-semibold text-zinc-900">{submission.authorName}</h2>

                <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {submission.photos.map((photo, index) => (
                    <li key={photo.id}>
                      <ThumbnailTile
                        thumbUrl={mediaUrl(photo.thumbUrl)}
                        alt={photo.title ?? submission.authorName}
                        bordered
                        onClick={() => setLightbox({ submissionId: submission.id, index })}
                      />
                      {photo.title && (
                        <p
                          title={photo.title}
                          className="mt-1 line-clamp-2 text-sm font-medium break-words text-zinc-900"
                        >
                          {photo.title}
                        </p>
                      )}
                      {photo.description && (
                        <ClampedText
                          text={photo.description}
                          onReadMore={() =>
                            setDescription({
                              submissionId: submission.id,
                              index: submission.photos
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

      {lightboxSubmission && lightbox && (
        <ArtworkLightbox
          artworks={lightboxSubmission.photos}
          startIndex={lightbox.index}
          open
          onClose={() => setLightbox(null)}
          authorAlias={lightboxSubmission.authorName}
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

export default AlbumPage;

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { ErrorCode } from '@foka-vote/shared';
import type { AlbumDetailDto } from '@foka-vote/shared';
import { ApiError, mediaUrl } from '../../services/apiClient';
import { fetchAlbum } from '../../services/gallery';
import ArtworkLightbox from '../../components/ArtworkLightbox';
import Alert from '../../components/ui/Alert';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import LinkButton from '../../components/ui/LinkButton';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';

const AlbumPage = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [album, setAlbum] = useState<AlbumDetailDto | null>(null);
  const [error, setError] = useState<'notFound' | 'failed' | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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
          {` · ${t('components.albumCard.photosCount', { count: album.photos.length })}`}
        </p>
        {album.description && <p className="mt-2 text-sm text-zinc-600">{album.description}</p>}

        {album.photos.length === 0 ? (
          <EmptyState icon="bi-images" text={t('pages.album.noPhotosYet')} className="mt-4" />
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {album.photos.map((photo, index) => (
              <li key={photo.id}>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="group block w-full cursor-pointer text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  <img
                    src={mediaUrl(photo.thumbUrl)}
                    alt={photo.title ?? photo.authorName}
                    className="aspect-square w-full rounded-md border border-zinc-200 object-cover transition-transform duration-200 group-hover:rotate-2 group-hover:scale-105"
                  />
                </button>
                {photo.title && (
                  <p className="mt-1 text-sm font-medium text-zinc-900">{photo.title}</p>
                )}
                {photo.description && <p className="text-sm text-zinc-600">{photo.description}</p>}
                <p className="text-xs text-zinc-500">
                  {t('pages.album.photoBy', { author: photo.authorName })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {lightboxIndex !== null && (
        <ArtworkLightbox
          artworks={album.photos.map((photo) => ({
            title: photo.title,
            description: photo.description,
            previewUrl: photo.previewUrl,
            width: photo.width,
            height: photo.height,
            author: photo.authorName,
          }))}
          startIndex={lightboxIndex}
          open
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
};

export default AlbumPage;

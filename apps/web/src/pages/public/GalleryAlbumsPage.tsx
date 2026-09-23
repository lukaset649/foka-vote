import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GalleryAlbumDto } from '@foka-vote/shared';
import { fetchGalleryAlbums } from '../../services/gallery';
import AlbumCard from '../../components/AlbumCard';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import LinkButton from '../../components/ui/LinkButton';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';

const GalleryAlbumsPage = () => {
  const { t } = useTranslation();
  const [albums, setAlbums] = useState<GalleryAlbumDto[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchGalleryAlbums()
      .then((data) => {
        if (!cancelled) {
          setAlbums(data);
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
  }, []);

  if (error) {
    return <Alert variant="error">{t('pages.galleryAlbums.failedToLoad')}</Alert>;
  }

  return (
    <div>
      <PageHeader title={t('pages.galleryAlbums.title')}>
        <LinkButton to="/gallery/new" variant="primary" size="sm">
          <i className="bi bi-plus-lg" aria-hidden="true" />
          {t('pages.galleryAlbums.createAlbum')}
        </LinkButton>
      </PageHeader>

      {albums === null ? (
        <Spinner />
      ) : albums.length === 0 ? (
        <EmptyState icon="bi-images" text={t('pages.galleryAlbums.noAlbumsYet')} />
      ) : (
        <ul className="flex flex-col gap-6">
          {albums.map((album) => (
            <li key={`${album.kind}-${album.id}`}>
              <AlbumCard album={album} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GalleryAlbumsPage;

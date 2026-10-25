import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GalleryAlbumDto, PaginatedDto } from '@foka-vote/shared';
import { fetchGalleryAlbums } from '../../services/gallery';
import { useClampedPage, useListSearchParams } from '../../lib/useListSearchParams';
import AlbumCard from '../../components/AlbumCard';
import ListToolbar from '../../components/ListToolbar';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import Spinner from '../../components/ui/Spinner';

const GalleryAlbumsPage = () => {
  const { t } = useTranslation();
  const { query, searchInput, setSearchInput, sortOption, setSortOption, setPage } =
    useListSearchParams();
  const [albums, setAlbums] = useState<PaginatedDto<GalleryAlbumDto> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchGalleryAlbums(query)
      .then((data) => {
        if (!cancelled) {
          setAlbums(data);
          setError(false);
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
  }, [query]);

  const totalPages = albums ? Math.ceil(albums.total / albums.pageSize) : 0;
  useClampedPage(query.page, totalPages, setPage);

  if (error && albums === null) {
    return <Alert variant="error">{t('pages.galleryAlbums.failedToLoad')}</Alert>;
  }

  const isSearching = query.q !== undefined;

  return (
    <div>
      <PageHeader title={t('pages.galleryAlbums.title')} />

      {error && (
        <Alert variant="error" className="mb-4">
          {t('pages.galleryAlbums.failedToLoad')}
        </Alert>
      )}

      {albums === null ? (
        <Spinner />
      ) : albums.total === 0 && !isSearching ? (
        <EmptyState icon="bi-images" text={t('pages.galleryAlbums.noAlbumsYet')} />
      ) : (
        <>
          <ListToolbar
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            sortOption={sortOption}
            onSortOptionChange={setSortOption}
          />
          {albums.total === 0 ? (
            <EmptyState
              icon="bi-search"
              text={t('pages.galleryAlbums.noResults', { query: query.q ?? '' })}
            />
          ) : (
            <ul className="flex flex-col gap-6">
              {albums.items.map((album) => (
                <li key={`${album.kind}-${album.id}`}>
                  <AlbumCard album={album} />
                </li>
              ))}
            </ul>
          )}
          <Pagination page={albums.page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default GalleryAlbumsPage;

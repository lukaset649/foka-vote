import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GalleryAlbumDto, PaginatedDto } from '@foka-vote/shared';
import { fetchGalleryAlbums } from '../../services/gallery';
import { useClampedPage, useListSearchParams } from '../../lib/useListSearchParams';
import { loadErrorFrom, type LoadError } from '../../lib/loadError';
import AlbumCard from '../../components/AlbumCard';
import ListToolbar from '../../components/ListToolbar';
import LoadErrorAlert from '../../components/LoadErrorAlert';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import Spinner from '../../components/ui/Spinner';

const GalleryAlbumsPage = () => {
  const { t } = useTranslation();
  const { query, searchInput, setSearchInput, sortOption, setSortOption, setPage } =
    useListSearchParams();
  const [albums, setAlbums] = useState<PaginatedDto<GalleryAlbumDto> | null>(null);
  const [error, setError] = useState<LoadError | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchGalleryAlbums(query)
      .then((data) => {
        if (!cancelled) {
          setAlbums(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(loadErrorFrom(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const totalPages = albums ? Math.ceil(albums.total / albums.pageSize) : 0;
  useClampedPage(query.page, totalPages, setPage);

  if (error && albums === null) {
    return <LoadErrorAlert error={error} message={t('pages.galleryAlbums.failedToLoad')} />;
  }

  const isSearching = query.q !== undefined;

  return (
    <div>
      <PageHeader title={t('pages.galleryAlbums.title')} />

      {error && (
        <LoadErrorAlert
          error={error}
          message={t('pages.galleryAlbums.failedToLoad')}
          className="mb-4"
        />
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

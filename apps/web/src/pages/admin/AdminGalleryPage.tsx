import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminAlbumDto, PaginatedDto } from '@foka-vote/shared';
import { errorMessage } from '../../lib/errorMessage';
import { useClampedPage, useListSearchParams } from '../../lib/useListSearchParams';
import {
  deleteAdminAlbum,
  fetchAdminAlbums,
  setAdminAlbumVisibility,
  setContestAlbumVisibility,
} from '../../services/gallery';
import ListToolbar from '../../components/ListToolbar';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import LinkButton from '../../components/ui/LinkButton';
import PageHeader from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import Spinner from '../../components/ui/Spinner';
import useConfirm from '../../lib/useConfirm';

const AdminGalleryPage = () => {
  const { t } = useTranslation();
  const { confirm, confirmDialog } = useConfirm();
  const { query, searchInput, setSearchInput, sortOption, setSortOption, setPage } =
    useListSearchParams();
  const [albums, setAlbums] = useState<PaginatedDto<AdminAlbumDto> | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchAdminAlbums(query)
      .then((data) => {
        if (!cancelled) {
          setAlbums(data);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query, reloadCount]);

  const totalPages = albums ? Math.ceil(albums.total / albums.pageSize) : 0;
  useClampedPage(query.page, totalPages, setPage);
  const isSearching = query.q !== undefined;

  const replaceAlbum = (updated: AdminAlbumDto) => {
    setAlbums((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((album) =>
              album.kind === updated.kind && album.id === updated.id ? updated : album,
            ),
          }
        : prev,
    );
  };

  const toggleVisibility = (album: AdminAlbumDto) => {
    setBusyId(album.id);
    setActionError(null);
    const action =
      album.kind === 'CONTEST'
        ? setContestAlbumVisibility(album.id, !album.hidden)
        : setAdminAlbumVisibility(album.id, !album.hidden);

    action
      .then(replaceAlbum)
      .catch((err: unknown) => setActionError(errorMessage(err, t)))
      .finally(() => setBusyId(null));
  };

  const handleDelete = async (album: AdminAlbumDto) => {
    const confirmed = await confirm({
      message: t('pages.adminGallery.confirmDelete', { title: album.title }),
      confirmLabel: t('common.remove'),
      confirmVariant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    setBusyId(album.id);
    setActionError(null);
    deleteAdminAlbum(album.id)
      // Reloading pulls the next album onto this page; an emptied last page gets clamped.
      .then(() => setReloadCount((count) => count + 1))
      .catch((err: unknown) => setActionError(errorMessage(err, t)))
      .finally(() => setBusyId(null));
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('pages.adminGallery.title')} />

      {loadError && <Alert variant="error">{t('pages.galleryAlbums.failedToLoad')}</Alert>}
      {actionError && <Alert variant="error">{actionError}</Alert>}
      {!loadError && albums === null && <Spinner />}

      {albums !== null && albums.total === 0 && !isSearching && (
        <EmptyState icon="bi-images" text={t('pages.galleryAlbums.noAlbumsYet')} />
      )}

      {albums !== null && (albums.total > 0 || isSearching) && (
        <section>
          <ListToolbar
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            sortOption={sortOption}
            onSortOptionChange={setSortOption}
          />
          {isSearching && albums.total === 0 && (
            <EmptyState
              icon="bi-search"
              text={t('pages.galleryAlbums.noResults', { query: query.q ?? '' })}
            />
          )}
          <ul className="flex flex-col gap-3">
            {albums.items.map((album) => (
              <li key={`${album.kind}-${album.id}`}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-zinc-900">{album.title}</span>
                      <Badge color={album.kind === 'CONTEST' ? 'blue' : 'zinc'}>
                        {t(`components.albumCard.kind.${album.kind}`)}
                      </Badge>
                      {album.accessCode !== null && (
                        <Badge color="amber">
                          {t('pages.adminGallery.codeBadge', { code: album.accessCode })}
                        </Badge>
                      )}
                      {album.hidden && (
                        <Badge color="zinc">{t('pages.adminGallery.hiddenBadge')}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500">
                      {new Date(album.createdAt).toLocaleDateString()} ·{' '}
                      {t('components.albumCard.submissionsCount', { count: album.itemCount })}
                    </p>
                  </div>

                  <div className="flex flex-col items-stretch gap-2 sm:items-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={busyId === album.id}
                      onClick={() => toggleVisibility(album)}
                    >
                      <i
                        className={album.hidden ? 'bi bi-eye' : 'bi bi-eye-slash'}
                        aria-hidden="true"
                      />
                      {album.hidden ? t('pages.adminGallery.show') : t('pages.adminGallery.hide')}
                    </Button>

                    {album.kind === 'CONTEST' ? (
                      <LinkButton to={`/admin/contests/${album.id}`} variant="primary" size="sm">
                        <i className="bi bi-pencil-square" aria-hidden="true" />
                        {t('pages.adminGallery.editContest')}
                      </LinkButton>
                    ) : (
                      <>
                        <LinkButton
                          to={`/admin/gallery/albums/${album.id}/photos`}
                          variant="secondary"
                          size="sm"
                        >
                          <i className="bi bi-images" aria-hidden="true" />
                          {t('pages.adminGallery.photos')}
                        </LinkButton>
                        <LinkButton
                          to={`/admin/gallery/albums/${album.id}`}
                          variant="primary"
                          size="sm"
                          className="sm:w-28"
                        >
                          <i className="bi bi-pencil-square" aria-hidden="true" />
                          {t('pages.submissionPreview.edit')}
                        </LinkButton>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          className="sm:w-28"
                          disabled={busyId === album.id}
                          onClick={() => void handleDelete(album)}
                        >
                          <i className="bi bi-trash" aria-hidden="true" />
                          {t('common.remove')}
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <Pagination page={albums.page} totalPages={totalPages} onPageChange={setPage} />
        </section>
      )}

      {confirmDialog}
    </div>
  );
};

export default AdminGalleryPage;

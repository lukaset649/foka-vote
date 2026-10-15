import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminAlbumDto } from '@foka-vote/shared';
import { MAX_ALBUM_DESCRIPTION_LENGTH, MAX_ALBUM_TITLE_LENGTH } from '@foka-vote/shared';
import { errorMessage } from '../../lib/errorMessage';
import {
  createAdminAlbum,
  deleteAdminAlbum,
  fetchAdminAlbums,
  setAdminAlbumVisibility,
  setContestAlbumVisibility,
} from '../../services/gallery';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Label from '../../components/ui/Label';
import LinkButton from '../../components/ui/LinkButton';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';
import Textarea from '../../components/ui/Textarea';

const AdminGalleryPage = () => {
  const { t } = useTranslation();
  const [albums, setAlbums] = useState<AdminAlbumDto[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchAdminAlbums()
      .then((data) => {
        if (!cancelled) {
          setAlbums(data);
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
  }, []);

  const replaceAlbum = (updated: AdminAlbumDto) => {
    setAlbums((prev) => prev?.map((album) => (album.id === updated.id ? updated : album)) ?? prev);
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setCreating(true);
    setCreateError(null);

    createAdminAlbum({
      title: title.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(accessCode.trim() ? { accessCode: accessCode.trim() } : {}),
    })
      .then((album) => {
        setAlbums((prev) => (prev ? [album, ...prev] : [album]));
        setTitle('');
        setDescription('');
        setAccessCode('');
      })
      .catch((err: unknown) => setCreateError(errorMessage(err, t)))
      .finally(() => setCreating(false));
  };

  const toggleVisibility = (album: AdminAlbumDto) => {
    setBusyId(album.id);
    const action =
      album.kind === 'CONTEST'
        ? setContestAlbumVisibility(album.id, !album.hidden)
        : setAdminAlbumVisibility(album.id, !album.hidden);

    action
      .then(replaceAlbum)
      .catch((err: unknown) => window.alert(errorMessage(err, t)))
      .finally(() => setBusyId(null));
  };

  const handleDelete = (album: AdminAlbumDto) => {
    if (!window.confirm(t('pages.adminGallery.confirmDelete', { title: album.title }))) {
      return;
    }

    setBusyId(album.id);
    deleteAdminAlbum(album.id)
      .then(() => setAlbums((prev) => prev?.filter((entry) => entry.id !== album.id) ?? prev))
      .catch((err: unknown) => window.alert(errorMessage(err, t)))
      .finally(() => setBusyId(null));
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('pages.adminGallery.title')} />

      <Card>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            {t('pages.adminGallery.newAlbumHeading')}
          </h2>

          <div>
            <Label htmlFor="album-title">{t('pages.adminGallery.titleLabel')}</Label>
            <Input
              id="album-title"
              value={title}
              maxLength={MAX_ALBUM_TITLE_LENGTH}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="album-description">{t('common.descriptionOptional')}</Label>
            <Textarea
              id="album-description"
              rows={3}
              value={description}
              maxLength={MAX_ALBUM_DESCRIPTION_LENGTH}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="album-access-code">{t('pages.adminGallery.accessCodeLabel')}</Label>
            <Input
              id="album-access-code"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              placeholder={t('pages.adminGallery.accessCodePlaceholder')}
            />
            <p className="mt-1 text-sm text-zinc-500">{t('pages.adminGallery.accessCodeHint')}</p>
          </div>

          <Button type="submit" size="sm" className="w-fit" disabled={creating}>
            <i className="bi bi-plus-circle" aria-hidden="true" />
            {t('pages.adminGallery.createAlbum')}
          </Button>

          {createError && <Alert variant="error">{createError}</Alert>}
        </form>
      </Card>

      {loadError && <Alert variant="error">{t('pages.galleryAlbums.failedToLoad')}</Alert>}
      {!loadError && albums === null && <Spinner />}

      {albums !== null && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {t('pages.adminGallery.allAlbumsHeading')}
          </h2>
          <ul className="flex flex-col gap-3">
            {albums.map((album) => (
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
                      {album.kind === 'CONTEST'
                        ? t('components.albumCard.submissionsCount', { count: album.photoCount })
                        : t('components.albumCard.photosCount', { count: album.photoCount })}
                      {album.pendingPhotoCount > 0 &&
                        ` · ${t('pages.adminGallery.pendingPhotos', {
                          count: album.pendingPhotoCount,
                        })}`}
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
                          to={`/admin/gallery/albums/${album.id}`}
                          variant="primary"
                          size="sm"
                        >
                          <i className="bi bi-pencil-square" aria-hidden="true" />
                          {t('pages.submissionPreview.edit')}
                        </LinkButton>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={busyId === album.id}
                          onClick={() => handleDelete(album)}
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
        </section>
      )}
    </div>
  );
};

export default AdminGalleryPage;

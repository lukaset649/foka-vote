import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminAlbumDto, ModerationStatus } from '@foka-vote/shared';
import { errorMessage } from '../../lib/errorMessage';
import {
  deleteAdminAlbum,
  fetchAdminAlbums,
  fetchAdminGallerySettings,
  setAdminAlbumStatus,
  setAdminAlbumVisibility,
  setContestAlbumVisibility,
  updateAdminGallerySettings,
} from '../../services/gallery';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Label from '../../components/ui/Label';
import LinkButton from '../../components/ui/LinkButton';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';

const statusColors = {
  PENDING: 'amber',
  APPROVED: 'emerald',
  REJECTED: 'rose',
} as const;

const ModerationStatusBadge = ({ status }: { status: ModerationStatus }) => {
  const { t } = useTranslation();
  return <Badge color={statusColors[status]}>{t(`moderationStatus.${status}`)}</Badge>;
};

const AdminGalleryPage = () => {
  const { t } = useTranslation();
  const [albums, setAlbums] = useState<AdminAlbumDto[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchAdminAlbums(), fetchAdminGallerySettings()])
      .then(([albumData, settings]) => {
        if (!cancelled) {
          setAlbums(albumData);
          setAccessCode(settings.accessCode ?? '');
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

  const runAlbumAction = (id: string, action: () => Promise<AdminAlbumDto>) => {
    setBusyId(id);
    action()
      .then(replaceAlbum)
      .catch((err: unknown) => window.alert(errorMessage(err, t)))
      .finally(() => setBusyId(null));
  };

  const handleSaveSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingSettings(true);
    setSettingsError(null);
    setSettingsSaved(false);

    updateAdminGallerySettings(accessCode.trim() ? accessCode.trim() : null)
      .then((settings) => {
        setAccessCode(settings.accessCode ?? '');
        setSettingsSaved(true);
      })
      .catch((err: unknown) => setSettingsError(errorMessage(err, t)))
      .finally(() => setSavingSettings(false));
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

  const toggleVisibility = (album: AdminAlbumDto) => {
    runAlbumAction(album.id, () =>
      album.kind === 'CONTEST'
        ? setContestAlbumVisibility(album.id, !album.hidden)
        : setAdminAlbumVisibility(album.id, !album.hidden),
    );
  };

  const pendingAlbums = albums?.filter((album) => album.status === 'PENDING') ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('pages.adminGallery.title')} />

      <Card>
        <form onSubmit={handleSaveSettings} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="accessCode">{t('pages.adminGallery.accessCodeLabel')}</Label>
            <Input
              id="accessCode"
              value={accessCode}
              onChange={(event) => {
                setAccessCode(event.target.value);
                setSettingsSaved(false);
              }}
              placeholder={t('pages.adminGallery.accessCodePlaceholder')}
            />
            <p className="mt-1 text-sm text-zinc-500">{t('pages.adminGallery.accessCodeHint')}</p>
          </div>
          <Button type="submit" size="sm" className="w-fit" disabled={savingSettings}>
            {t('pages.adminContestForm.saveChanges')}
          </Button>
          {settingsSaved && <Alert variant="info">{t('pages.adminGallery.settingsSaved')}</Alert>}
          {settingsError && <Alert variant="error">{settingsError}</Alert>}
        </form>
      </Card>

      {loadError && <Alert variant="error">{t('pages.galleryAlbums.failedToLoad')}</Alert>}
      {!loadError && albums === null && <Spinner />}

      {albums !== null && (
        <>
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {t('pages.adminGallery.pendingHeading')}
            </h2>
            {pendingAlbums.length === 0 ? (
              <EmptyState icon="bi-inbox" text={t('pages.adminGallery.noPending')} />
            ) : (
              <ul className="flex flex-col gap-3">
                {pendingAlbums.map((album) => (
                  <li key={album.id}>
                    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900">{album.title}</p>
                        <p className="text-sm text-zinc-500">
                          {new Date(album.createdAt).toLocaleDateString()} ·{' '}
                          {t('components.albumCard.photosCount', { count: album.photoCount })}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="success"
                          size="sm"
                          disabled={busyId === album.id}
                          onClick={() =>
                            runAlbumAction(album.id, () =>
                              setAdminAlbumStatus(album.id, 'APPROVED'),
                            )
                          }
                        >
                          <i className="bi bi-check2" aria-hidden="true" />
                          {t('pages.adminGallery.approve')}
                        </Button>
                        <Button
                          type="button"
                          variant="secondaryDanger"
                          size="sm"
                          disabled={busyId === album.id}
                          onClick={() =>
                            runAlbumAction(album.id, () =>
                              setAdminAlbumStatus(album.id, 'REJECTED'),
                            )
                          }
                        >
                          <i className="bi bi-x-lg" aria-hidden="true" />
                          {t('pages.adminGallery.reject')}
                        </Button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

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
                        {album.kind === 'STANDALONE' && (
                          <ModerationStatusBadge status={album.status} />
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
        </>
      )}
    </div>
  );
};

export default AdminGalleryPage;

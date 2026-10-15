import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import type { AdminAlbumDto, AdminAlbumPhotoDto, ModerationStatus } from '@foka-vote/shared';
import { MAX_ALBUM_DESCRIPTION_LENGTH, MAX_ALBUM_TITLE_LENGTH } from '@foka-vote/shared';
import { errorMessage } from '../../lib/errorMessage';
import { mediaUrl } from '../../services/apiClient';
import {
  deleteAdminAlbumPhoto,
  fetchAdminAlbum,
  fetchAdminAlbumPhotos,
  setAdminAlbumPhotoStatus,
  updateAdminAlbumPhoto,
} from '../../services/gallery';
import ArtworkLightbox from '../../components/ArtworkLightbox';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Label from '../../components/ui/Label';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';
import ThumbnailTile from '../../components/ui/ThumbnailTile';

const statusColors = {
  PENDING: 'amber',
  APPROVED: 'emerald',
  REJECTED: 'rose',
} as const;

const AdminAlbumPhotosPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const [album, setAlbum] = useState<AdminAlbumDto | null>(null);
  const [photos, setPhotos] = useState<AdminAlbumPhotoDto[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [drafts, setDrafts] = useState<Record<string, { title: string; description: string }>>({});
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;

    Promise.all([fetchAdminAlbum(id), fetchAdminAlbumPhotos(id)])
      .then(([albumData, photoData]) => {
        if (cancelled) {
          return;
        }
        setAlbum(albumData);
        setPhotos(photoData);
        setDrafts(
          Object.fromEntries(
            photoData.map((photo) => [
              photo.id,
              { title: photo.title ?? '', description: photo.description ?? '' },
            ]),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const replacePhoto = (updated: AdminAlbumPhotoDto) => {
    setPhotos((prev) => prev?.map((photo) => (photo.id === updated.id ? updated : photo)) ?? prev);
  };

  const changeStatus = (photoId: string, status: ModerationStatus) => {
    if (!id) {
      return;
    }
    setBusyPhotoId(photoId);
    setAdminAlbumPhotoStatus(id, photoId, status)
      .then(replacePhoto)
      .catch((err: unknown) => window.alert(errorMessage(err, t)))
      .finally(() => setBusyPhotoId(null));
  };

  const saveCaption = (photoId: string) => {
    if (!id) {
      return;
    }
    const draft = drafts[photoId];
    if (!draft) {
      return;
    }

    setBusyPhotoId(photoId);
    updateAdminAlbumPhoto(id, photoId, { title: draft.title, description: draft.description })
      .then(replacePhoto)
      .catch((err: unknown) => window.alert(errorMessage(err, t)))
      .finally(() => setBusyPhotoId(null));
  };

  const removePhoto = (photoId: string) => {
    if (!id || !window.confirm(t('pages.adminAlbumPhotos.confirmDeletePhoto'))) {
      return;
    }

    setBusyPhotoId(photoId);
    deleteAdminAlbumPhoto(id, photoId)
      .then(() => setPhotos((prev) => prev?.filter((photo) => photo.id !== photoId) ?? prev))
      .catch((err: unknown) => window.alert(errorMessage(err, t)))
      .finally(() => setBusyPhotoId(null));
  };

  if (loadError) {
    return <Alert variant="error">{t('pages.album.failedToLoad')}</Alert>;
  }

  if (album === null || photos === null) {
    return <Spinner />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('pages.adminAlbumPhotos.heading', { title: album.title })}
        backTo={`/admin/gallery/albums/${album.id}`}
        backLabel={t('pages.adminAlbumPhotos.backToAlbum')}
      />

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t('pages.adminAlbumPhotos.photosHeading')}
        </h2>

        {photos.length === 0 ? (
          <EmptyState icon="bi-images" text={t('pages.album.noPhotosYet')} />
        ) : (
          <ul className="flex flex-col gap-3">
            {photos.map((photo, index) => (
              <li key={photo.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="w-full sm:w-40 sm:shrink-0">
                    <ThumbnailTile
                      thumbUrl={mediaUrl(photo.thumbUrl)}
                      alt={photo.title ?? photo.authorName}
                      bordered
                      onClick={() => setLightboxIndex(index)}
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-zinc-900">{photo.authorName}</span>
                      <Badge color={statusColors[photo.status]}>
                        {t(`moderationStatus.${photo.status}`)}
                      </Badge>
                      <span className="text-sm text-zinc-500">
                        {new Date(photo.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor={`photo-title-${photo.id}`}>
                          {t('common.titleOptional')}
                        </Label>
                        <Input
                          id={`photo-title-${photo.id}`}
                          value={drafts[photo.id]?.title ?? ''}
                          maxLength={MAX_ALBUM_TITLE_LENGTH}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [photo.id]: {
                                title: event.target.value,
                                description: prev[photo.id]?.description ?? '',
                              },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor={`photo-description-${photo.id}`}>
                          {t('common.descriptionOptional')}
                        </Label>
                        <Input
                          id={`photo-description-${photo.id}`}
                          value={drafts[photo.id]?.description ?? ''}
                          maxLength={MAX_ALBUM_DESCRIPTION_LENGTH}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [photo.id]: {
                                title: prev[photo.id]?.title ?? '',
                                description: event.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={busyPhotoId === photo.id}
                        onClick={() => saveCaption(photo.id)}
                      >
                        <i className="bi bi-save" aria-hidden="true" />
                        {t('pages.adminSubmissionEdit.save')}
                      </Button>
                      {photo.status !== 'APPROVED' && (
                        <Button
                          type="button"
                          variant="success"
                          size="sm"
                          disabled={busyPhotoId === photo.id}
                          onClick={() => changeStatus(photo.id, 'APPROVED')}
                        >
                          <i className="bi bi-check2" aria-hidden="true" />
                          {t('pages.adminGallery.approve')}
                        </Button>
                      )}
                      {photo.status !== 'REJECTED' && (
                        <Button
                          type="button"
                          variant="secondaryDanger"
                          size="sm"
                          disabled={busyPhotoId === photo.id}
                          onClick={() => changeStatus(photo.id, 'REJECTED')}
                        >
                          <i className="bi bi-x-lg" aria-hidden="true" />
                          {t('pages.adminGallery.reject')}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={busyPhotoId === photo.id}
                        onClick={() => removePhoto(photo.id)}
                      >
                        <i className="bi bi-trash" aria-hidden="true" />
                        {t('common.remove')}
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {lightboxIndex !== null && (
        <ArtworkLightbox
          artworks={photos.map((photo) => ({
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

export default AdminAlbumPhotosPage;

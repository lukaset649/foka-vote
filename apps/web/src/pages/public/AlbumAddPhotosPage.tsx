import { useEffect, useState, type FormEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { MAX_PHOTOS_PER_ALBUM_UPLOAD } from '@foka-vote/shared';
import type { AlbumDetailDto } from '@foka-vote/shared';
import { errorMessage } from '../../lib/errorMessage';
import useLeaveWarning from '../../lib/useLeaveWarning';
import usePhotoUploadQueue from '../../lib/usePhotoUploadQueue';
import { isUnauthorizedError } from '../../services/apiClient';
import { albumGatePath, createAlbumSubmission, fetchAlbum } from '../../services/gallery';
import PhotoUploadList from '../../components/PhotoUploadList';
import RulesModal from '../../components/RulesModal';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Label from '../../components/ui/Label';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';

const AlbumAddPhotosPage = () => {
  const { t } = useTranslation();
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [album, setAlbum] = useState<AlbumDetailDto | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const albumPath = `/gallery/${slug}`;
  const gatePath = albumGatePath(slug, `${albumPath}/add-photos`);

  const queue = usePhotoUploadQueue({ kind: 'album', slug }, MAX_PHOTOS_PER_ALBUM_UPLOAD, {
    onUnauthorized: () => void navigate(gatePath, { replace: true }),
  });
  const { summary, uploadedPhotos } = queue;

  useLeaveWarning(summary.total > 0 && !submitting);

  useEffect(() => {
    if (!slug) {
      return;
    }
    let cancelled = false;

    fetchAlbum(slug)
      .then((data) => {
        if (cancelled) {
          return;
        }
        // The code is checked before the form opens, not only when photos are sent.
        if (!data.canUpload) {
          void navigate(gatePath, { replace: true });
          return;
        }
        setAlbum(data);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug, navigate, gatePath]);

  const uploadsBlockedReason =
    summary.total === 0
      ? null
      : summary.busy
        ? t('components.photoUpload.waitForUploads')
        : summary.failed > 0
          ? t('components.photoUpload.fixFailedUploads')
          : null;

  const submit = async () => {
    setFormError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setFormError(t('pages.albumAddPhotos.errors.nameRequired'));
      return;
    }
    if (!uploadedPhotos) {
      setFormError(uploadsBlockedReason ?? t('pages.albumAddPhotos.errors.photoRequired'));
      return;
    }
    if (!rulesAccepted) {
      setFormError(t('pages.albumAddPhotos.errors.rulesRequired'));
      return;
    }

    setSubmitting(true);
    try {
      await createAlbumSubmission(slug, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        rulesAccepted: true,
        photos: uploadedPhotos.map((photo) => ({
          uploadId: photo.uploadId,
          ...(photo.title ? { title: photo.title } : {}),
          ...(photo.description ? { description: photo.description } : {}),
        })),
      });
      void navigate(albumPath, { replace: true });
    } catch (err) {
      setSubmitting(false);
      if (isUnauthorizedError(err)) {
        void navigate(gatePath, { replace: true });
        return;
      }
      setFormError(errorMessage(err, t));
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  const handleCancel = async () => {
    setCancelling(true);
    await queue.clear();
    void navigate(albumPath);
  };

  if (loadError) {
    return <Alert variant="error">{t('pages.album.failedToLoad')}</Alert>;
  }

  if (album === null) {
    return <Spinner />;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <PageHeader
        title={t('pages.albumAddPhotos.heading', { title: album.title })}
        backTo={albumPath}
        backLabel={t('pages.albumAddPhotos.backToAlbum')}
      />

      <Alert variant="info">{t('pages.albumAddPhotos.infoNamePublished')}</Alert>

      <Card className="flex flex-col gap-4">
        <div>
          <Label htmlFor="firstName">{t('pages.albumAddPhotos.firstNameLabel')}</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="lastName">{t('pages.albumAddPhotos.lastNameLabel')}</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900">
          {t('pages.albumAddPhotos.photosHeading', { max: MAX_PHOTOS_PER_ALBUM_UPLOAD })}
        </h2>
        <PhotoUploadList queue={queue} />
      </div>

      <label className="flex items-start gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={rulesAccepted}
          onChange={(event) => setRulesAccepted(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
        />
        <span>
          <Trans
            i18nKey="pages.albumAddPhotos.rulesLabel"
            components={{
              rulesLink: (
                <button
                  type="button"
                  onClick={() => setRulesModalOpen(true)}
                  className="font-medium text-indigo-600 underline hover:text-indigo-800"
                />
              ),
            }}
          />
        </span>
      </label>

      <RulesModal variant="album" open={rulesModalOpen} onClose={() => setRulesModalOpen(false)} />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap justify-between gap-3">
          <Button
            type="button"
            variant="secondaryDanger"
            disabled={cancelling || submitting}
            onClick={() => void handleCancel()}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={submitting || cancelling || uploadsBlockedReason !== null}
          >
            <i
              className={submitting ? 'bi bi-arrow-repeat animate-spin' : 'bi bi-send'}
              aria-hidden="true"
            />
            {t('pages.albumAddPhotos.submit')}
          </Button>
        </div>
        {uploadsBlockedReason && (
          <p className="text-right text-sm text-zinc-500">{uploadsBlockedReason}</p>
        )}
      </div>

      {formError && <Alert variant="error">{formError}</Alert>}
    </form>
  );
};

export default AlbumAddPhotosPage;

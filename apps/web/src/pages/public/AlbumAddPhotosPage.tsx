import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { MAX_ARTWORK_FILE_SIZE_MB, MAX_PHOTOS_PER_ALBUM_UPLOAD } from '@foka-vote/shared';
import { errorMessage } from '../../lib/errorMessage';
import { isUnauthorizedError } from '../../services/apiClient';
import { addAlbumPhotos, galleryGatePath } from '../../services/gallery';
import ContestRulesModal from '../../components/ContestRulesModal';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Label from '../../components/ui/Label';
import LinkButton from '../../components/ui/LinkButton';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';

interface PhotoSlot {
  file: File | null;
  title: string;
  description: string;
}

function emptySlot(): PhotoSlot {
  return { file: null, title: '', description: '' };
}

const AlbumAddPhotosPage = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [slots, setSlots] = useState<PhotoSlot[]>([emptySlot()]);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const albumPath = `/gallery/${slug}`;

  const updateSlot = (index: number, patch: Partial<PhotoSlot>) => {
    setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  };

  const addSlot = () => {
    if (slots.length < MAX_PHOTOS_PER_ALBUM_UPLOAD) {
      setSlots((prev) => [...prev, emptySlot()]);
    }
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleFileChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    updateSlot(index, { file: event.target.files?.[0] ?? null });
  };

  const submit = async () => {
    if (!slug) {
      return;
    }

    setFormError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setFormError(t('pages.albumAddPhotos.errors.nameRequired'));
      return;
    }

    const photos = slots
      .filter((slot): slot is PhotoSlot & { file: File } => slot.file !== null)
      .map((slot) => ({ file: slot.file, title: slot.title, description: slot.description }));

    if (photos.length === 0) {
      setFormError(t('pages.albumAddPhotos.errors.photoRequired'));
      return;
    }

    if (!rulesAccepted) {
      setFormError(t('pages.albumAddPhotos.errors.rulesRequired'));
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    try {
      await addAlbumPhotos(
        slug,
        { firstName: firstName.trim(), lastName: lastName.trim() },
        photos,
        (fraction) => setUploadProgress(Math.round(fraction * 100)),
      );
      void navigate(`${albumPath}/add-photos/confirmation`, { replace: true });
    } catch (err) {
      if (isUnauthorizedError(err)) {
        void navigate(galleryGatePath(`${albumPath}/add-photos`), { replace: true });
        return;
      }
      setFormError(errorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <PageHeader
        title={t('pages.albumAddPhotos.title')}
        backTo={albumPath}
        backLabel={t('pages.albumAddPhotos.backToAlbum')}
      />

      <Alert variant="info">
        {t('pages.albumAddPhotos.infoModeration')}
        <br />
        {t('pages.albumAddPhotos.infoNamePublished')}
      </Alert>

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
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            {t('pages.albumAddPhotos.photosHeading', { max: MAX_PHOTOS_PER_ALBUM_UPLOAD })}
          </h2>
          <p className="text-sm text-zinc-500">
            {t('pages.submissionForm.maxFileSize', { size: MAX_ARTWORK_FILE_SIZE_MB })}
          </p>
        </div>

        {slots.map((slot, index) => (
          <fieldset
            key={index}
            className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
          >
            <legend className="px-1 text-sm font-semibold text-zinc-700">
              {t('pages.albumAddPhotos.photoLegend', { index: index + 1 })}
            </legend>

            <div>
              <Label htmlFor={`file-${index}`}>
                <i className="bi bi-upload" aria-hidden="true" />{' '}
                {t('pages.submissionForm.fileLabel')}
              </Label>
              <input
                id={`file-${index}`}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileChange(index)}
                className="block w-full text-sm text-zinc-700 file:mr-3 file:min-h-10 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
              />
              {slot.file && (
                <p className="mt-1 text-sm text-zinc-500">
                  {t('pages.submissionForm.currentlyAttached', { filename: slot.file.name })}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor={`title-${index}`}>{t('common.titleOptional')}</Label>
              <Input
                id={`title-${index}`}
                value={slot.title}
                onChange={(event) => updateSlot(index, { title: event.target.value })}
              />
            </div>

            <div>
              <Label htmlFor={`photo-description-${index}`}>
                {t('common.descriptionOptional')}
              </Label>
              <Input
                id={`photo-description-${index}`}
                value={slot.description}
                onChange={(event) => updateSlot(index, { description: event.target.value })}
              />
            </div>

            {slots.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={() => removeSlot(index)}
              >
                <i className="bi bi-trash" aria-hidden="true" />
                {t('common.remove')}
              </Button>
            )}
          </fieldset>
        ))}

        {slots.length < MAX_PHOTOS_PER_ALBUM_UPLOAD && (
          <Button type="button" variant="secondary" className="w-fit" onClick={addSlot}>
            <i className="bi bi-plus-circle" aria-hidden="true" />
            {t('pages.albumAddPhotos.addAnotherPhoto')}
          </Button>
        )}
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
            i18nKey="pages.submissionForm.rulesLabel"
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

      <ContestRulesModal open={rulesModalOpen} onClose={() => setRulesModalOpen(false)} />

      <div className="flex flex-wrap justify-between gap-3">
        <LinkButton to={albumPath} variant="secondaryDanger">
          {t('common.cancel')}
        </LinkButton>
        <Button type="submit" disabled={submitting}>
          <i className="bi bi-send" aria-hidden="true" />
          {t('pages.albumAddPhotos.submit')}
        </Button>
      </div>

      {formError && <Alert variant="error">{formError}</Alert>}

      <Modal open={submitting} className="max-w-sm p-6">
        <p className="mb-3 text-center font-medium text-zinc-900">
          {uploadProgress < 100
            ? t('pages.submissionPreview.uploading')
            : t('pages.submissionPreview.processing')}
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
        <p className="mt-2 text-center text-sm text-zinc-500">
          {uploadProgress < 100 ? `${uploadProgress}%` : t('pages.submissionPreview.almostDone')}
        </p>
      </Modal>
    </form>
  );
};

export default AlbumAddPhotosPage;

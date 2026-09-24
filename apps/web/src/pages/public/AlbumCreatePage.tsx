import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { MAX_ALBUM_DESCRIPTION_LENGTH, MAX_ALBUM_TITLE_LENGTH } from '@foka-vote/shared';
import { errorMessage } from '../../lib/errorMessage';
import { isUnauthorizedError } from '../../services/apiClient';
import { createAlbum, galleryGatePath } from '../../services/gallery';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Label from '../../components/ui/Label';
import PageHeader from '../../components/ui/PageHeader';
import Textarea from '../../components/ui/Textarea';

const AlbumCreatePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (title.trim().length === 0) {
      setError(t('pages.albumCreate.errors.titleRequired'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createAlbum({
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      void navigate('/gallery/new/confirmation', { replace: true });
    } catch (err) {
      if (isUnauthorizedError(err)) {
        void navigate(galleryGatePath('/gallery/new'), { replace: true });
        return;
      }
      setError(errorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  return (
    <div>
      <PageHeader
        title={t('pages.albumCreate.title')}
        backTo="/gallery"
        backLabel={t('pages.album.backToGallery')}
      />

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Alert variant="info">{t('pages.albumCreate.moderationNotice')}</Alert>

          <div>
            <Label htmlFor="album-title">{t('pages.albumCreate.titleLabel')}</Label>
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
              rows={4}
              value={description}
              maxLength={MAX_ALBUM_DESCRIPTION_LENGTH}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <Button type="submit" disabled={submitting}>
            {t('pages.albumCreate.submit')}
          </Button>

          {error && <Alert variant="error">{error}</Alert>}
        </form>
      </Card>
    </div>
  );
};

export default AlbumCreatePage;

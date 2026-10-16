import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { MAX_ALBUM_DESCRIPTION_LENGTH, MAX_ALBUM_TITLE_LENGTH } from '@foka-vote/shared';
import { errorMessage } from '../../lib/errorMessage';
import {
  createAdminAlbum,
  deleteAdminAlbum,
  fetchAdminAlbum,
  updateAdminAlbum,
} from '../../services/gallery';
import ActionBar from '../../components/ui/ActionBar';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Label from '../../components/ui/Label';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';
import Textarea from '../../components/ui/Textarea';
import useConfirm from '../../lib/useConfirm';

interface FormState {
  title: string;
  description: string;
  accessCode: string;
}

const EMPTY_FORM: FormState = { title: '', description: '', accessCode: '' };

const AdminAlbumFormPage = () => {
  const { t } = useTranslation();
  const { confirm, confirmDialog } = useConfirm();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = id !== undefined;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slug, setSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;

    fetchAdminAlbum(id)
      .then((album) => {
        if (!cancelled) {
          setForm({
            title: album.title,
            description: album.description ?? '',
            accessCode: album.accessCode ?? '',
          });
          setSlug(album.slug);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(errorMessage(err, t));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const updateField =
    (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const input = {
      title: form.title.trim(),
      description: form.description.trim(),
      accessCode: form.accessCode.trim(),
    };

    const request = id ? updateAdminAlbum(id, input) : createAdminAlbum(input);

    request
      .then(() => navigate('/admin/gallery'))
      .catch((err: unknown) => setError(errorMessage(err, t)))
      .finally(() => setSubmitting(false));
  };

  const handleDelete = async () => {
    if (!id) {
      return;
    }
    const confirmed = await confirm({
      message: t('pages.adminGallery.confirmDelete', { title: form.title }),
      confirmLabel: t('common.remove'),
      confirmVariant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    deleteAdminAlbum(id)
      .then(() => navigate('/admin/gallery'))
      .catch((err: unknown) => {
        setError(errorMessage(err, t));
        setDeleting(false);
      });
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <form onSubmit={handleSubmit} className="pb-24">
      <PageHeader
        title={
          isEditing ? t('pages.adminAlbumForm.editAlbum') : t('pages.adminGallery.newAlbumHeading')
        }
        backTo="/admin/gallery"
        backLabel={t('pages.adminAlbumForm.backToGallery')}
      >
        {isEditing && (
          <Link
            to={`/admin/gallery/albums/${id}/photos`}
            className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
          >
            <i className="bi bi-images" aria-hidden="true" />
            {t('pages.adminGallery.photos')}
          </Link>
        )}
      </PageHeader>

      <Card className="flex flex-col gap-4">
        <div>
          <Label htmlFor="title">{t('pages.adminGallery.titleLabel')}</Label>
          <Input
            id="title"
            value={form.title}
            maxLength={MAX_ALBUM_TITLE_LENGTH}
            onChange={updateField('title')}
            required
          />
        </div>

        <div>
          <Label htmlFor="description">{t('common.descriptionOptional')}</Label>
          <Textarea
            id="description"
            rows={3}
            value={form.description}
            maxLength={MAX_ALBUM_DESCRIPTION_LENGTH}
            onChange={updateField('description')}
          />
        </div>

        <div>
          <Label htmlFor="accessCode">{t('pages.adminGallery.accessCodeLabel')}</Label>
          <Input
            id="accessCode"
            value={form.accessCode}
            onChange={updateField('accessCode')}
            placeholder={t('pages.adminGallery.accessCodePlaceholder')}
          />
          <p className="mt-1 text-sm text-zinc-500">{t('pages.adminGallery.accessCodeHint')}</p>
        </div>

        {slug && (
          <p className="text-sm text-zinc-500">{t('pages.adminAlbumForm.slugLocked', { slug })}</p>
        )}
      </Card>

      <ActionBar>
        {error && (
          <Alert variant="error" className="mb-3">
            {error}
          </Alert>
        )}
        <div className={`flex items-center gap-3 ${isEditing ? 'justify-between' : 'justify-end'}`}>
          {isEditing && (
            <Button
              type="button"
              variant="danger"
              onClick={() => void handleDelete()}
              disabled={deleting}
              aria-label={t('pages.adminAlbumForm.deleteAlbum')}
            >
              <i className="bi bi-trash" aria-hidden="true" />
              <span className="hidden sm:inline">{t('pages.adminAlbumForm.deleteAlbum')}</span>
            </Button>
          )}
          <Button type="submit" disabled={submitting}>
            {isEditing
              ? t('pages.adminContestForm.saveChanges')
              : t('pages.adminGallery.createAlbum')}
          </Button>
        </div>
      </ActionBar>

      {confirmDialog}
    </form>
  );
};

export default AdminAlbumFormPage;

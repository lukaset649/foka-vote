import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import LinkButton from '../../components/ui/LinkButton';

const AlbumAddPhotosConfirmationPage = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <i className="bi bi-hourglass-split text-3xl text-indigo-600" aria-hidden="true" />
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
        {t('pages.albumAddPhotosConfirmation.title')}
      </h1>
      <p className="text-zinc-600">{t('pages.albumAddPhotosConfirmation.text')}</p>
      <LinkButton to={`/gallery/${slug}`} variant="secondary" size="sm" className="mt-2">
        <i className="bi bi-arrow-left" aria-hidden="true" />
        {t('pages.albumAddPhotos.backToAlbum')}
      </LinkButton>
    </div>
  );
};

export default AlbumAddPhotosConfirmationPage;

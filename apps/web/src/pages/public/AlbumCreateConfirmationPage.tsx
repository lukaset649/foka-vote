import { useTranslation } from 'react-i18next';
import LinkButton from '../../components/ui/LinkButton';

const AlbumCreateConfirmationPage = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <i className="bi bi-hourglass-split text-3xl text-indigo-600" aria-hidden="true" />
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
        {t('pages.albumCreateConfirmation.title')}
      </h1>
      <p className="text-zinc-600">{t('pages.albumCreateConfirmation.text')}</p>
      <LinkButton to="/gallery" variant="secondary" size="sm" className="mt-2">
        <i className="bi bi-arrow-left" aria-hidden="true" />
        {t('pages.album.backToGallery')}
      </LinkButton>
    </div>
  );
};

export default AlbumCreateConfirmationPage;

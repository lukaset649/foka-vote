import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { verifyGalleryAccessCode } from '../../services/gallery';
import AccessCodeForm from '../../components/AccessCodeForm';

const GalleryGatePage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTarget = searchParams.get('redirect') ?? '/gallery';

  return (
    <AccessCodeForm
      title={t('pages.galleryGate.title')}
      codeLabel={t('pages.galleryGate.codeLabel')}
      submitLabel={t('pages.galleryGate.submit')}
      invalidCodeMessage={t('pages.galleryGate.invalidCode')}
      verify={verifyGalleryAccessCode}
      onVerified={() =>
        void navigate(redirectTarget, { state: location.state as unknown, replace: true })
      }
    />
  );
};

export default GalleryGatePage;

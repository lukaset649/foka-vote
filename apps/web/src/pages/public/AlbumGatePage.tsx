import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { verifyAlbumAccessCode } from '../../services/gallery';
import AccessCodeForm from '../../components/AccessCodeForm';

const AlbumGatePage = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  if (!slug) {
    return null;
  }

  const redirectTarget = searchParams.get('redirect') ?? `/gallery/${slug}`;

  return (
    <AccessCodeForm
      title={t('pages.albumGate.title')}
      codeLabel={t('pages.albumGate.codeLabel')}
      submitLabel={t('pages.albumGate.submit')}
      invalidCodeMessage={t('pages.albumGate.invalidCode')}
      verify={(code) => verifyAlbumAccessCode(slug, code)}
      onVerified={() =>
        void navigate(redirectTarget, { state: location.state as unknown, replace: true })
      }
    />
  );
};

export default AlbumGatePage;

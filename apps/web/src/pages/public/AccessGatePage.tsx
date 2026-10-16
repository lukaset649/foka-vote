import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { verifyContestAccessCode } from '../../services/contests';
import AccessCodeForm from '../../components/AccessCodeForm';

const AccessGatePage = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  if (!slug) {
    return null;
  }

  const redirectTarget = searchParams.get('redirect') ?? `/contest/${slug}`;

  return (
    <AccessCodeForm
      title={t('pages.accessGate.title')}
      codeLabel={t('pages.accessGate.codeLabel')}
      submitLabel={t('pages.accessGate.submit')}
      invalidCodeMessage={t('pages.accessGate.invalidCode')}
      verify={(code) => verifyContestAccessCode(slug, code)}
      onVerified={() =>
        void navigate(redirectTarget, { state: location.state as unknown, replace: true })
      }
    />
  );
};

export default AccessGatePage;

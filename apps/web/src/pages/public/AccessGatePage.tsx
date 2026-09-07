import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { ErrorCode } from '@foka-vote/shared';
import { errorMessage } from '../../lib/errorMessage';
import { ApiError } from '../../services/apiClient';
import { verifyContestAccessCode } from '../../services/contests';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Label from '../../components/ui/Label';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';

const AccessGatePage = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTarget = searchParams.get('redirect') ?? `/contest/${slug}`;

  const submit = async () => {
    if (!slug) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await verifyContestAccessCode(slug, code);
      void navigate(redirectTarget, { state: location.state as unknown, replace: true });
    } catch (err) {
      // The gate's only expected failure is a wrong code; UNAUTHORIZED is also used
      // for unrelated auth cases elsewhere, so it can't be shown via the generic mapping here.
      if (err instanceof ApiError && err.code === ErrorCode.UNAUTHORIZED) {
        setError(t('pages.accessGate.invalidCode'));
      } else {
        setError(errorMessage(err, t));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <i className="bi bi-lock text-2xl text-indigo-600" aria-hidden="true" />
            <h1 className="text-lg font-semibold text-zinc-900">{t('pages.accessGate.title')}</h1>
          </div>

          <div>
            <Label htmlFor="code">{t('pages.accessGate.codeLabel')}</Label>
            <Input
              id="code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {t('pages.accessGate.submit')}
          </Button>

          {error && <Alert variant="error">{error}</Alert>}
        </form>
      </Card>
    </div>
  );
};

export default AccessGatePage;

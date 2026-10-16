import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorCode } from '@foka-vote/shared';
import { errorMessage } from '../lib/errorMessage';
import { ApiError } from '../services/apiClient';
import Alert from './ui/Alert';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';
import Label from './ui/Label';

interface AccessCodeFormProps {
  title: string;
  codeLabel: string;
  submitLabel: string;
  invalidCodeMessage: string;
  verify: (code: string) => Promise<void>;
  onVerified: () => void;
}

const AccessCodeForm = ({
  title,
  codeLabel,
  submitLabel,
  invalidCodeMessage,
  verify,
  onVerified,
}: AccessCodeFormProps) => {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await verify(code);
      onVerified();
    } catch (err) {
      // The gate's only expected failure is a wrong code; UNAUTHORIZED is also used
      // for unrelated auth cases elsewhere, so it can't be shown via the generic mapping here.
      if (err instanceof ApiError && err.code === ErrorCode.UNAUTHORIZED) {
        setError(invalidCodeMessage);
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
            <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
          </div>

          <div>
            <Label htmlFor="code">{codeLabel}</Label>
            <Input
              id="code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitLabel}
          </Button>

          {error && <Alert variant="error">{error}</Alert>}
        </form>
      </Card>
    </div>
  );
};

export default AccessCodeForm;

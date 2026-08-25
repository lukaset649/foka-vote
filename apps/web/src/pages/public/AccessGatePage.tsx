import { useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { verifyContestAccessCode } from '../../services/contests';

const AccessGatePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

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
      void navigate(redirectTarget);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify access code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Access code required</h1>

      <label htmlFor="code">Access code</label>
      <input id="code" value={code} onChange={(event) => setCode(event.target.value)} required />

      <button type="submit" disabled={submitting}>
        Enter
      </button>

      {error && <p role="alert">{error}</p>}
    </form>
  );
};

export default AccessGatePage;

import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import type { ContestDto } from '@foka-vote/shared';
import { fetchContest, verifyContestAccessCode } from '../../services/contests';
import Card from '../../components/ui/Card';
import { ContestStatusBadge } from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

const ContestPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contest, setContest] = useState<ContestDto | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) {
      return;
    }
    let cancelled = false;

    fetchContest(slug)
      .then((data) => {
        if (!cancelled) {
          setContest(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const code = searchParams.get('kod');
    if (!slug || !code || !contest) {
      return;
    }

    const stripCodeParam = () => setSearchParams({}, { replace: true });

    if (!contest.hasAccessCode) {
      stripCodeParam();
      return;
    }

    verifyContestAccessCode(slug, code)
      .catch(() => undefined)
      .finally(stripCodeParam);
  }, [slug, contest, searchParams, setSearchParams]);

  if (error) {
    return <Alert variant="error">Failed to load contest</Alert>;
  }

  if (!contest) {
    return <Spinner />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            {contest.title}
          </h1>
          <ContestStatusBadge status={contest.status} />
        </div>
        {contest.description && <p className="text-zinc-600">{contest.description}</p>}
      </div>

      <Card>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Submissions
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">
              {formatDate(contest.submissionStart)} – {formatDate(contest.submissionDeadline)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Voting</dt>
            <dd className="mt-1 text-sm text-zinc-900">
              {formatDate(contest.votingStart)} – {formatDate(contest.votingEnd)}
            </dd>
          </div>
        </dl>
      </Card>

      {contest.hasAccessCode && (
        <Link to={`/contest/${contest.slug}/gate`} className="inline-flex w-fit">
          <Button variant="secondary" size="sm">
            <i className="bi bi-lock" aria-hidden="true" />
            Enter access code
          </Button>
        </Link>
      )}

      <nav className="flex flex-wrap gap-3">
        <Link to={`/contest/${contest.slug}/gallery`} className="inline-flex">
          <Button variant="secondary">
            <i className="bi bi-images" aria-hidden="true" />
            Gallery
          </Button>
        </Link>
        {contest.status === 'SUBMISSIONS' && (
          <Link to={`/contest/${contest.slug}/submit`} className="inline-flex">
            <Button variant="primary">
              <i className="bi bi-send" aria-hidden="true" />
              Submit your work
            </Button>
          </Link>
        )}
        {contest.status === 'VOTING' && (
          <Link to={`/contest/${contest.slug}/vote`} className="inline-flex">
            <Button variant="primary">
              <i className="bi bi-check2-square" aria-hidden="true" />
              Vote
            </Button>
          </Link>
        )}
        <Link to={`/contest/${contest.slug}/results`} className="inline-flex">
          <Button variant="secondary">
            <i className="bi bi-trophy" aria-hidden="true" />
            Results
          </Button>
        </Link>
      </nav>
    </div>
  );
};

export default ContestPage;

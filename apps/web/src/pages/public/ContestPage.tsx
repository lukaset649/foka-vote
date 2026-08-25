import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import type { ContestDto } from '@foka-vote/shared';
import { fetchContest, verifyContestAccessCode } from '../../services/contests';

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
    return <p role="alert">Failed to load contest</p>;
  }

  if (!contest) {
    return <p>Loading…</p>;
  }

  return (
    <div>
      <h1>{contest.title}</h1>
      <p>Status: {contest.status}</p>
      {contest.description && <p>{contest.description}</p>}
      <dl>
        <dt>Submissions</dt>
        <dd>
          {formatDate(contest.submissionStart)} – {formatDate(contest.submissionDeadline)}
        </dd>
        <dt>Voting</dt>
        <dd>
          {formatDate(contest.votingStart)} – {formatDate(contest.votingEnd)}
        </dd>
      </dl>
      {contest.hasAccessCode && (
        <p>
          <Link to={`/contest/${contest.slug}/gate`}>Enter access code</Link>
        </p>
      )}
    </div>
  );
};

export default ContestPage;

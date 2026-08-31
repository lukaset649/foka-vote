import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import type { ContestDto } from '@foka-vote/shared';
import { isUnauthorizedError } from '../../services/apiClient';
import { contestGatePath, fetchContest, verifyContestAccessCode } from '../../services/contests';
import Card from '../../components/ui/Card';
import { ContestStatusBadge } from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import Spinner from '../../components/ui/Spinner';
import LinkButton from '../../components/ui/LinkButton';
import PageHeader from '../../components/ui/PageHeader';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

const ContestPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contest, setContest] = useState<ContestDto | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) {
      return;
    }
    let cancelled = false;

    const load = async () => {
      const code = searchParams.get('kod');
      if (code) {
        await verifyContestAccessCode(slug, code).catch(() => undefined);
        setSearchParams({}, { replace: true });
      }

      try {
        const data = await fetchContest(slug);
        if (!cancelled) {
          setContest(data);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (isUnauthorizedError(err)) {
          void navigate(contestGatePath(slug, `/contest/${slug}`), { replace: true });
          return;
        }
        setError(true);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the slug changes, not on every searchParams update
  }, [slug]);

  if (error) {
    return <Alert variant="error">Failed to load contest</Alert>;
  }

  if (!contest) {
    return <Spinner />;
  }

  return (
    <div>
      <PageHeader title={contest.title} backTo="/" backLabel="Back to contests">
        <ContestStatusBadge status={contest.status} />
      </PageHeader>

      <div className="flex flex-col gap-6">
        {contest.description && <p className="text-zinc-600">{contest.description}</p>}

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
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Voting
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {formatDate(contest.votingStart)} – {formatDate(contest.votingEnd)}
              </dd>
            </div>
          </dl>
        </Card>

        <nav className="flex flex-wrap gap-3">
          <LinkButton to={`/contest/${contest.slug}/gallery`} variant="secondary">
            <i className="bi bi-images" aria-hidden="true" />
            Gallery
          </LinkButton>
          {contest.status === 'SUBMISSIONS' && (
            <LinkButton to={`/contest/${contest.slug}/submit`} variant="primary">
              <i className="bi bi-send" aria-hidden="true" />
              Submit your work
            </LinkButton>
          )}
          {contest.status === 'VOTING' && (
            <LinkButton to={`/contest/${contest.slug}/vote`} variant="primary">
              <i className="bi bi-check2-square" aria-hidden="true" />
              Vote
            </LinkButton>
          )}
          <LinkButton to={`/contest/${contest.slug}/results`} variant="secondary">
            <i className="bi bi-trophy" aria-hidden="true" />
            Results
          </LinkButton>
        </nav>
      </div>
    </div>
  );
};

export default ContestPage;

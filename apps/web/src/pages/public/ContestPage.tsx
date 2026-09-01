import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import type { ContestDto } from '@foka-vote/shared';
import { isUnauthorizedError } from '../../services/apiClient';
import { contestGatePath, fetchContest, verifyContestAccessCode } from '../../services/contests';
import ContestGalleryCard from '../../components/ContestGalleryCard';
import ContestPhaseCard from '../../components/ContestPhaseCard';
import ContestResultsCard from '../../components/ContestResultsCard';
import { ContestStatusBadge } from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import Spinner from '../../components/ui/Spinner';
import LinkButton from '../../components/ui/LinkButton';
import PageHeader from '../../components/ui/PageHeader';

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
        <div className="flex flex-wrap items-center gap-5">
          <ContestStatusBadge status={contest.status} />
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
        </div>
      </PageHeader>

      <div className="flex flex-col gap-6">
        {contest.description && <p className="text-zinc-600">{contest.description}</p>}

        <ContestPhaseCard contest={contest} />
        <ContestResultsCard contest={contest} />
        <ContestGalleryCard contest={contest} />
      </div>
    </div>
  );
};

export default ContestPage;

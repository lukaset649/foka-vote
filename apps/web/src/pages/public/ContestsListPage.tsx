import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { ContestDto } from '@foka-vote/shared';
import { fetchContests } from '../../services/contests';
import Card from '../../components/ui/Card';
import { ContestStatusBadge } from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';

function isCurrent(contest: ContestDto): boolean {
  return contest.status === 'SUBMISSIONS' || contest.status === 'VOTING';
}

const ContestListItem = ({ contest }: { contest: ContestDto }) => (
  <li>
    <Link to={`/contest/${contest.slug}`}>
      <Card className="flex items-center justify-between gap-3 transition-colors hover:border-indigo-300">
        <span className="font-medium text-zinc-900">{contest.title}</span>
        <ContestStatusBadge status={contest.status} />
      </Card>
    </Link>
  </li>
);

const ContestsListPage = () => {
  const [contests, setContests] = useState<ContestDto[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchContests()
      .then((data) => {
        if (!cancelled) {
          setContests(data);
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
  }, []);

  if (error) {
    return <Alert variant="error">Failed to load contests</Alert>;
  }

  if (contests === null) {
    return <Spinner />;
  }

  if (contests.length === 0) {
    return <EmptyState icon="bi-images" text="No contests yet" />;
  }

  const current = contests.filter(isCurrent);
  const rest = contests.filter((contest) => !isCurrent(contest));

  return (
    <div>
      {current.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Current
          </h2>
          <ul className="mb-6 flex flex-col gap-3">
            {current.map((contest) => (
              <ContestListItem key={contest.id} contest={contest} />
            ))}
          </ul>
        </section>
      )}
      <section>
        {current.length > 0 && (
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            All contests
          </h2>
        )}
        {rest.length === 0 && current.length === 0 ? (
          <EmptyState icon="bi-images" text="No contests yet" />
        ) : (
          <ul className="flex flex-col gap-3">
            {rest.map((contest) => (
              <ContestListItem key={contest.id} contest={contest} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ContestsListPage;

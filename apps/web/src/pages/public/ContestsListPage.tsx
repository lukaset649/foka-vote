import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { ContestDto } from '@foka-vote/shared';
import { fetchContests } from '../../services/contests';

function isCurrent(contest: ContestDto): boolean {
  return contest.status === 'SUBMISSIONS' || contest.status === 'VOTING';
}

const ContestListItem = ({ contest }: { contest: ContestDto }) => (
  <li>
    <Link to={`/contest/${contest.slug}`}>{contest.title}</Link> ({contest.status})
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
    return <p role="alert">Failed to load contests</p>;
  }

  if (contests === null) {
    return <p>Loading…</p>;
  }

  if (contests.length === 0) {
    return <p>No contests yet</p>;
  }

  const current = contests.filter(isCurrent);
  const rest = contests.filter((contest) => !isCurrent(contest));

  return (
    <div>
      {current.length > 0 && (
        <section>
          <h2>Current</h2>
          <ul>
            {current.map((contest) => (
              <ContestListItem key={contest.id} contest={contest} />
            ))}
          </ul>
        </section>
      )}
      <section>
        {current.length > 0 && <h2>All contests</h2>}
        <ul>
          {rest.map((contest) => (
            <ContestListItem key={contest.id} contest={contest} />
          ))}
        </ul>
      </section>
    </div>
  );
};

export default ContestsListPage;

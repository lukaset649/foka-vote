import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { AdminContestDto } from '@foka-vote/shared';
import { fetchAdminContests } from '../../services/contests';

const AdminContestsListPage = () => {
  const [contests, setContests] = useState<AdminContestDto[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchAdminContests()
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

  return (
    <div>
      <p>
        <Link to="/admin/contests/new">New contest</Link>
      </p>
      {error && <p role="alert">Failed to load contests</p>}
      {!error && contests === null && <p>Loading…</p>}
      {contests !== null && contests.length === 0 && <p>No contests yet</p>}
      {contests !== null && contests.length > 0 && (
        <ul>
          {contests.map((contest) => (
            <li key={contest.id}>
              <Link to={`/admin/contests/${contest.id}`}>{contest.title}</Link> ({contest.slug},{' '}
              {contest.status})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminContestsListPage;

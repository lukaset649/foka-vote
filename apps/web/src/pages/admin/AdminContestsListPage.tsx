import { useEffect, useState } from 'react';
import type { AdminContestDto } from '@foka-vote/shared';
import { fetchAdminContests } from '../../services/contests';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import { ContestStatusBadge } from '../../components/ui/Badge';
import LinkButton from '../../components/ui/LinkButton';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';

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
      <PageHeader title="Contests">
        <LinkButton to="/admin/contests/new" variant="primary" size="sm">
          <i className="bi bi-plus-circle" aria-hidden="true" />
          New contest
        </LinkButton>
      </PageHeader>

      {error && <Alert variant="error">Failed to load contests</Alert>}
      {!error && contests === null && <Spinner />}
      {contests !== null && contests.length === 0 && (
        <EmptyState icon="bi-images" text="No contests yet" />
      )}
      {contests !== null && contests.length > 0 && (
        <ul className="flex flex-col gap-3">
          {contests.map((contest) => (
            <li key={contest.id}>
              <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-zinc-900">{contest.title}</span>
                    <ContestStatusBadge status={contest.status} />
                  </div>
                  <p className="text-sm text-zinc-500">{contest.slug}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <LinkButton
                    to={`/admin/contests/${contest.id}/submissions`}
                    variant="secondary"
                    size="sm"
                  >
                    <i className="bi bi-ticket-perforated" aria-hidden="true" />
                    Submissions &amp; vote cards
                  </LinkButton>
                  <LinkButton to={`/admin/contests/${contest.id}`} variant="ghost" size="sm">
                    <i className="bi bi-pencil-square" aria-hidden="true" />
                    Edit
                  </LinkButton>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminContestsListPage;

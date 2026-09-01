import { useEffect, useState } from 'react';
import type { AdminContestDto } from '@foka-vote/shared';
import { deleteContest, fetchAdminContests } from '../../services/contests';
import ContestPhaseActions from '../../components/ContestPhaseActions';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import { ContestStatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LinkButton from '../../components/ui/LinkButton';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';

const AdminContestsListPage = () => {
  const [contests, setContests] = useState<AdminContestDto[] | null>(null);
  const [error, setError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDelete = (contest: AdminContestDto) => {
    if (
      !window.confirm(
        `Delete "${contest.title}"? This permanently removes all its submissions, artworks and votes.`,
      )
    ) {
      return;
    }

    setDeletingId(contest.id);
    deleteContest(contest.id)
      .then(() => {
        setContests((prev) => prev?.filter((c) => c.id !== contest.id) ?? prev);
      })
      .catch(() => {
        window.alert('Failed to delete the contest');
      })
      .finally(() => {
        setDeletingId(null);
      });
  };

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
              <Card className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-zinc-900">{contest.title}</span>
                    <ContestStatusBadge status={contest.status} />
                  </div>
                  <p className="text-sm text-zinc-500">{contest.slug}</p>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <ContestPhaseActions
                    contest={contest}
                    onUpdated={(updated) =>
                      setContests(
                        (prev) => prev?.map((c) => (c.id === updated.id ? updated : c)) ?? prev,
                      )
                    }
                  />
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
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(contest)}
                    disabled={deletingId === contest.id}
                  >
                    <i className="bi bi-trash" aria-hidden="true" />
                    Delete
                  </Button>
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

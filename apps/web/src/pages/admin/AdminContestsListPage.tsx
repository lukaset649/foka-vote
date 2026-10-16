import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import useConfirm from '../../lib/useConfirm';

const AdminContestsListPage = () => {
  const { t } = useTranslation();
  const { confirm, confirmDialog } = useConfirm();
  const [contests, setContests] = useState<AdminContestDto[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
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
          setLoadError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (contest: AdminContestDto) => {
    const confirmed = await confirm({
      message: t('pages.adminContestsList.confirmDelete', { title: contest.title }),
      confirmLabel: t('common.remove'),
      confirmVariant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    setDeletingId(contest.id);
    setActionError(null);
    deleteContest(contest.id)
      .then(() => {
        setContests((prev) => prev?.filter((c) => c.id !== contest.id) ?? prev);
      })
      .catch(() => {
        setActionError(t('pages.adminContestsList.deleteFailed'));
      })
      .finally(() => {
        setDeletingId(null);
      });
  };

  return (
    <div>
      <PageHeader title={t('pages.adminContestsList.title')} />

      {loadError && <Alert variant="error">{t('pages.contestsList.failedToLoad')}</Alert>}
      {actionError && (
        <Alert variant="error" className="mb-3">
          {actionError}
        </Alert>
      )}
      {!loadError && contests === null && <Spinner />}
      {contests !== null && contests.length === 0 && (
        <EmptyState icon="bi-images" text={t('pages.contestsList.noContestsYet')} />
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
                    onUpdated={(updated) => {
                      setActionError(null);
                      setContests(
                        (prev) => prev?.map((c) => (c.id === updated.id ? updated : c)) ?? prev,
                      );
                    }}
                    onError={setActionError}
                  />
                  <LinkButton
                    to={`/admin/contests/${contest.id}/submissions`}
                    variant="secondary"
                    size="sm"
                  >
                    <i className="bi bi-ticket-perforated" aria-hidden="true" />
                    {t('pages.adminContestsList.submissionsAndVoteCards')}
                  </LinkButton>
                  <LinkButton
                    to={`/admin/contests/${contest.id}`}
                    variant="primary"
                    size="sm"
                    className="sm:w-28"
                  >
                    <i className="bi bi-pencil-square" aria-hidden="true" />
                    {t('pages.submissionPreview.edit')}
                  </LinkButton>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => void handleDelete(contest)}
                    disabled={deletingId === contest.id}
                    className="sm:w-28"
                  >
                    <i className="bi bi-trash" aria-hidden="true" />
                    {t('common.remove')}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {confirmDialog}
    </div>
  );
};

export default AdminContestsListPage;

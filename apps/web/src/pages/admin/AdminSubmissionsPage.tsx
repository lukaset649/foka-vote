import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import type { AdminSubmissionDto, VoteCardDto } from '@foka-vote/shared';
import { deleteAdminSubmission, fetchAdminSubmissions } from '../../services/submissions';
import { fetchAdminVoteCards, unvoidVoteCard, voidVoteCard } from '../../services/votes';
import PageHeader from '../../components/ui/PageHeader';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LinkButton from '../../components/ui/LinkButton';
import EmptyState from '../../components/ui/EmptyState';
import Table, {
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../components/ui/Table';

type Tab = 'submissions' | 'voteCards';

const AdminSubmissionsPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const contestId = id as string;

  const [submissions, setSubmissions] = useState<AdminSubmissionDto[] | null>(null);
  const [voteCards, setVoteCards] = useState<VoteCardDto[] | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>('submissions');

  const loadSubmissions = () => {
    fetchAdminSubmissions(contestId)
      .then(setSubmissions)
      .catch(() => setError(true));
  };

  const loadVoteCards = () => {
    fetchAdminVoteCards(contestId)
      .then(setVoteCards)
      .catch(() => setError(true));
  };

  useEffect(() => {
    loadSubmissions();
    loadVoteCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- contestId is stable for the life of this page
  }, [contestId]);

  const handleDelete = (submissionId: string) => {
    if (!window.confirm(t('pages.adminSubmissions.confirmDeleteSubmission'))) {
      return;
    }
    deleteAdminSubmission(contestId, submissionId)
      .then(loadSubmissions)
      .catch(() => setError(true));
  };

  const handleVoid = (cardId: string) => {
    const reason = window.prompt(t('pages.adminSubmissions.voidReasonPrompt')) ?? undefined;
    voidVoteCard(contestId, cardId, reason)
      .then(loadVoteCards)
      .catch(() => setError(true));
  };

  const handleUnvoid = (cardId: string) => {
    unvoidVoteCard(contestId, cardId)
      .then(loadVoteCards)
      .catch(() => setError(true));
  };

  const aliasBySubmissionId = new Map(
    (submissions ?? []).map((submission) => [submission.id, submission.alias]),
  );
  const voidedCount = (voteCards ?? []).filter((card) => card.isVoid).length;

  return (
    <div>
      <PageHeader
        title={t('pages.adminContestsList.submissionsAndVoteCards')}
        backTo="/admin/contests"
        backLabel={t('common.backToContests')}
      />

      {error && <Alert variant="error">{t('errors.generic')}</Alert>}

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1 text-zinc-600">
          <i className="bi bi-person-badge" aria-hidden="true" />
          {submissions === null
            ? t('pages.adminSubmissions.loadingSubmissions')
            : t('pages.adminSubmissions.submissionsCount', { count: submissions.length })}
        </span>
        <span className="inline-flex items-center gap-1 text-zinc-600">
          <i className="bi bi-ticket-perforated" aria-hidden="true" />
          {voteCards === null
            ? t('pages.adminSubmissions.loadingVoteCards')
            : t('pages.adminSubmissions.voteCardsCount', { count: voteCards.length })}
        </span>
        {voidedCount > 0 && (
          <Badge color="rose">
            {t('pages.adminSubmissions.voidedCount', { count: voidedCount })}
          </Badge>
        )}
      </div>

      <nav className="mb-4 inline-flex w-fit rounded-md bg-zinc-100 p-1">
        <button
          type="button"
          onClick={() => setTab('submissions')}
          className={`min-h-8 rounded px-3 py-1 text-sm font-medium transition-colors ${tab === 'submissions' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
        >
          {t('pages.adminSubmissions.submissionsTab')}
        </button>
        <button
          type="button"
          onClick={() => setTab('voteCards')}
          className={`min-h-8 rounded px-3 py-1 text-sm font-medium transition-colors ${tab === 'voteCards' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
        >
          {t('pages.adminSubmissions.voteCardsTab')}
        </button>
      </nav>

      {tab === 'submissions' &&
        (submissions !== null && submissions.length === 0 ? (
          <EmptyState icon="bi-person-badge" text={t('pages.adminSubmissions.noSubmissionsYet')} />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t('pages.results.tableAuthor')}</TableHeaderCell>
                <TableHeaderCell>{t('pages.adminSubmissions.tableAlias')}</TableHeaderCell>
                <TableHeaderCell>{t('pages.adminSubmissions.tableArtworks')}</TableHeaderCell>
                <TableHeaderCell>{t('pages.adminSubmissions.tableSubmitted')}</TableHeaderCell>
                <TableHeaderCell></TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submissions === null && (
                <TableRow>
                  <TableCell colSpan={5}>
                    {t('pages.adminSubmissions.loadingSubmissions')}
                  </TableCell>
                </TableRow>
              )}
              {submissions?.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>
                    {submission.firstName} {submission.lastName}
                  </TableCell>
                  <TableCell>{submission.alias}</TableCell>
                  <TableCell>{submission.artworks.length}</TableCell>
                  <TableCell>{new Date(submission.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <LinkButton
                        to={`/admin/contests/${contestId}/submissions/${submission.id}`}
                        variant="ghost"
                        size="sm"
                      >
                        <i className="bi bi-pencil-square" aria-hidden="true" />
                        {t('pages.submissionPreview.edit')}
                      </LinkButton>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(submission.id)}>
                        <i className="bi bi-trash" aria-hidden="true" />
                        {t('common.remove')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ))}

      {tab === 'voteCards' &&
        (voteCards !== null && voteCards.length === 0 ? (
          <EmptyState
            icon="bi-ticket-perforated"
            text={t('pages.adminSubmissions.noVoteCardsYet')}
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t('pages.adminSubmissions.tableCastAt')}</TableHeaderCell>
                <TableHeaderCell>{t('pages.adminSubmissions.tablePicks')}</TableHeaderCell>
                <TableHeaderCell>{t('pages.adminSubmissions.tableStatus')}</TableHeaderCell>
                <TableHeaderCell></TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {voteCards === null && (
                <TableRow>
                  <TableCell colSpan={4}>{t('pages.adminSubmissions.loadingVoteCards')}</TableCell>
                </TableRow>
              )}
              {voteCards?.map((card) => (
                <TableRow key={card.id}>
                  <TableCell>{new Date(card.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    {[...card.items]
                      .sort((a, b) => b.points - a.points)
                      .map(
                        (item) =>
                          `${aliasBySubmissionId.get(item.submissionId) ?? item.submissionId} (${item.points} ${t('common.points')})`,
                      )
                      .join(', ')}
                  </TableCell>
                  <TableCell>
                    {card.isVoid ? (
                      <Badge color="rose">
                        {t('pages.adminSubmissions.voided')}
                        {card.voidReason ? ` (${card.voidReason})` : ''}
                      </Badge>
                    ) : (
                      <Badge color="emerald">{t('pages.adminSubmissions.valid')}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {card.isVoid ? (
                      <Button variant="ghost" size="sm" onClick={() => handleUnvoid(card.id)}>
                        <i className="bi bi-arrow-clockwise" aria-hidden="true" />
                        {t('pages.adminSubmissions.restore')}
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => handleVoid(card.id)}>
                        <i className="bi bi-ban" aria-hidden="true" />
                        {t('pages.adminSubmissions.void')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ))}
    </div>
  );
};

export default AdminSubmissionsPage;

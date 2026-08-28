import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { AdminSubmissionDto, VoteCardDto } from '@foka-vote/shared';
import { deleteAdminSubmission, fetchAdminSubmissions } from '../../services/submissions';
import { fetchAdminVoteCards, unvoidVoteCard, voidVoteCard } from '../../services/votes';

type Tab = 'submissions' | 'voteCards';

const AdminSubmissionsPage = () => {
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
    if (!window.confirm('Delete this submission and all its artworks?')) {
      return;
    }
    deleteAdminSubmission(contestId, submissionId)
      .then(loadSubmissions)
      .catch(() => setError(true));
  };

  const handleVoid = (cardId: string) => {
    const reason = window.prompt('Reason (optional)') ?? undefined;
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
      <h1>Submissions &amp; vote cards</h1>

      <p>
        <Link to="/admin/contests">Back to contests</Link>
      </p>

      {error && <p role="alert">Something went wrong</p>}

      <p>
        {submissions?.length ?? '…'} submissions · {voteCards?.length ?? '…'} vote cards (
        {voidedCount} voided)
      </p>

      <nav>
        <button
          type="button"
          disabled={tab === 'submissions'}
          onClick={() => setTab('submissions')}
        >
          Submissions
        </button>{' '}
        <button type="button" disabled={tab === 'voteCards'} onClick={() => setTab('voteCards')}>
          Vote cards
        </button>
      </nav>

      {tab === 'submissions' && (
        <table>
          <thead>
            <tr>
              <th>Author</th>
              <th>Alias</th>
              <th>Artworks</th>
              <th>Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {submissions === null && (
              <tr>
                <td colSpan={5}>Loading…</td>
              </tr>
            )}
            {submissions !== null && submissions.length === 0 && (
              <tr>
                <td colSpan={5}>No submissions yet</td>
              </tr>
            )}
            {submissions?.map((submission) => (
              <tr key={submission.id}>
                <td>
                  {submission.firstName} {submission.lastName}
                </td>
                <td>{submission.alias}</td>
                <td>{submission.artworks.length}</td>
                <td>{new Date(submission.createdAt).toLocaleString()}</td>
                <td>
                  <Link to={`/admin/contests/${contestId}/submissions/${submission.id}`}>edit</Link>{' '}
                  <button type="button" onClick={() => handleDelete(submission.id)}>
                    delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'voteCards' && (
        <table>
          <thead>
            <tr>
              <th>Cast at</th>
              <th>Picks</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {voteCards === null && (
              <tr>
                <td colSpan={4}>Loading…</td>
              </tr>
            )}
            {voteCards !== null && voteCards.length === 0 && (
              <tr>
                <td colSpan={4}>No vote cards yet</td>
              </tr>
            )}
            {voteCards?.map((card) => (
              <tr key={card.id}>
                <td>{new Date(card.createdAt).toLocaleString()}</td>
                <td>
                  {[...card.items]
                    .sort((a, b) => b.points - a.points)
                    .map(
                      (item) =>
                        `${aliasBySubmissionId.get(item.submissionId) ?? item.submissionId} (${item.points} pkt)`,
                    )
                    .join(', ')}
                </td>
                <td>
                  {card.isVoid
                    ? `voided${card.voidReason ? ` (${card.voidReason})` : ''}`
                    : 'valid'}
                </td>
                <td>
                  {card.isVoid ? (
                    <button type="button" onClick={() => handleUnvoid(card.id)}>
                      restore
                    </button>
                  ) : (
                    <button type="button" onClick={() => handleVoid(card.id)}>
                      void
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminSubmissionsPage;

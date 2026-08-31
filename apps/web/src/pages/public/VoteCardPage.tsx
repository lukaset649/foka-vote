import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ErrorCode, MAX_VOTE_SLOTS, VOTE_WEIGHTS } from '@foka-vote/shared';
import type { ContestDto, SubmissionDto, VoteCardDto, VoteCardPick } from '@foka-vote/shared';
import { ApiError, mediaUrl } from '../../services/apiClient';
import { fetchContest } from '../../services/contests';
import { fetchSubmissions } from '../../services/submissions';
import { fetchMyVoteCard, submitVoteCard } from '../../services/votes';
import type { VoteConfirmationState } from './VoteConfirmationPage';
import { cn } from '../../lib/cn';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

const VoteCardPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [contest, setContest] = useState<ContestDto | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionDto[] | null>(null);
  const [existingCard, setExistingCard] = useState<VoteCardDto | null | undefined>(undefined);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      return;
    }
    let cancelled = false;

    Promise.all([fetchContest(slug), fetchSubmissions(slug), fetchMyVoteCard(slug)])
      .then(([contestData, submissionsData, cardData]) => {
        if (cancelled) {
          return;
        }
        setContest(contestData);
        setSubmissions(submissionsData);
        setExistingCard(cardData);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return <Alert variant="error">Failed to load voting card</Alert>;
  }

  if (!contest || submissions === null || existingCard === undefined) {
    return <Spinner />;
  }

  const slots = Math.min(MAX_VOTE_SLOTS, submissions.length);
  const activeWeights = VOTE_WEIGHTS.slice(0, slots);
  const readOnly = existingCard !== null;
  const currentPicks: Record<string, number> = readOnly
    ? Object.fromEntries(existingCard.items.map((item) => [item.submissionId, item.points]))
    : picks;

  const submissionById = new Map(submissions.map((submission) => [submission.id, submission]));

  const togglePick = (submissionId: string) => {
    if (readOnly) {
      return;
    }
    setPicks((prev) => {
      if (submissionId in prev) {
        const next = { ...prev };
        delete next[submissionId];
        return next;
      }
      const usedWeights = new Set(Object.values(prev));
      const nextWeight = activeWeights.find((weight) => !usedWeights.has(weight));
      if (nextWeight === undefined) {
        return prev;
      }
      return { ...prev, [submissionId]: nextWeight };
    });
  };

  const complete = Object.keys(currentPicks).length === slots;

  const submit = async () => {
    if (!slug) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const submitPicks: VoteCardPick[] = Object.entries(picks).map(([submissionId, points]) => ({
      submissionId,
      points,
    }));

    try {
      const card = await submitVoteCard(slug, submitPicks);
      const state: VoteConfirmationState = { card, submissions };
      void navigate(`/contest/${slug}/vote/confirmation`, { state });
    } catch (err) {
      if (err instanceof ApiError && err.code === ErrorCode.UNAUTHORIZED) {
        const redirect = `/contest/${slug}/vote`;
        void navigate(`/contest/${slug}/gate?redirect=${encodeURIComponent(redirect)}`);
        return;
      }
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit vote');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    void submit();
  };

  return (
    <div>
      <PageHeader
        title={`Vote — ${contest.title}`}
        backTo={`/contest/${slug}`}
        backLabel="Back to the contest"
      />

      {slots === 0 && <Alert variant="info">Not enough submissions to vote on yet.</Alert>}

      {slots > 0 && (
        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Slots
            </h2>
            <ul className="flex flex-wrap gap-2">
              {activeWeights.map((weight) => {
                const submissionId = Object.keys(currentPicks).find(
                  (id) => currentPicks[id] === weight,
                );
                const submission = submissionId ? submissionById.get(submissionId) : undefined;
                return (
                  <li
                    key={weight}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-3 py-2 text-sm',
                      submission
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-500',
                    )}
                  >
                    <span className="font-semibold">{weight} pkt</span>
                    <span>{submission ? submission.alias : '—'}</span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">Submissions</h2>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {submissions.map((submission) => {
                const points = currentPicks[submission.id];
                const selected = points !== undefined;
                const firstArtwork = submission.artworks[0];
                return (
                  <li key={submission.id}>
                    <button
                      type="button"
                      onClick={() => togglePick(submission.id)}
                      disabled={readOnly}
                      className={cn(
                        'relative w-full overflow-hidden rounded-lg border-2 text-left transition-colors',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
                        selected
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-transparent bg-white shadow-sm hover:border-zinc-300',
                        readOnly && 'cursor-not-allowed',
                      )}
                    >
                      {firstArtwork && (
                        <img
                          src={mediaUrl(firstArtwork.thumbUrl)}
                          alt={submission.alias}
                          className="aspect-square w-full object-cover"
                        />
                      )}
                      {selected && (
                        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                          {points}
                        </span>
                      )}
                      <p className="px-2 py-2 text-sm font-medium text-zinc-900">
                        {submission.alias}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {!readOnly && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!complete || submitting}
              className="w-full sm:w-fit"
            >
              <i className="bi bi-check2-square" aria-hidden="true" />
              Submit
            </Button>
          )}
          {!readOnly && submitError && <Alert variant="error">{submitError}</Alert>}
          {readOnly && <Alert variant="info">You have already voted in this contest.</Alert>}
        </div>
      )}
    </div>
  );
};

export default VoteCardPage;

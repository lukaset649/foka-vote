import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { MAX_VOTE_SLOTS, VOTE_WEIGHTS } from '@foka-vote/shared';
import type { ContestDto, SubmissionDto, VoteCardDto, VoteCardPick } from '@foka-vote/shared';
import { mediaUrl } from '../../services/apiClient';
import { fetchContest } from '../../services/contests';
import { fetchSubmissions } from '../../services/submissions';
import { fetchMyVoteCard, submitVoteCard } from '../../services/votes';
import type { VoteConfirmationState } from './VoteConfirmationPage';

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
    return <p role="alert">Failed to load voting card</p>;
  }

  if (!contest || submissions === null || existingCard === undefined) {
    return <p>Loading…</p>;
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
      <h1>Vote — {contest.title}</h1>

      <p>
        <Link to={`/contest/${slug}`}>Back to the contest</Link>
      </p>

      {slots === 0 && <p>Not enough submissions to vote on yet.</p>}

      {slots > 0 && (
        <>
          <h2>Slots</h2>
          <ul>
            {activeWeights.map((weight) => {
              const submissionId = Object.keys(currentPicks).find(
                (id) => currentPicks[id] === weight,
              );
              const submission = submissionId ? submissionById.get(submissionId) : undefined;
              return (
                <li key={weight}>
                  {weight} pkt: {submission ? submission.alias : '—'}
                </li>
              );
            })}
          </ul>

          <h2>Submissions</h2>
          <ul>
            {submissions.map((submission) => {
              const points = currentPicks[submission.id];
              const firstArtwork = submission.artworks[0];
              return (
                <li key={submission.id}>
                  <button
                    type="button"
                    onClick={() => togglePick(submission.id)}
                    disabled={readOnly}
                  >
                    {firstArtwork && (
                      <img
                        src={mediaUrl(firstArtwork.thumbUrl)}
                        alt={submission.alias}
                        width={150}
                      />
                    )}
                    <p>
                      {submission.alias}
                      {points !== undefined ? ` (${points} pkt)` : ''}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          {!readOnly && (
            <button type="button" onClick={handleSubmit} disabled={!complete || submitting}>
              Submit
            </button>
          )}
          {!readOnly && submitError && <p role="alert">{submitError}</p>}
          {readOnly && <p>You have already voted in this contest.</p>}
        </>
      )}
    </div>
  );
};

export default VoteCardPage;

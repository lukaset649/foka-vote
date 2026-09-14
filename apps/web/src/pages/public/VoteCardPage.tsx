import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { ErrorCode, MAX_VOTE_SLOTS, VOTE_WEIGHTS } from '@foka-vote/shared';
import type { ContestDto, SubmissionDto, VoteCardDto, VoteCardPick } from '@foka-vote/shared';
import { errorMessage } from '../../lib/errorMessage';
import { ApiError, isUnauthorizedError, mediaUrl } from '../../services/apiClient';
import { contestGatePath, fetchContest } from '../../services/contests';
import { fetchSubmissions } from '../../services/submissions';
import { fetchMyVoteCard, submitVoteCard } from '../../services/votes';
import type { VoteConfirmationState } from './VoteConfirmationPage';
import { cn } from '../../lib/cn';
import PageHeader from '../../components/ui/PageHeader';
import ActionBar from '../../components/ui/ActionBar';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import ArtworkLightbox from '../../components/ArtworkLightbox';

const VoteCardPage = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [contest, setContest] = useState<ContestDto | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionDto[] | null>(null);
  const [existingCard, setExistingCard] = useState<VoteCardDto | null | undefined>(undefined);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [galleryFor, setGalleryFor] = useState<SubmissionDto | null>(null);

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
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        if (isUnauthorizedError(err)) {
          void navigate(contestGatePath(slug, `/contest/${slug}/vote`), { replace: true });
          return;
        }
        setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  if (error) {
    return <Alert variant="error">{t('pages.voteCard.failedToLoad')}</Alert>;
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
  const pickedWeights = new Set(Object.values(currentPicks));
  const showActionBar = slots > 0 && !readOnly;

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
      setSubmitError(errorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    void submit();
  };

  return (
    <div className={cn(showActionBar && 'pb-24')}>
      <PageHeader
        title={t('pages.voteCard.heading', { title: contest.title })}
        backTo={`/contest/${slug}`}
        backLabel={t('common.backToContest')}
      />

      {slots === 0 && <Alert variant="info">{t('pages.voteCard.notEnoughSubmissions')}</Alert>}

      {slots > 0 && (
        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {t('pages.voteCard.slots')}
            </h2>
            <ul className="flex flex-col gap-2">
              {activeWeights.map((weight) => {
                const submissionId = Object.keys(currentPicks).find(
                  (id) => currentPicks[id] === weight,
                );
                const submission = submissionId ? submissionById.get(submissionId) : undefined;
                return (
                  <li
                    key={weight}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${submission ? 'border-indigo-300 bg-indigo-50 text-indigo-900' : 'border-zinc-200 bg-zinc-50 text-zinc-500'}`}
                  >
                    <span className="font-semibold">
                      {weight} {t('common.points')}
                    </span>
                    <span>{submission ? submission.alias : '—'}</span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">
              {t('contestStatus.SUBMISSIONS')}
            </h2>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {submissions.map((submission) => {
                const points = currentPicks[submission.id];
                const selected = points !== undefined;
                const firstArtwork = submission.artworks[0];
                return (
                  <li key={submission.id}>
                    <div className="relative">
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

                      <button
                        type="button"
                        onClick={() => setGalleryFor(submission)}
                        aria-label={t('pages.voteCard.viewArtworksAriaLabel', {
                          alias: submission.alias,
                        })}
                        className="absolute left-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-lg text-white transition-colors hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        <i className="bi bi-images" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {readOnly && <Alert variant="info">{t('pages.voteCard.alreadyVoted')}</Alert>}
        </div>
      )}

      {showActionBar && (
        <ActionBar>
          {submitError && (
            <Alert variant="error" className="mb-3">
              {submitError}
            </Alert>
          )}
          <div className="flex items-center justify-between gap-3">
            <ul className="flex items-center gap-2">
              {activeWeights.map((weight) => (
                <li
                  key={weight}
                  aria-label={t('pages.voteCard.slotAriaLabel', {
                    weight,
                    state: pickedWeights.has(weight)
                      ? t('pages.voteCard.slotFilled')
                      : t('pages.voteCard.slotEmpty'),
                  })}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${pickedWeights.has(weight) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-zinc-300 bg-zinc-50 text-zinc-400'}`}
                >
                  {weight}
                </li>
              ))}
            </ul>
            <Button type="button" onClick={handleSubmit} disabled={!complete || submitting}>
              <i className="bi bi-check2-square" aria-hidden="true" />
              {t('common.submit')}
            </Button>
          </div>
        </ActionBar>
      )}

      {galleryFor && (
        <ArtworkLightbox
          artworks={galleryFor.artworks}
          startIndex={0}
          open
          onClose={() => setGalleryFor(null)}
          authorAlias={galleryFor.alias}
        />
      )}
    </div>
  );
};

export default VoteCardPage;

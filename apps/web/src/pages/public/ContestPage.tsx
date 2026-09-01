import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import type { ContestDto, ResultsDto, SubmissionDto } from '@foka-vote/shared';
import { isUnauthorizedError, mediaUrl } from '../../services/apiClient';
import { contestGatePath, fetchContest, verifyContestAccessCode } from '../../services/contests';
import { fetchResults } from '../../services/results';
import { fetchSubmissions } from '../../services/submissions';
import ArtworkLightbox from '../../components/ArtworkLightbox';
import Card from '../../components/ui/Card';
import { ContestStatusBadge } from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import Countdown from '../../components/ui/Countdown';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import LinkButton from '../../components/ui/LinkButton';
import PageHeader from '../../components/ui/PageHeader';

const RESULTS_PREVIEW_PLACES = 3;

// Mirrors the grid-cols breakpoints used by the gallery preview grid below.
// Kept to a small column count so preview tiles stay large.
const GALLERY_COLUMN_BREAKPOINTS: Array<{ minWidth: number; columns: number }> = [
  { minWidth: 1024, columns: 4 },
  { minWidth: 640, columns: 3 },
  { minWidth: 0, columns: 2 },
];

function galleryColumnsForWidth(width: number): number {
  return (
    GALLERY_COLUMN_BREAKPOINTS.find((breakpoint) => width >= breakpoint.minWidth)?.columns ?? 2
  );
}

function useGalleryPreviewCount(): number {
  const [columns, setColumns] = useState(() => galleryColumnsForWidth(window.innerWidth));

  useEffect(() => {
    const handleResize = () => setColumns(galleryColumnsForWidth(window.innerWidth));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Narrow (2-column) layouts get a second row so the preview isn't too sparse.
  const rows = columns <= 2 ? 2 : 1;
  return columns * rows;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

type ContestPhaseInfo =
  | { kind: 'single'; label: string; dateIso: string; countdownTargetIso: string | null }
  | {
      kind: 'range';
      title: string;
      icon: string;
      startIso: string;
      endIso: string;
      countdownTargetIso: string;
    };

function getContestPhaseInfo(contest: ContestDto): ContestPhaseInfo {
  switch (contest.status) {
    case 'DRAFT':
      return {
        kind: 'single',
        label: 'Submissions start',
        dateIso: contest.submissionStart,
        countdownTargetIso: contest.submissionStart,
      };
    case 'SUBMISSIONS':
      return {
        kind: 'range',
        title: 'Submissions',
        icon: 'bi-send',
        startIso: contest.submissionStart,
        endIso: contest.submissionDeadline,
        countdownTargetIso: contest.submissionDeadline,
      };
    case 'VOTING':
      return {
        kind: 'range',
        title: 'Voting',
        icon: 'bi-check2-square',
        startIso: contest.votingStart,
        endIso: contest.votingEnd,
        countdownTargetIso: contest.votingEnd,
      };
    case 'CLOSED':
      return {
        kind: 'single',
        label: 'Voting ended',
        dateIso: contest.votingEnd,
        countdownTargetIso: null,
      };
  }
}

const ContestPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contest, setContest] = useState<ContestDto | null>(null);
  const [error, setError] = useState(false);
  const [galleryPreview, setGalleryPreview] = useState<SubmissionDto[] | null>(null);
  const [results, setResults] = useState<ResultsDto | null>(null);
  const [lightboxSubmission, setLightboxSubmission] = useState<SubmissionDto | null>(null);
  const galleryPreviewCount = useGalleryPreviewCount();

  useEffect(() => {
    if (!slug) {
      return;
    }
    let cancelled = false;

    const load = async () => {
      const code = searchParams.get('kod');
      if (code) {
        await verifyContestAccessCode(slug, code).catch(() => undefined);
        setSearchParams({}, { replace: true });
      }

      try {
        const data = await fetchContest(slug);
        if (!cancelled) {
          setContest(data);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (isUnauthorizedError(err)) {
          void navigate(contestGatePath(slug, `/contest/${slug}`), { replace: true });
          return;
        }
        setError(true);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the slug changes, not on every searchParams update
  }, [slug]);

  useEffect(() => {
    if (!contest) {
      return;
    }
    let cancelled = false;

    fetchSubmissions(contest.slug)
      .then((data) => {
        if (!cancelled) {
          setGalleryPreview(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGalleryPreview([]);
        }
      });

    if (contest.status === 'VOTING' || contest.status === 'CLOSED') {
      fetchResults(contest.slug)
        .then((data) => {
          if (!cancelled) {
            setResults(data);
          }
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
    };
  }, [contest]);

  if (error) {
    return <Alert variant="error">Failed to load contest</Alert>;
  }

  if (!contest) {
    return <Spinner />;
  }

  const phase = getContestPhaseInfo(contest);
  const topResults = results?.results.filter((entry) => entry.place <= RESULTS_PREVIEW_PLACES);

  const galleryOverflow = galleryPreview !== null && galleryPreview.length > galleryPreviewCount;
  const galleryVisibleCount = galleryOverflow ? galleryPreviewCount - 1 : galleryPreviewCount;
  const galleryRemaining =
    galleryPreview !== null ? galleryPreview.length - galleryVisibleCount : 0;

  return (
    <div>
      <PageHeader title={contest.title} backTo="/" backLabel="Back to contests">
        <div className="flex flex-wrap items-center gap-5">
          <ContestStatusBadge status={contest.status} />
          {contest.status === 'SUBMISSIONS' && (
            <LinkButton to={`/contest/${contest.slug}/submit`} variant="primary">
              <i className="bi bi-send" aria-hidden="true" />
              Submit your work
            </LinkButton>
          )}
          {contest.status === 'VOTING' && (
            <LinkButton to={`/contest/${contest.slug}/vote`} variant="primary">
              <i className="bi bi-check2-square" aria-hidden="true" />
              Vote
            </LinkButton>
          )}
        </div>
      </PageHeader>

      <div className="flex flex-col gap-6">
        {contest.description && <p className="text-zinc-600">{contest.description}</p>}

        <Card>
          {phase.kind === 'single' ? (
            <>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {phase.label}
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">{formatDate(phase.dateIso)}</dd>
              {phase.countdownTargetIso && (
                <Countdown targetIso={phase.countdownTargetIso} className="mt-3" />
              )}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <i className={`bi ${phase.icon} text-indigo-600`} aria-hidden="true" />
                  {phase.title}
                </div>
                <Countdown targetIso={phase.countdownTargetIso} />
              </div>
              <dl className="mt-3 flex justify-center gap-12 text-center">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Starts
                  </dt>
                  <dd className="mt-1 text-sm text-zinc-900">{formatDate(phase.startIso)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Ends
                  </dt>
                  <dd className="mt-1 text-sm text-zinc-900">{formatDate(phase.endIso)}</dd>
                </div>
              </dl>
            </>
          )}
        </Card>

        {(contest.status === 'VOTING' || contest.status === 'CLOSED') && (
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-zinc-900">Results</h2>
              <LinkButton to={`/contest/${contest.slug}/results`} variant="secondary" size="sm">
                View results
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </LinkButton>
            </div>

            {topResults === undefined ? (
              <div className="mt-4">
                <Spinner />
              </div>
            ) : (
              <>
                {results && !results.final && (
                  <Alert variant="info" className="mt-4">
                    Voting is still in progress — these standings aren&apos;t final.
                  </Alert>
                )}
                <ol className="mt-4 flex flex-col gap-2">
                  {topResults.map((entry) => (
                    <li
                      key={entry.submissionId}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="flex items-center gap-2 font-medium text-zinc-900">
                        {entry.place === 1 && (
                          <i className="bi bi-trophy text-amber-500" aria-hidden="true" />
                        )}
                        {entry.place}. {entry.firstName} {entry.lastName} ({entry.alias})
                      </span>
                      <span className="font-semibold text-indigo-600">{entry.total} pkt</span>
                    </li>
                  ))}
                </ol>
                {results && results.results.length > topResults.length && (
                  <p className="mt-3 text-xs text-zinc-500">
                    Showing the top {topResults.length} of {results.results.length} results — see
                    the full standings on the results page.
                  </p>
                )}
              </>
            )}
          </Card>
        )}

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-900">Gallery</h2>
            <LinkButton to={`/contest/${contest.slug}/gallery`} variant="secondary" size="sm">
              View gallery
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </LinkButton>
          </div>

          {galleryPreview === null ? (
            <div className="mt-4">
              <Spinner />
            </div>
          ) : galleryPreview.length === 0 ? (
            <EmptyState icon="bi-images" text="No submissions yet" className="mt-4" />
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {galleryPreview.slice(0, galleryVisibleCount).map((submission) => (
                <li key={submission.id}>
                  <button
                    type="button"
                    onClick={() => setLightboxSubmission(submission)}
                    className="group block w-full cursor-pointer text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    {submission.artworks[0] && (
                      <img
                        src={mediaUrl(submission.artworks[0].thumbUrl)}
                        alt={submission.alias}
                        className="aspect-square w-full rounded-md object-cover transition-transform duration-200 group-hover:rotate-2 group-hover:scale-105"
                      />
                    )}
                    <p className="mt-1 truncate text-sm font-medium text-zinc-900">
                      {submission.alias}
                    </p>
                  </button>
                </li>
              ))}
              {galleryOverflow && (
                <li>
                  <Link
                    to={`/contest/${contest.slug}/gallery`}
                    className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-zinc-400 bg-zinc-200 text-lg font-semibold text-zinc-600 transition-colors hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    +{galleryRemaining}
                  </Link>
                </li>
              )}
            </ul>
          )}
        </Card>
      </div>

      {lightboxSubmission && (
        <ArtworkLightbox
          artworks={lightboxSubmission.artworks}
          startIndex={0}
          open
          onClose={() => setLightboxSubmission(null)}
          authorAlias={lightboxSubmission.alias}
        />
      )}
    </div>
  );
};

export default ContestPage;

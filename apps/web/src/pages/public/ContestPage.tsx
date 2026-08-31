import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import type { ContestDto, ResultsDto, SubmissionDto } from '@foka-vote/shared';
import { isUnauthorizedError, mediaUrl } from '../../services/apiClient';
import { contestGatePath, fetchContest, verifyContestAccessCode } from '../../services/contests';
import { fetchResults } from '../../services/results';
import { fetchSubmissions } from '../../services/submissions';
import Card from '../../components/ui/Card';
import { ContestStatusBadge } from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import LinkButton from '../../components/ui/LinkButton';
import PageHeader from '../../components/ui/PageHeader';

const GALLERY_PREVIEW_COUNT = 3;
const RESULTS_PREVIEW_PLACES = 3;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

const ContestPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contest, setContest] = useState<ContestDto | null>(null);
  const [error, setError] = useState(false);
  const [galleryPreview, setGalleryPreview] = useState<SubmissionDto[] | null>(null);
  const [results, setResults] = useState<ResultsDto | null>(null);

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

    if (contest.status === 'CLOSED') {
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

  const topResults = results?.results.filter((entry) => entry.place <= RESULTS_PREVIEW_PLACES);
  const hasActions = contest.status === 'SUBMISSIONS' || contest.status === 'VOTING';

  return (
    <div>
      <PageHeader title={contest.title} backTo="/" backLabel="Back to contests">
        <ContestStatusBadge status={contest.status} />
      </PageHeader>

      <div className="flex flex-col gap-6">
        {contest.description && <p className="text-zinc-600">{contest.description}</p>}

        <Card>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Submissions
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {formatDate(contest.submissionStart)} – {formatDate(contest.submissionDeadline)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Voting
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {formatDate(contest.votingStart)} – {formatDate(contest.votingEnd)}
              </dd>
            </div>
          </dl>
        </Card>

        {hasActions && (
          <nav className="flex flex-wrap gap-3">
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
          </nav>
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
            <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {galleryPreview.slice(0, GALLERY_PREVIEW_COUNT).map((submission) => (
                <li key={submission.id}>
                  {submission.artworks[0] && (
                    <img
                      src={mediaUrl(submission.artworks[0].thumbUrl)}
                      alt={submission.alias}
                      className="aspect-square w-full rounded-md object-cover"
                    />
                  )}
                  <p className="mt-1 truncate text-sm font-medium text-zinc-900">
                    {submission.alias}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-900">Results</h2>
            <LinkButton to={`/contest/${contest.slug}/results`} variant="secondary" size="sm">
              View results
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </LinkButton>
          </div>

          {contest.status !== 'CLOSED' ? (
            <p className="mt-4 text-sm text-zinc-500">
              Results will be available once voting closes, on {formatDate(contest.votingEnd)}.
            </p>
          ) : topResults === undefined ? (
            <div className="mt-4">
              <Spinner />
            </div>
          ) : (
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
          )}
        </Card>
      </div>
    </div>
  );
};

export default ContestPage;

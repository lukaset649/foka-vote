import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { ContestDto, PublicContestListDto } from '@foka-vote/shared';
import { fetchContests, isGalleryVisible } from '../../services/contests';
import { useListSearchParams } from '../../lib/useListSearchParams';
import ListToolbar from '../../components/ListToolbar';
import Card from '../../components/ui/Card';
import { ContestStatusBadge } from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import LinkButton from '../../components/ui/LinkButton';
import Pagination from '../../components/ui/Pagination';
import Spinner from '../../components/ui/Spinner';

const ContestListItem = ({ contest }: { contest: ContestDto }) => {
  const { t } = useTranslation();

  return (
    <li>
      <Card className="relative flex items-center justify-between gap-3 transition-colors hover:border-indigo-300">
        <Link
          to={`/contest/${contest.slug}`}
          className="absolute inset-0 z-0 rounded-lg"
          aria-hidden="true"
          tabIndex={-1}
        />
        <Link
          to={`/contest/${contest.slug}`}
          className="relative z-10 flex min-w-0 flex-1 items-center gap-3"
        >
          <span className="truncate font-medium text-zinc-900">{contest.title}</span>
          <ContestStatusBadge status={contest.status} />
        </Link>

        <div className="relative z-10 flex shrink-0 items-center gap-2">
          {isGalleryVisible(contest.status) && (
            <LinkButton
              to={`/contest/${contest.slug}/gallery`}
              variant="secondary"
              size="icon"
              className="shrink-0"
              aria-label={t('common.actions.gallery')}
              title={t('common.actions.gallery')}
            >
              <i className="bi bi-images" aria-hidden="true" />
            </LinkButton>
          )}
          {contest.status === 'SUBMISSIONS' && (
            <LinkButton
              to={`/contest/${contest.slug}/submit`}
              variant="primary"
              size="icon"
              className="shrink-0"
              aria-label={t('common.actions.submit')}
              title={t('common.actions.submit')}
            >
              <i className="bi bi-send" aria-hidden="true" />
            </LinkButton>
          )}
          {contest.status === 'VOTING' && (
            <LinkButton
              to={`/contest/${contest.slug}/vote`}
              variant="success"
              size="icon"
              className="shrink-0"
              aria-label={t('common.actions.vote')}
              title={t('common.actions.vote')}
            >
              <i className="bi bi-check2-square" aria-hidden="true" />
            </LinkButton>
          )}
          {contest.status === 'CLOSED' && (
            <LinkButton
              to={`/contest/${contest.slug}/results`}
              variant="warning"
              size="icon"
              className="shrink-0"
              aria-label={t('common.actions.results')}
              title={t('common.actions.results')}
            >
              <i className="bi bi-trophy" aria-hidden="true" />
            </LinkButton>
          )}
        </div>
      </Card>
    </li>
  );
};

const ContestsListPage = () => {
  const { t } = useTranslation();
  const { query, searchInput, setSearchInput, sortOption, setSortOption, setPage } =
    useListSearchParams();
  const [contests, setContests] = useState<PublicContestListDto | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchContests(query)
      .then((data) => {
        if (!cancelled) {
          setContests(data);
          setError(false);
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
  }, [query]);

  const totalPages = contests ? Math.ceil(contests.others.total / contests.others.pageSize) : 0;

  // A page left behind by a shrinking list (or typed into the URL) falls back to the last one.
  useEffect(() => {
    if (totalPages > 0 && query.page !== undefined && query.page > totalPages) {
      setPage(totalPages, true);
    }
  }, [totalPages, query.page, setPage]);

  if (error && contests === null) {
    return <Alert variant="error">{t('pages.contestsList.failedToLoad')}</Alert>;
  }

  if (contests === null) {
    return <Spinner />;
  }

  const { current, others } = contests;
  const isSearching = query.q !== undefined;
  const hasOthers = others.total > 0 || isSearching;

  if (current.length === 0 && !hasOthers) {
    return <EmptyState icon="bi-images" text={t('pages.contestsList.noContestsYet')} />;
  }

  return (
    <div>
      {error && (
        <Alert variant="error" className="mb-4">
          {t('pages.contestsList.failedToLoad')}
        </Alert>
      )}
      {current.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {t('pages.contestsList.current')}
          </h2>
          <ul className="mb-6 flex flex-col gap-3">
            {current.map((contest) => (
              <ContestListItem key={contest.id} contest={contest} />
            ))}
          </ul>
        </section>
      )}
      {hasOthers && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {t('pages.contestsList.allContests')}
          </h2>
          <ListToolbar
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            sortOption={sortOption}
            onSortOptionChange={setSortOption}
          />
          {others.items.length === 0 ? (
            <EmptyState
              icon="bi-search"
              text={t('pages.contestsList.noResults', { query: query.q ?? '' })}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {others.items.map((contest) => (
                <ContestListItem key={contest.id} contest={contest} />
              ))}
            </ul>
          )}
          <Pagination page={others.page} totalPages={totalPages} onPageChange={setPage} />
        </section>
      )}
    </div>
  );
};

export default ContestsListPage;

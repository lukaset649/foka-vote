import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useNavigate, useParams } from 'react-router';
import type { ContestDto, ResultEntryDto, ResultsDto } from '@foka-vote/shared';
import { isUnauthorizedError } from '../../services/apiClient';
import { contestGatePath, fetchContest } from '../../services/contests';
import { fetchResults } from '../../services/results';
import { cn } from '../../lib/cn';
import PageHeader from '../../components/ui/PageHeader';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import Table, {
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../components/ui/Table';

function formatBreakdown(entry: ResultEntryDto, t: TFunction): string {
  const parts: string[] = [];
  if (entry.votes3 > 0) {
    parts.push(t('pages.results.breakdownEntry', { count: entry.votes3, weight: 3 }));
  }
  if (entry.votes2 > 0) {
    parts.push(t('pages.results.breakdownEntry', { count: entry.votes2, weight: 2 }));
  }
  if (entry.votes1 > 0) {
    parts.push(t('pages.results.breakdownEntry', { count: entry.votes1, weight: 1 }));
  }
  return parts.join(', ');
}

const ResultsPage = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [contest, setContest] = useState<ContestDto | null>(null);
  const [results, setResults] = useState<ResultsDto | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) {
      return;
    }
    let cancelled = false;

    fetchContest(slug)
      .then((contestData) => {
        if (cancelled) {
          return;
        }
        setContest(contestData);
        if (contestData.status !== 'CLOSED') {
          return undefined;
        }
        return fetchResults(slug).then((resultsData) => {
          if (!cancelled) {
            setResults(resultsData);
          }
        });
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        if (isUnauthorizedError(err)) {
          void navigate(contestGatePath(slug, `/contest/${slug}/results`), { replace: true });
          return;
        }
        setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  if (error) {
    return <Alert variant="error">{t('pages.results.failedToLoad')}</Alert>;
  }

  if (!contest) {
    return <Spinner />;
  }

  if (contest.status !== 'CLOSED') {
    return (
      <div>
        <PageHeader
          title={t('pages.results.heading', { title: contest.title })}
          backTo={`/contest/${slug}`}
          backLabel={t('common.backToContest')}
        />
        <Alert variant="info">
          {contest.status === 'VOTING'
            ? t('pages.results.votingInProgress')
            : t('pages.results.availableFrom', {
                date: new Date(contest.votingStart).toLocaleString(),
              })}
        </Alert>
      </div>
    );
  }

  if (!results) {
    return <Spinner />;
  }

  return (
    <div>
      <PageHeader
        title={t('pages.results.heading', { title: contest.title })}
        backTo={`/contest/${slug}`}
        backLabel={t('common.backToContest')}
      >
        <span className="inline-flex items-center gap-2 text-sm text-zinc-500">
          <i className="bi bi-trophy text-amber-500" aria-hidden="true" />
          {t('pages.results.voteCardsCast', { count: results.voteCardCount })}
        </span>
      </PageHeader>

      {!results.final && (
        <Alert variant="info" className="mb-4">
          {t('pages.results.stillInProgress')}
        </Alert>
      )}

      {results.results.length === 0 ? (
        <EmptyState icon="bi-trophy" text={t('components.contestResultsCard.noVotesYet')} />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t('pages.results.tablePlace')}</TableHeaderCell>
              <TableHeaderCell>{t('pages.results.tableAuthor')}</TableHeaderCell>
              <TableHeaderCell>{t('pages.results.tablePoints')}</TableHeaderCell>
              <TableHeaderCell>{t('pages.results.tableBreakdown')}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.results.map((entry) => (
              <TableRow key={entry.submissionId} className={cn(entry.place === 1 && 'bg-amber-50')}>
                <TableCell className="font-semibold text-zinc-900">
                  {results.final && entry.place === 1 ? (
                    <span className="inline-flex items-center gap-1">
                      {entry.place}
                      <i className="bi bi-trophy text-amber-500" aria-hidden="true" />
                    </span>
                  ) : (
                    entry.place
                  )}
                </TableCell>
                <TableCell>
                  {entry.firstName
                    ? `${entry.firstName} ${entry.lastName} (${entry.alias})`
                    : entry.alias}
                </TableCell>
                <TableCell className="font-semibold text-indigo-600">
                  {entry.total} {t('common.points')}
                </TableCell>
                <TableCell className="text-zinc-500">{formatBreakdown(entry, t)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default ResultsPage;

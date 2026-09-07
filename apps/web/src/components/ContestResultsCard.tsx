import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ContestDto, ResultsDto } from '@foka-vote/shared';
import { fetchResults } from '../services/results';
import Card from './ui/Card';
import EmptyState from './ui/EmptyState';
import LinkButton from './ui/LinkButton';
import Spinner from './ui/Spinner';

const RESULTS_PREVIEW_PLACES = 3;

interface ContestResultsCardProps {
  contest: ContestDto;
}

const ContestResultsCard = ({ contest }: ContestResultsCardProps) => {
  const { t } = useTranslation();
  const [results, setResults] = useState<ResultsDto | null>(null);
  const showResults = contest.status === 'CLOSED';

  useEffect(() => {
    if (!showResults) {
      return;
    }
    let cancelled = false;

    fetchResults(contest.slug)
      .then((data) => {
        if (!cancelled) {
          setResults(data);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [contest.slug, showResults]);

  if (!showResults) {
    return null;
  }

  const topResults = results?.results.filter((entry) => entry.place <= RESULTS_PREVIEW_PLACES);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">{t('common.actions.results')}</h2>
        <LinkButton to={`/contest/${contest.slug}/results`} variant="secondary" size="sm">
          {t('components.contestResultsCard.viewResults')}
          <i className="bi bi-arrow-right" aria-hidden="true" />
        </LinkButton>
      </div>

      {topResults === undefined ? (
        <div className="mt-4">
          <Spinner />
        </div>
      ) : (
        <>
          {topResults.length === 0 ? (
            <EmptyState
              icon="bi-trophy"
              text={t('components.contestResultsCard.noVotesYet')}
              className="mt-4"
            />
          ) : (
            <>
              <ol className="mt-4 flex flex-col gap-2">
                {topResults.map((entry) => (
                  <li
                    key={entry.submissionId}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="flex items-center gap-2 font-medium text-zinc-900">
                      {entry.place}.
                      {results?.final && entry.place === 1 && (
                        <i className="bi bi-trophy text-amber-500" aria-hidden="true" />
                      )}{' '}
                      {entry.firstName
                        ? `${entry.firstName} ${entry.lastName} (${entry.alias})`
                        : entry.alias}
                    </span>
                    <span className="font-semibold text-indigo-600">
                      {entry.total} {t('components.contestResultsCard.points')}
                    </span>
                  </li>
                ))}
              </ol>
              {results && results.results.length > topResults.length && (
                <p className="mt-3 text-xs text-zinc-500">
                  {t('components.contestResultsCard.showingTopOf', {
                    shown: topResults.length,
                    total: results.results.length,
                  })}
                </p>
              )}
            </>
          )}
        </>
      )}
    </Card>
  );
};

export default ContestResultsCard;

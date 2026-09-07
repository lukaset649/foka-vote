import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { ContestDto } from '@foka-vote/shared';
import { fetchContests } from '../../services/contests';
import Card from '../../components/ui/Card';
import { ContestStatusBadge } from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import LinkButton from '../../components/ui/LinkButton';
import Spinner from '../../components/ui/Spinner';

function isCurrent(contest: ContestDto): boolean {
  return contest.status === 'SUBMISSIONS' || contest.status === 'VOTING';
}

const SQUARE_BUTTON_CLASSES = '!h-9 !w-9 shrink-0 !p-0 text-base';

const ContestListItem = ({ contest }: { contest: ContestDto }) => {
  const { t } = useTranslation();

  return (
    <li>
      <Card className="flex items-center justify-between gap-3 transition-colors hover:border-indigo-300">
        <Link to={`/contest/${contest.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
          <span className="truncate font-medium text-zinc-900">{contest.title}</span>
          <ContestStatusBadge status={contest.status} />
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <LinkButton
            to={`/contest/${contest.slug}/gallery`}
            variant="secondary"
            size="sm"
            className={SQUARE_BUTTON_CLASSES}
            aria-label={t('common.actions.gallery')}
            title={t('common.actions.gallery')}
          >
            <i className="bi bi-images" aria-hidden="true" />
          </LinkButton>
          {contest.status === 'SUBMISSIONS' && (
            <LinkButton
              to={`/contest/${contest.slug}/submit`}
              variant="primary"
              size="sm"
              className={SQUARE_BUTTON_CLASSES}
              aria-label={t('common.actions.submit')}
              title={t('common.actions.submit')}
            >
              <i className="bi bi-send" aria-hidden="true" />
            </LinkButton>
          )}
          {contest.status === 'VOTING' && (
            <LinkButton
              to={`/contest/${contest.slug}/vote`}
              variant="primary"
              size="sm"
              className={`${SQUARE_BUTTON_CLASSES} !border-green-800 !bg-green-800 hover:!bg-green-900`}
              aria-label={t('common.actions.vote')}
              title={t('common.actions.vote')}
            >
              <i className="bi bi-check2-square" aria-hidden="true" />
            </LinkButton>
          )}
          {contest.status === 'CLOSED' && (
            <LinkButton
              to={`/contest/${contest.slug}/results`}
              variant="secondary"
              size="sm"
              className={`${SQUARE_BUTTON_CLASSES} !border-amber-600 !bg-amber-600 !text-white hover:!bg-amber-700`}
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
  const [contests, setContests] = useState<ContestDto[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchContests()
      .then((data) => {
        if (!cancelled) {
          setContests(data);
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
  }, []);

  if (error) {
    return <Alert variant="error">{t('pages.contestsList.failedToLoad')}</Alert>;
  }

  if (contests === null) {
    return <Spinner />;
  }

  if (contests.length === 0) {
    return <EmptyState icon="bi-images" text={t('pages.contestsList.noContestsYet')} />;
  }

  const current = contests.filter(isCurrent);
  const rest = contests.filter((contest) => !isCurrent(contest));

  return (
    <div>
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
      <section>
        {current.length > 0 && (
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {t('pages.contestsList.allContests')}
          </h2>
        )}
        {rest.length === 0 && current.length === 0 ? (
          <EmptyState icon="bi-images" text={t('pages.contestsList.noContestsYet')} />
        ) : (
          <ul className="flex flex-col gap-3">
            {rest.map((contest) => (
              <ContestListItem key={contest.id} contest={contest} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ContestsListPage;

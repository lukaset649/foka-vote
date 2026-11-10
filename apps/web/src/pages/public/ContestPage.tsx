import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router';
import type { ContestDto } from '@foka-vote/shared';
import { fetchContest, isGalleryVisible, verifyContestAccessCode } from '../../services/contests';
import { loadErrorFrom, type LoadError } from '../../lib/loadError';
import ContestGalleryCard from '../../components/ContestGalleryCard';
import ContestPhaseCard from '../../components/ContestPhaseCard';
import ContestResultsCard from '../../components/ContestResultsCard';
import { ContestStatusBadge } from '../../components/ui/Badge';
import LoadErrorAlert from '../../components/LoadErrorAlert';
import Spinner from '../../components/ui/Spinner';
import LinkButton from '../../components/ui/LinkButton';
import PageHeader from '../../components/ui/PageHeader';

const ContestPage = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contest, setContest] = useState<ContestDto | null>(null);
  const [error, setError] = useState<LoadError | null>(null);

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
        if (!cancelled) {
          setError(loadErrorFrom(err));
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the slug changes, not on every searchParams update
  }, [slug]);

  if (error) {
    return <LoadErrorAlert error={error} message={t('pages.contest.failedToLoad')} />;
  }

  if (!contest) {
    return <Spinner />;
  }

  return (
    <div>
      <PageHeader title={contest.title} backTo="/" backLabel={t('common.backToContests')}>
        <div className="flex grow flex-wrap items-center justify-between gap-5">
          <ContestStatusBadge status={contest.status} />
          {contest.status === 'SUBMISSIONS' && (
            <LinkButton to={`/contest/${contest.slug}/submit`} variant="primary">
              <i className="bi bi-send" aria-hidden="true" />
              {t('common.actions.submit')}
            </LinkButton>
          )}
          {contest.status === 'VOTING' && (
            <LinkButton to={`/contest/${contest.slug}/vote`} variant="primary">
              <i className="bi bi-check2-square" aria-hidden="true" />
              {t('common.actions.vote')}
            </LinkButton>
          )}
        </div>
      </PageHeader>

      <div className="flex flex-col gap-6">
        {contest.description && <p className="text-zinc-600">{contest.description}</p>}

        <ContestPhaseCard contest={contest} />
        <ContestResultsCard contest={contest} />
        {isGalleryVisible(contest.status) && <ContestGalleryCard contest={contest} />}
      </div>
    </div>
  );
};

export default ContestPage;

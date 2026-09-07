import type { ContestDto } from '@foka-vote/shared';
import { useTranslation } from 'react-i18next';
import Card from './ui/Card';
import Countdown from './ui/Countdown';

type SingleLabelKey =
  | 'components.contestPhaseCard.submissionsStart'
  | 'components.contestPhaseCard.votingEnded';
type RangeTitleKey = 'contestStatus.SUBMISSIONS' | 'contestStatus.VOTING';

type ContestPhaseInfo =
  | { kind: 'single'; labelKey: SingleLabelKey; dateIso: string; countdownTargetIso: string | null }
  | {
      kind: 'range';
      titleKey: RangeTitleKey;
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
        labelKey: 'components.contestPhaseCard.submissionsStart',
        dateIso: contest.submissionStart,
        countdownTargetIso: contest.submissionStart,
      };
    case 'SUBMISSIONS':
      return {
        kind: 'range',
        titleKey: 'contestStatus.SUBMISSIONS',
        icon: 'bi-send',
        startIso: contest.submissionStart,
        endIso: contest.submissionDeadline,
        countdownTargetIso: contest.submissionDeadline,
      };
    case 'VOTING':
      return {
        kind: 'range',
        titleKey: 'contestStatus.VOTING',
        icon: 'bi-check2-square',
        startIso: contest.votingStart,
        endIso: contest.votingEnd,
        countdownTargetIso: contest.votingEnd,
      };
    case 'CLOSED':
      return {
        kind: 'single',
        labelKey: 'components.contestPhaseCard.votingEnded',
        dateIso: contest.votingEnd,
        countdownTargetIso: null,
      };
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

interface ContestPhaseCardProps {
  contest: ContestDto;
}

const ContestPhaseCard = ({ contest }: ContestPhaseCardProps) => {
  const { t } = useTranslation();
  const phase = getContestPhaseInfo(contest);

  return (
    <Card>
      {phase.kind === 'single' ? (
        <>
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t(phase.labelKey)}
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
              {t(phase.titleKey)}
            </div>
            <Countdown targetIso={phase.countdownTargetIso} />
          </div>
          <dl className="mt-3 flex justify-center gap-12 text-center">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t('components.contestPhaseCard.starts')}
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">{formatDate(phase.startIso)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t('components.contestPhaseCard.ends')}
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">{formatDate(phase.endIso)}</dd>
            </div>
          </dl>
        </>
      )}
    </Card>
  );
};

export default ContestPhaseCard;

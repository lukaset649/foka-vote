import type { ContestDto } from '@foka-vote/shared';
import Card from './ui/Card';
import Countdown from './ui/Countdown';

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

interface ContestPhaseCardProps {
  contest: ContestDto;
}

const ContestPhaseCard = ({ contest }: ContestPhaseCardProps) => {
  const phase = getContestPhaseInfo(contest);

  return (
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
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Ends</dt>
              <dd className="mt-1 text-sm text-zinc-900">{formatDate(phase.endIso)}</dd>
            </div>
          </dl>
        </>
      )}
    </Card>
  );
};

export default ContestPhaseCard;

import { useState } from 'react';
import type { AdminContestDto, UpdateContestDto } from '@foka-vote/shared';
import { updateContest } from '../services/contests';
import Button from './ui/Button';

const RESUME_GRACE_MS = 24 * 60 * 60 * 1000;
const MIN_VOTING_DURATION_MS = 60 * 60 * 1000;

interface PhaseAction {
  label: string;
  icon: string;
  confirmMessage: string;
  buildPayload: () => UpdateContestDto;
}

function buildResumeSubmissionsAction(contest: AdminContestDto): PhaseAction {
  // Preserve the contest's original voting-phase length, shifted to start after the new deadline.
  const votingDurationMs = Math.max(
    new Date(contest.votingEnd).getTime() - new Date(contest.votingStart).getTime(),
    MIN_VOTING_DURATION_MS,
  );

  return {
    label: 'Resume submissions (+24h)',
    icon: 'bi-arrow-counterclockwise',
    confirmMessage:
      'Reopen submissions for 24 more hours? Voting will be pushed back to start once that window ends.',
    buildPayload: () => {
      const submissionDeadline = new Date(Date.now() + RESUME_GRACE_MS);
      const votingStart = submissionDeadline;
      const votingEnd = new Date(votingStart.getTime() + votingDurationMs);
      return {
        submissionDeadline: submissionDeadline.toISOString(),
        votingStart: votingStart.toISOString(),
        votingEnd: votingEnd.toISOString(),
      };
    },
  };
}

function getPhaseActions(contest: AdminContestDto): PhaseAction[] {
  const now = () => new Date().toISOString();

  switch (contest.status) {
    case 'DRAFT':
      return [
        {
          label: 'Start submissions now',
          icon: 'bi-play-fill',
          confirmMessage: 'Start the submissions phase immediately?',
          buildPayload: () => ({ submissionStart: now() }),
        },
      ];
    case 'SUBMISSIONS':
      return [
        {
          label: 'End submissions & start voting now',
          icon: 'bi-skip-forward-fill',
          confirmMessage: 'End submissions and start voting immediately?',
          buildPayload: () => ({ submissionDeadline: now(), votingStart: now() }),
        },
      ];
    case 'VOTING':
      return [
        {
          label: 'End voting now',
          icon: 'bi-stop-fill',
          confirmMessage: 'End voting immediately? This closes the contest and reveals results.',
          buildPayload: () => ({ votingEnd: now() }),
        },
        buildResumeSubmissionsAction(contest),
      ];
    case 'CLOSED':
      return [
        {
          label: 'Resume voting (+24h)',
          icon: 'bi-arrow-clockwise',
          confirmMessage:
            'Reopen voting for 24 more hours? The contest will become active again and results will no longer be final until it closes.',
          buildPayload: () => ({
            votingEnd: new Date(Date.now() + RESUME_GRACE_MS).toISOString(),
          }),
        },
        buildResumeSubmissionsAction(contest),
      ];
  }
}

interface ContestPhaseActionsProps {
  contest: AdminContestDto;
  onUpdated: (contest: AdminContestDto) => void;
  className?: string;
}

const ContestPhaseActions = ({ contest, onUpdated, className }: ContestPhaseActionsProps) => {
  const [pendingAction, setPendingAction] = useState<PhaseAction | null>(null);
  const actions = getPhaseActions(contest);

  const handleClick = (action: PhaseAction) => {
    if (!window.confirm(action.confirmMessage)) {
      return;
    }

    setPendingAction(action);
    updateContest(contest.id, action.buildPayload())
      .then(onUpdated)
      .catch(() => {
        window.alert('Failed to update the contest phase');
      })
      .finally(() => {
        setPendingAction(null);
      });
  };

  return (
    <>
      {actions.map((action) => (
        <Button
          key={action.label}
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => handleClick(action)}
          disabled={pendingAction !== null}
          className={className}
        >
          <i className={`bi ${action.icon}`} aria-hidden="true" />
          {action.label}
        </Button>
      ))}
    </>
  );
};

export default ContestPhaseActions;

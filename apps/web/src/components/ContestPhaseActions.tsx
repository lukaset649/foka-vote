import { useState } from 'react';
import type { AdminContestDto, UpdateContestDto } from '@foka-vote/shared';
import { updateContest } from '../services/contests';
import Button from './ui/Button';

interface PhaseAction {
  label: string;
  icon: string;
  confirmMessage: string;
  buildPayload: () => UpdateContestDto;
}

function getPhaseAction(status: AdminContestDto['status']): PhaseAction | null {
  const now = () => new Date().toISOString();

  switch (status) {
    case 'DRAFT':
      return {
        label: 'Start submissions now',
        icon: 'bi-play-fill',
        confirmMessage: 'Start the submissions phase immediately?',
        buildPayload: () => ({ submissionStart: now() }),
      };
    case 'SUBMISSIONS':
      return {
        label: 'End submissions & start voting now',
        icon: 'bi-skip-forward-fill',
        confirmMessage: 'End submissions and start voting immediately?',
        buildPayload: () => ({ submissionDeadline: now(), votingStart: now() }),
      };
    case 'VOTING':
      return {
        label: 'End voting now',
        icon: 'bi-stop-fill',
        confirmMessage: 'End voting immediately? This closes the contest and reveals results.',
        buildPayload: () => ({ votingEnd: now() }),
      };
    case 'CLOSED':
      return null;
  }
}

interface ContestPhaseActionsProps {
  contest: AdminContestDto;
  onUpdated: (contest: AdminContestDto) => void;
  className?: string;
}

const ContestPhaseActions = ({ contest, onUpdated, className }: ContestPhaseActionsProps) => {
  const [submitting, setSubmitting] = useState(false);
  const action = getPhaseAction(contest.status);

  if (!action) {
    return null;
  }

  const handleClick = () => {
    if (!window.confirm(action.confirmMessage)) {
      return;
    }

    setSubmitting(true);
    updateContest(contest.id, action.buildPayload())
      .then(onUpdated)
      .catch(() => {
        window.alert('Failed to update the contest phase');
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleClick}
      disabled={submitting}
      className={className}
    >
      <i className={`bi ${action.icon}`} aria-hidden="true" />
      {action.label}
    </Button>
  );
};

export default ContestPhaseActions;

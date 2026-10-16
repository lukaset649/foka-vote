import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { AdminContestDto, UpdateContestDto } from '@foka-vote/shared';
import { updateContest } from '../services/contests';
import useConfirm from '../lib/useConfirm';
import Button from './ui/Button';

const RESUME_GRACE_MS = 24 * 60 * 60 * 1000;
const MIN_VOTING_DURATION_MS = 60 * 60 * 1000;

interface PhaseAction {
  label: string;
  icon: string;
  confirmMessage: string;
  buildPayload: () => UpdateContestDto;
}

function buildResumeSubmissionsAction(contest: AdminContestDto, t: TFunction): PhaseAction {
  // Preserve the contest's original voting-phase length, shifted to start after the new deadline.
  const votingDurationMs = Math.max(
    new Date(contest.votingEnd).getTime() - new Date(contest.votingStart).getTime(),
    MIN_VOTING_DURATION_MS,
  );

  return {
    label: t('components.contestPhaseActions.resumeSubmissionsLabel'),
    icon: 'bi-arrow-counterclockwise',
    confirmMessage: t('components.contestPhaseActions.resumeSubmissionsConfirm'),
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

function getPhaseActions(contest: AdminContestDto, t: TFunction): PhaseAction[] {
  const now = () => new Date().toISOString();

  switch (contest.status) {
    case 'DRAFT':
      return [
        {
          label: t('components.contestPhaseActions.startSubmissionsLabel'),
          icon: 'bi-play-fill',
          confirmMessage: t('components.contestPhaseActions.startSubmissionsConfirm'),
          buildPayload: () => ({ submissionStart: now() }),
        },
      ];
    case 'SUBMISSIONS':
      return [
        {
          label: t('components.contestPhaseActions.endSubmissionsStartVotingLabel'),
          icon: 'bi-skip-forward-fill',
          confirmMessage: t('components.contestPhaseActions.endSubmissionsStartVotingConfirm'),
          buildPayload: () => ({ submissionDeadline: now(), votingStart: now() }),
        },
      ];
    case 'VOTING':
      return [
        {
          label: t('components.contestPhaseActions.endVotingLabel'),
          icon: 'bi-stop-fill',
          confirmMessage: t('components.contestPhaseActions.endVotingConfirm'),
          buildPayload: () => ({ votingEnd: now() }),
        },
        buildResumeSubmissionsAction(contest, t),
      ];
    case 'CLOSED':
      return [
        {
          label: t('components.contestPhaseActions.resumeVotingLabel'),
          icon: 'bi-arrow-clockwise',
          confirmMessage: t('components.contestPhaseActions.resumeVotingConfirm'),
          buildPayload: () => ({
            votingEnd: new Date(Date.now() + RESUME_GRACE_MS).toISOString(),
          }),
        },
        buildResumeSubmissionsAction(contest, t),
      ];
  }
}

interface ContestPhaseActionsProps {
  contest: AdminContestDto;
  onUpdated: (contest: AdminContestDto) => void;
  onError: (message: string) => void;
  className?: string;
}

const ContestPhaseActions = ({
  contest,
  onUpdated,
  onError,
  className,
}: ContestPhaseActionsProps) => {
  const { t } = useTranslation();
  const { confirm, confirmDialog } = useConfirm();
  const [pendingAction, setPendingAction] = useState<PhaseAction | null>(null);
  const actions = getPhaseActions(contest, t);

  const handleClick = async (action: PhaseAction) => {
    const confirmed = await confirm({ message: action.confirmMessage });
    if (!confirmed) {
      return;
    }

    setPendingAction(action);
    updateContest(contest.id, action.buildPayload())
      .then(onUpdated)
      .catch(() => {
        onError(t('components.contestPhaseActions.updateFailed'));
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
          onClick={() => void handleClick(action)}
          disabled={pendingAction !== null}
          className={className}
        >
          <i className={`bi ${action.icon}`} aria-hidden="true" />
          {action.label}
        </Button>
      ))}

      {confirmDialog}
    </>
  );
};

export default ContestPhaseActions;

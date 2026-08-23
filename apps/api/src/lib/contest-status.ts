import type { ContestStatus } from '@foka-vote/shared';

export interface ContestDates {
  submissionStart: Date;
  submissionDeadline: Date;
  votingStart: Date;
  votingEnd: Date;
}

export function computeContestStatus(now: Date, dates: ContestDates): ContestStatus {
  if (now < dates.submissionStart) {
    return 'DRAFT';
  }
  if (now < dates.votingStart) {
    return 'SUBMISSIONS';
  }
  if (now < dates.votingEnd) {
    return 'VOTING';
  }
  return 'CLOSED';
}

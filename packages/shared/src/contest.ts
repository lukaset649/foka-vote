export type ContestStatus = 'DRAFT' | 'SUBMISSIONS' | 'VOTING' | 'CLOSED';

export interface ContestDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  submissionStart: string;
  submissionDeadline: string;
  votingStart: string;
  votingEnd: string;
  maxArtworksPerSubmission: number;
  status: ContestStatus;
  hasAccessCode: boolean;
  createdAt: string;
}

export interface AdminContestDto extends ContestDto {
  accessCode: string | null;
}

export interface CreateContestDto {
  title: string;
  slug?: string;
  description?: string;
  submissionStart: string;
  submissionDeadline: string;
  votingStart: string;
  votingEnd: string;
  maxArtworksPerSubmission?: number;
  accessCode?: string;
}

export type UpdateContestDto = Partial<CreateContestDto>;

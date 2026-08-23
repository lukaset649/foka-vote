export interface VoteCardPick {
  submissionId: string;
  points: number;
}

export interface VoteCardPayload {
  picks: VoteCardPick[];
}

export interface VoteCardDto {
  id: string;
  isVoid: boolean;
  voidReason: string | null;
  createdAt: string;
  items: VoteCardPick[];
}

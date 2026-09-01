export interface ResultEntryDto {
  submissionId: string;
  alias: string;
  firstName: string;
  lastName: string;
  total: number;
  place: number;
  votes3: number;
  votes2: number;
  votes1: number;
}

export interface ResultsDto {
  results: ResultEntryDto[];
  voteCardCount: number;
  final: boolean;
}

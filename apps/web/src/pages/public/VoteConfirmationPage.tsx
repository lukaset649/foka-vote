import { Link, useLocation, useParams } from 'react-router';
import type { SubmissionDto, VoteCardDto } from '@foka-vote/shared';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';

export interface VoteConfirmationState {
  card: VoteCardDto;
  submissions: SubmissionDto[];
}

const VoteConfirmationPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const state = location.state as VoteConfirmationState | null;

  if (!state) {
    return (
      <Alert variant="info">
        No confirmation data found.{' '}
        <Link to={`/contest/${slug}`} className="font-medium underline">
          Back to the contest
        </Link>
        .
      </Alert>
    );
  }

  const { card, submissions } = state;
  const submissionById = new Map(submissions.map((submission) => [submission.id, submission]));
  const sortedItems = [...card.items].sort((a, b) => b.points - a.points);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <i className="bi bi-check2-circle text-3xl text-emerald-600" aria-hidden="true" />
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
          Vote received
        </h1>
        <p className="text-zinc-600">Your vote card has been recorded. It cannot be changed.</p>
      </div>

      <Card>
        <ul className="flex flex-col divide-y divide-zinc-200">
          {sortedItems.map((item) => (
            <li key={item.submissionId} className="flex items-center justify-between py-2">
              <span className="text-zinc-900">
                {submissionById.get(item.submissionId)?.alias ?? item.submissionId}
              </span>
              <span className="font-semibold text-indigo-600">{item.points} pkt</span>
            </li>
          ))}
        </ul>
      </Card>

      <Link to={`/contest/${slug}`} className="w-fit text-sm text-indigo-600 hover:text-indigo-800">
        <i className="bi bi-arrow-left" aria-hidden="true" /> Back to the contest
      </Link>
    </div>
  );
};

export default VoteConfirmationPage;

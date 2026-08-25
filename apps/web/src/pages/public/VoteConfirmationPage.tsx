import { Link, useLocation, useParams } from 'react-router';
import type { SubmissionDto, VoteCardDto } from '@foka-vote/shared';

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
      <p>
        No confirmation data found. <Link to={`/contest/${slug}`}>Back to the contest</Link>.
      </p>
    );
  }

  const { card, submissions } = state;
  const submissionById = new Map(submissions.map((submission) => [submission.id, submission]));
  const sortedItems = [...card.items].sort((a, b) => b.points - a.points);

  return (
    <div>
      <h1>Vote received</h1>

      <p>Your vote card has been recorded. It cannot be changed.</p>

      <ul>
        {sortedItems.map((item) => (
          <li key={item.submissionId}>
            {item.points} pkt: {submissionById.get(item.submissionId)?.alias ?? item.submissionId}
          </li>
        ))}
      </ul>

      <p>
        <Link to={`/contest/${slug}`}>Back to the contest</Link>
      </p>
    </div>
  );
};

export default VoteConfirmationPage;

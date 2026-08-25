import { Link, useLocation, useParams } from 'react-router';
import type { SubmissionDto } from '@foka-vote/shared';
import { mediaUrl } from '../../services/apiClient';

interface ConfirmationState {
  submission: SubmissionDto;
}

const SubmissionConfirmationPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const state = location.state as ConfirmationState | null;

  if (!state) {
    return (
      <p>
        No confirmation data found. <Link to={`/contest/${slug}`}>Back to the contest</Link>.
      </p>
    );
  }

  const { submission } = state;

  return (
    <div>
      <h1>Submission received</h1>

      <p>
        Your work was submitted under the nickname <strong>{submission.alias}</strong>.
      </p>
      {submission.description && <p>{submission.description}</p>}

      <ul>
        {submission.artworks.map((artwork) => (
          <li key={artwork.id}>
            <img
              src={mediaUrl(artwork.thumbUrl)}
              alt={artwork.title ?? submission.alias}
              width={200}
            />
            {artwork.title && <p>{artwork.title}</p>}
            {artwork.description && <p>{artwork.description}</p>}
          </li>
        ))}
      </ul>

      <p>
        <Link to={`/contest/${slug}`}>Back to the contest</Link>
      </p>
    </div>
  );
};

export default SubmissionConfirmationPage;

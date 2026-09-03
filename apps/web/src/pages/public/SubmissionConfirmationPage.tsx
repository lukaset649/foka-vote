import { Link, useLocation, useParams } from 'react-router';
import type { SubmissionDto } from '@foka-vote/shared';
import { mediaUrl } from '../../services/apiClient';
import Alert from '../../components/ui/Alert';

interface ConfirmationState {
  submission: SubmissionDto;
}

const SubmissionConfirmationPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const state = location.state as ConfirmationState | null;

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

  const { submission } = state;

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={`/contest/${slug}`}
        className="inline-flex w-fit items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
      >
        <i className="bi bi-arrow-left" aria-hidden="true" /> Back to the contest
      </Link>

      <div className="flex flex-col items-center gap-2 text-center">
        <i className="bi bi-check2-circle text-3xl text-emerald-600" aria-hidden="true" />
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
          Submission received
        </h1>
        <p className="text-zinc-600">
          Your work was submitted under the nickname <strong>{submission.alias}</strong>.
        </p>
        {submission.description && <p className="text-zinc-600">{submission.description}</p>}
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {submission.artworks.map((artwork) => (
          <li key={artwork.id}>
            <div className="flex flex-col gap-2 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
              <img
                src={mediaUrl(artwork.thumbUrl)}
                alt={artwork.title ?? submission.alias}
                className="aspect-square w-full object-cover"
              />
              <div className="px-4 pb-4">
                {artwork.title && <p className="font-medium text-zinc-900">{artwork.title}</p>}
                {artwork.description && (
                  <p className="text-sm text-zinc-600">{artwork.description}</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SubmissionConfirmationPage;

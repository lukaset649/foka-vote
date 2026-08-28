import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { AdminSubmissionDto } from '@foka-vote/shared';
import { mediaUrl } from '../../services/apiClient';
import {
  deleteAdminArtwork,
  fetchAdminSubmission,
  reorderAdminArtworks,
  replaceAdminArtwork,
  updateAdminArtwork,
  updateAdminSubmission,
} from '../../services/submissions';

interface ArtworkFields {
  title: string;
  description: string;
}

const AdminSubmissionEditPage = () => {
  const { id, submissionId } = useParams<{ id: string; submissionId: string }>();
  const contestId = id as string;
  const submissionIdValue = submissionId as string;

  const [submission, setSubmission] = useState<AdminSubmissionDto | null>(null);
  const [error, setError] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [description, setDescription] = useState('');
  const [artworkFields, setArtworkFields] = useState<Record<string, ArtworkFields>>({});
  const [replaceFiles, setReplaceFiles] = useState<Record<string, File | null>>({});

  const load = () => {
    fetchAdminSubmission(contestId, submissionIdValue)
      .then((data) => {
        setSubmission(data);
        setFirstName(data.firstName);
        setLastName(data.lastName);
        setDescription(data.description ?? '');
        setArtworkFields(
          Object.fromEntries(
            data.artworks.map((artwork) => [
              artwork.id,
              { title: artwork.title ?? '', description: artwork.description ?? '' },
            ]),
          ),
        );
      })
      .catch(() => setError(true));
  };

  useEffect(load, [contestId, submissionIdValue]);

  const handleSaveData = () => {
    updateAdminSubmission(contestId, submissionIdValue, { firstName, lastName, description })
      .then(load)
      .catch(() => setError(true));
  };

  const handleSaveArtwork = (artworkId: string) => {
    const fields = artworkFields[artworkId];
    if (!fields) {
      return;
    }
    updateAdminArtwork(contestId, submissionIdValue, artworkId, fields)
      .then(load)
      .catch(() => setError(true));
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    if (!submission) {
      return;
    }
    const ids = submission.artworks.map((artwork) => artwork.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) {
      return;
    }
    [ids[index], ids[target]] = [ids[target] as string, ids[index] as string];
    reorderAdminArtworks(contestId, submissionIdValue, ids)
      .then(load)
      .catch(() => setError(true));
  };

  const handleDeleteArtwork = (artworkId: string) => {
    if (!window.confirm('Delete this artwork?')) {
      return;
    }
    deleteAdminArtwork(contestId, submissionIdValue, artworkId)
      .then(load)
      .catch(() => setError(true));
  };

  const handleReplace = (artworkId: string) => {
    const file = replaceFiles[artworkId];
    if (!file) {
      return;
    }
    replaceAdminArtwork(contestId, submissionIdValue, artworkId, file)
      .then(load)
      .catch(() => setError(true));
  };

  if (error) {
    return <p role="alert">Something went wrong</p>;
  }

  if (submission === null) {
    return <p>Loading…</p>;
  }

  const artworks = [...submission.artworks].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      <h1>Edit submission — {submission.alias}</h1>

      <p>
        <Link to={`/admin/contests/${contestId}/submissions`}>Back to submissions</Link>
      </p>

      <section>
        <h2>Author</h2>
        <label>
          First name
          <input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
        </label>
        <label>
          Last name
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} />
        </label>
        <label>
          Description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <button type="button" onClick={handleSaveData}>
          Save data
        </button>
      </section>

      <section>
        <h2>Artworks</h2>
        {artworks.map((artwork, index) => (
          <fieldset key={artwork.id}>
            <img
              src={mediaUrl(artwork.thumbUrl)}
              alt={artwork.title ?? submission.alias}
              width={150}
            />

            <label>
              Title
              <input
                value={artworkFields[artwork.id]?.title ?? ''}
                onChange={(event) =>
                  setArtworkFields((prev) => ({
                    ...prev,
                    [artwork.id]: {
                      ...(prev[artwork.id] as ArtworkFields),
                      title: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <label>
              Description
              <textarea
                value={artworkFields[artwork.id]?.description ?? ''}
                onChange={(event) =>
                  setArtworkFields((prev) => ({
                    ...prev,
                    [artwork.id]: {
                      ...(prev[artwork.id] as ArtworkFields),
                      description: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <button type="button" onClick={() => handleSaveArtwork(artwork.id)}>
              Save
            </button>

            <button type="button" disabled={index === 0} onClick={() => handleMove(index, -1)}>
              ↑
            </button>
            <button
              type="button"
              disabled={index === artworks.length - 1}
              onClick={() => handleMove(index, 1)}
            >
              ↓
            </button>

            <button
              type="button"
              disabled={artworks.length === 1}
              onClick={() => handleDeleteArtwork(artwork.id)}
            >
              Delete
            </button>

            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(event) =>
                setReplaceFiles((prev) => ({
                  ...prev,
                  [artwork.id]: event.target.files?.[0] ?? null,
                }))
              }
            />
            <button type="button" onClick={() => handleReplace(artwork.id)}>
              Replace
            </button>
          </fieldset>
        ))}
      </section>
    </div>
  );
};

export default AdminSubmissionEditPage;

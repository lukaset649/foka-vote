import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
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
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Label from '../../components/ui/Label';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Spinner from '../../components/ui/Spinner';

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
    return <Alert variant="error">Something went wrong</Alert>;
  }

  if (submission === null) {
    return <Spinner />;
  }

  const artworks = [...submission.artworks].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      <PageHeader
        title={`Edit submission — ${submission.alias}`}
        backTo={`/admin/contests/${contestId}/submissions`}
        backLabel="Back to submissions"
      />

      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Author</h2>

          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="submission-description">Description</Label>
            <Textarea
              id="submission-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <Button type="button" variant="secondary" className="w-fit" onClick={handleSaveData}>
            Save data
          </Button>
        </Card>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">Artworks</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {artworks.map((artwork, index) => (
              <Card key={artwork.id} className="flex flex-col gap-3">
                <img
                  src={mediaUrl(artwork.thumbUrl)}
                  alt={artwork.title ?? submission.alias}
                  className="aspect-square w-full rounded-md object-cover"
                />

                <div>
                  <Label htmlFor={`title-${artwork.id}`}>Title</Label>
                  <Input
                    id={`title-${artwork.id}`}
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
                </div>

                <div>
                  <Label htmlFor={`description-${artwork.id}`}>Description</Label>
                  <Textarea
                    id={`description-${artwork.id}`}
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
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSaveArtwork(artwork.id)}
                  >
                    Save
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => handleMove(index, -1)}
                    aria-label="Move up"
                  >
                    <i className="bi bi-arrow-up-short" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === artworks.length - 1}
                    onClick={() => handleMove(index, 1)}
                    aria-label="Move down"
                  >
                    <i className="bi bi-arrow-down-short" aria-hidden="true" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={artworks.length === 1}
                    onClick={() => handleDeleteArtwork(artwork.id)}
                  >
                    <i className="bi bi-trash" aria-hidden="true" />
                    Delete
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-3">
                  <label className="flex items-center gap-2">
                    <span className="sr-only">Replacement file</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(event) =>
                        setReplaceFiles((prev) => ({
                          ...prev,
                          [artwork.id]: event.target.files?.[0] ?? null,
                        }))
                      }
                      className="block text-sm text-zinc-700 file:mr-2 file:min-h-8 file:rounded-md file:border-0 file:bg-zinc-100 file:px-2 file:py-1 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
                    />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReplace(artwork.id)}
                  >
                    <i className="bi bi-upload" aria-hidden="true" />
                    Replace
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSubmissionEditPage;

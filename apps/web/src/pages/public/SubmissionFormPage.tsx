import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import type { ContestDto } from '@foka-vote/shared';
import { fetchContest } from '../../services/contests';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Label from '../../components/ui/Label';
import Button from '../../components/ui/Button';
import LinkButton from '../../components/ui/LinkButton';
import Alert from '../../components/ui/Alert';
import Spinner from '../../components/ui/Spinner';

export interface SubmissionArtworkDraft {
  file: File;
  title: string;
  description: string;
}

export interface SubmissionDraftState {
  firstName: string;
  lastName: string;
  description: string;
  artworks: SubmissionArtworkDraft[];
}

interface ArtworkSlot {
  file: File | null;
  title: string;
  description: string;
}

function emptySlot(): ArtworkSlot {
  return { file: null, title: '', description: '' };
}

const SubmissionFormPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const draft = (location.state as SubmissionDraftState | null) ?? null;

  const [contest, setContest] = useState<ContestDto | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [firstName, setFirstName] = useState(draft?.firstName ?? '');
  const [lastName, setLastName] = useState(draft?.lastName ?? '');
  const [description, setDescription] = useState(draft?.description ?? '');
  const [slots, setSlots] = useState<ArtworkSlot[]>(
    draft
      ? draft.artworks.map((artwork) => ({
          file: artwork.file,
          title: artwork.title,
          description: artwork.description,
        }))
      : [emptySlot()],
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      return;
    }
    let cancelled = false;

    fetchContest(slug)
      .then((data) => {
        if (!cancelled) {
          setContest(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const maxArtworks = contest?.maxArtworksPerSubmission ?? 1;

  const updateSlot = (index: number, patch: Partial<ArtworkSlot>) => {
    setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  };

  const addSlot = () => {
    if (slots.length < maxArtworks) {
      setSlots((prev) => [...prev, emptySlot()]);
    }
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleFileChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    updateSlot(index, { file: event.target.files?.[0] ?? null });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setFormError('First and last name are required');
      return;
    }

    const artworks: SubmissionArtworkDraft[] = [];
    for (const slot of slots) {
      if (slot.file) {
        artworks.push({ file: slot.file, title: slot.title, description: slot.description });
      }
    }

    if (artworks.length === 0) {
      setFormError('Attach at least one artwork');
      return;
    }

    const draft: SubmissionDraftState = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      description,
      artworks,
    };

    void navigate(`/contest/${slug}/submit/preview`, { state: draft });
  };

  if (loadError) {
    return <Alert variant="error">Failed to load contest</Alert>;
  }

  if (!contest) {
    return <Spinner />;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
        Submit your work — {contest.title}
      </h1>

      <Alert variant="info">
        Your first and last name will be published next to your work once voting closes. After
        submitting, only the admin can make changes — message the club&apos;s Messenger group if
        something needs fixing (a typo, a wrong file, a withdrawal).
      </Alert>

      <Card className="flex flex-col gap-4">
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900">Artworks (up to {maxArtworks})</h2>

        {slots.map((slot, index) => (
          <fieldset
            key={index}
            className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
          >
            <legend className="px-1 text-sm font-semibold text-zinc-700">
              Artwork {index + 1}
            </legend>

            <div>
              <Label htmlFor={`file-${index}`}>
                <i className="bi bi-upload" aria-hidden="true" /> File
              </Label>
              <input
                id={`file-${index}`}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileChange(index)}
                className="block w-full text-sm text-zinc-700 file:mr-3 file:min-h-10 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
              />
              {slot.file && (
                <p className="mt-1 text-sm text-zinc-500">Currently attached: {slot.file.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor={`title-${index}`}>Title (optional)</Label>
              <Input
                id={`title-${index}`}
                value={slot.title}
                onChange={(event) => updateSlot(index, { title: event.target.value })}
              />
            </div>

            <div>
              <Label htmlFor={`artwork-description-${index}`}>Description (optional)</Label>
              <Input
                id={`artwork-description-${index}`}
                value={slot.description}
                onChange={(event) => updateSlot(index, { description: event.target.value })}
              />
            </div>

            {slots.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={() => removeSlot(index)}
              >
                <i className="bi bi-trash" aria-hidden="true" />
                Remove
              </Button>
            )}
          </fieldset>
        ))}

        {slots.length < maxArtworks && (
          <Button type="button" variant="secondary" className="w-fit" onClick={addSlot}>
            <i className="bi bi-plus-circle" aria-hidden="true" />
            Add another artwork
          </Button>
        )}
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <LinkButton
          to={`/contest/${slug}`}
          variant="secondary"
          className="hover:!border-rose-600 hover:!bg-rose-600 hover:!text-white"
        >
          Cancel
        </LinkButton>
        <Button type="submit">
          <i className="bi bi-send" aria-hidden="true" />
          Continue to preview
        </Button>
      </div>

      {formError && <Alert variant="error">{formError}</Alert>}
    </form>
  );
};

export default SubmissionFormPage;

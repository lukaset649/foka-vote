import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import type { ContestDto } from '@foka-vote/shared';
import { fetchContest } from '../../services/contests';

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
    return <p role="alert">Failed to load contest</p>;
  }

  if (!contest) {
    return <p>Loading…</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Submit your work — {contest.title}</h1>

      <p>
        Your first and last name will be published next to your work once voting closes. After
        submitting, only the admin can make changes — contact them if something needs fixing.
      </p>

      <label htmlFor="firstName">First name</label>
      <input
        id="firstName"
        value={firstName}
        onChange={(event) => setFirstName(event.target.value)}
        required
      />

      <label htmlFor="lastName">Last name</label>
      <input
        id="lastName"
        value={lastName}
        onChange={(event) => setLastName(event.target.value)}
        required
      />

      <label htmlFor="description">Description (optional)</label>
      <textarea
        id="description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />

      <h2>Artworks (up to {maxArtworks})</h2>

      {slots.map((slot, index) => (
        <fieldset key={index}>
          <legend>Artwork {index + 1}</legend>

          <label htmlFor={`file-${index}`}>File</label>
          <input
            id={`file-${index}`}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileChange(index)}
          />
          {slot.file && <span> Currently attached: {slot.file.name}</span>}

          <label htmlFor={`title-${index}`}>Title (optional)</label>
          <input
            id={`title-${index}`}
            value={slot.title}
            onChange={(event) => updateSlot(index, { title: event.target.value })}
          />

          <label htmlFor={`artwork-description-${index}`}>Description (optional)</label>
          <input
            id={`artwork-description-${index}`}
            value={slot.description}
            onChange={(event) => updateSlot(index, { description: event.target.value })}
          />

          {slots.length > 1 && (
            <button type="button" onClick={() => removeSlot(index)}>
              Remove
            </button>
          )}
        </fieldset>
      ))}

      {slots.length < maxArtworks && (
        <button type="button" onClick={addSlot}>
          Add another artwork
        </button>
      )}

      <button type="submit">Continue to preview</button>

      {formError && <p role="alert">{formError}</p>}
    </form>
  );
};

export default SubmissionFormPage;

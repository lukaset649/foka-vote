import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { AdminContestDto } from '@foka-vote/shared';
import { createContest, fetchAdminContest, updateContest } from '../../services/contests';

function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

interface FormState {
  title: string;
  slug: string;
  description: string;
  submissionStart: string;
  submissionDeadline: string;
  votingStart: string;
  votingEnd: string;
  maxArtworksPerSubmission: string;
  accessCode: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  slug: '',
  description: '',
  submissionStart: '',
  submissionDeadline: '',
  votingStart: '',
  votingEnd: '',
  maxArtworksPerSubmission: '',
  accessCode: '',
};

function toFormState(contest: AdminContestDto): FormState {
  return {
    title: contest.title,
    slug: contest.slug,
    description: contest.description ?? '',
    submissionStart: toDateTimeLocalValue(contest.submissionStart),
    submissionDeadline: toDateTimeLocalValue(contest.submissionDeadline),
    votingStart: toDateTimeLocalValue(contest.votingStart),
    votingEnd: toDateTimeLocalValue(contest.votingEnd),
    maxArtworksPerSubmission: String(contest.maxArtworksPerSubmission),
    accessCode: contest.accessCode ?? '',
  };
}

const AdminContestFormPage = () => {
  const { id } = useParams();
  const isEditing = id !== undefined;
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    fetchAdminContest(id)
      .then((contest) => {
        setForm(toFormState(contest));
      })
      .catch(() => {
        setError('Failed to load contest');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const updateField =
    (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const submit = async () => {
    setSubmitting(true);
    setError(null);

    const payload = {
      title: form.title,
      submissionStart: new Date(form.submissionStart).toISOString(),
      submissionDeadline: new Date(form.submissionDeadline).toISOString(),
      votingStart: new Date(form.votingStart).toISOString(),
      votingEnd: new Date(form.votingEnd).toISOString(),
      ...(form.slug ? { slug: form.slug } : {}),
      ...(form.description ? { description: form.description } : {}),
      ...(form.maxArtworksPerSubmission
        ? { maxArtworksPerSubmission: Number(form.maxArtworksPerSubmission) }
        : {}),
      ...(form.accessCode ? { accessCode: form.accessCode } : {}),
    };

    try {
      if (id) {
        await updateContest(id, payload);
      } else {
        await createContest(payload);
      }
      void navigate('/admin/contests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contest');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  if (loading) {
    return <p>Loading…</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>{isEditing ? 'Edit contest' : 'New contest'}</h1>

      <p>
        <Link to="/admin/contests">Back to contests</Link>
        {isEditing && (
          <>
            {' · '}
            <Link to={`/admin/contests/${id}/submissions`}>Submissions &amp; vote cards</Link>
          </>
        )}
      </p>

      <label htmlFor="title">Title</label>
      <input id="title" value={form.title} onChange={updateField('title')} required />

      <label htmlFor="slug">Slug (optional override)</label>
      <input id="slug" value={form.slug} onChange={updateField('slug')} />

      <label htmlFor="description">Description</label>
      <textarea id="description" value={form.description} onChange={updateField('description')} />

      <label htmlFor="submissionStart">Submission start</label>
      <input
        id="submissionStart"
        type="datetime-local"
        value={form.submissionStart}
        onChange={updateField('submissionStart')}
        required
      />

      <label htmlFor="submissionDeadline">Submission deadline</label>
      <input
        id="submissionDeadline"
        type="datetime-local"
        value={form.submissionDeadline}
        onChange={updateField('submissionDeadline')}
        required
      />

      <label htmlFor="votingStart">Voting start</label>
      <input
        id="votingStart"
        type="datetime-local"
        value={form.votingStart}
        onChange={updateField('votingStart')}
        required
      />

      <label htmlFor="votingEnd">Voting end</label>
      <input
        id="votingEnd"
        type="datetime-local"
        value={form.votingEnd}
        onChange={updateField('votingEnd')}
        required
      />

      <label htmlFor="maxArtworksPerSubmission">Max artworks per submission</label>
      <input
        id="maxArtworksPerSubmission"
        type="number"
        min={1}
        value={form.maxArtworksPerSubmission}
        onChange={updateField('maxArtworksPerSubmission')}
      />

      <label htmlFor="accessCode">Access code (optional)</label>
      <input id="accessCode" value={form.accessCode} onChange={updateField('accessCode')} />

      <button type="submit" disabled={submitting}>
        {isEditing ? 'Save changes' : 'Create contest'}
      </button>

      {error && <p role="alert">{error}</p>}
    </form>
  );
};

export default AdminContestFormPage;

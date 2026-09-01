import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { AdminContestDto } from '@foka-vote/shared';
import { createContest, fetchAdminContest, updateContest } from '../../services/contests';
import ContestPhaseActions from '../../components/ContestPhaseActions';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Label from '../../components/ui/Label';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Spinner from '../../components/ui/Spinner';

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
  const [contest, setContest] = useState<AdminContestDto | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    fetchAdminContest(id)
      .then((data) => {
        setContest(data);
        setForm(toFormState(data));
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
    return <Spinner />;
  }

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        title={isEditing ? 'Edit contest' : 'New contest'}
        backTo="/admin/contests"
        backLabel="Back to contests"
      >
        {isEditing && (
          <Link
            to={`/admin/contests/${id}/submissions`}
            className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
          >
            <i className="bi bi-ticket-perforated" aria-hidden="true" />
            Submissions &amp; vote cards
          </Link>
        )}
      </PageHeader>

      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Basic info
          </h2>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} onChange={updateField('title')} required />
          </div>

          <div>
            <Label htmlFor="slug">Slug (optional override)</Label>
            <Input id="slug" value={form.slug} onChange={updateField('slug')} />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={updateField('description')}
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Timeline
            </h2>
            {contest && (
              <ContestPhaseActions
                contest={contest}
                onUpdated={(updated) => {
                  setContest(updated);
                  setForm(toFormState(updated));
                }}
              />
            )}
          </div>

          <div>
            <Label htmlFor="submissionStart">Submission start</Label>
            <Input
              id="submissionStart"
              type="datetime-local"
              value={form.submissionStart}
              onChange={updateField('submissionStart')}
              required
            />
          </div>

          <div>
            <Label htmlFor="submissionDeadline">Submission deadline</Label>
            <Input
              id="submissionDeadline"
              type="datetime-local"
              value={form.submissionDeadline}
              onChange={updateField('submissionDeadline')}
              required
            />
          </div>

          <div>
            <Label htmlFor="votingStart">Voting start</Label>
            <Input
              id="votingStart"
              type="datetime-local"
              value={form.votingStart}
              onChange={updateField('votingStart')}
              required
            />
          </div>

          <div>
            <Label htmlFor="votingEnd">Voting end</Label>
            <Input
              id="votingEnd"
              type="datetime-local"
              value={form.votingEnd}
              onChange={updateField('votingEnd')}
              required
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Limits &amp; access
          </h2>

          <div>
            <Label htmlFor="maxArtworksPerSubmission">Max artworks per submission</Label>
            <Input
              id="maxArtworksPerSubmission"
              type="number"
              min={1}
              value={form.maxArtworksPerSubmission}
              onChange={updateField('maxArtworksPerSubmission')}
            />
          </div>

          <div>
            <Label htmlFor="accessCode">Access code (optional)</Label>
            <Input id="accessCode" value={form.accessCode} onChange={updateField('accessCode')} />
          </div>
        </Card>

        <Button type="submit" disabled={submitting} className="w-full sm:w-fit">
          {isEditing ? 'Save changes' : 'Create contest'}
        </Button>

        {error && <Alert variant="error">{error}</Alert>}
      </div>
    </form>
  );
};

export default AdminContestFormPage;

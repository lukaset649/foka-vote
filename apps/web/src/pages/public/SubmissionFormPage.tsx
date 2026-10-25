import { useEffect, useState, type FormEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';
import type { ContestDto } from '@foka-vote/shared';
import { errorMessage } from '../../lib/errorMessage';
import useLeaveWarning from '../../lib/useLeaveWarning';
import usePhotoUploadQueue, {
  type PhotoUploadItem,
  type UploadedPhotoDraft,
} from '../../lib/usePhotoUploadQueue';
import { isUnauthorizedError } from '../../services/apiClient';
import { contestGatePath, fetchContest } from '../../services/contests';
import { reserveAlias } from '../../services/submissions';
import PhotoUploadList from '../../components/PhotoUploadList';
import RulesModal from '../../components/RulesModal';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Label from '../../components/ui/Label';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Spinner from '../../components/ui/Spinner';

export interface SubmissionDraftState {
  firstName: string;
  lastName: string;
  description: string;
  artworks: UploadedPhotoDraft[];
  alias: string;
  reservationId: string;
  rulesAccepted: boolean;
}

function uploadedDraft(item: PhotoUploadItem): UploadedPhotoDraft[] {
  return item.uploadId && item.thumbUrl
    ? [
        {
          uploadId: item.uploadId,
          thumbUrl: item.thumbUrl,
          title: item.title,
          description: item.description,
        },
      ]
    : [];
}

const SubmissionFormPage = () => {
  const { t } = useTranslation();
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const draft = (location.state as SubmissionDraftState | null) ?? null;

  const [contest, setContest] = useState<ContestDto | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [firstName, setFirstName] = useState(draft?.firstName ?? '');
  const [lastName, setLastName] = useState(draft?.lastName ?? '');
  const [description, setDescription] = useState(draft?.description ?? '');
  const [formError, setFormError] = useState<string | null>(null);
  const [rulesAccepted, setRulesAccepted] = useState(draft?.rulesAccepted ?? false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);

  const [alias, setAlias] = useState(draft?.alias ?? '');
  const [reservationId, setReservationId] = useState(draft?.reservationId ?? '');
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draft is a one-time navigation payload, not expected to change
  }, [slug, navigate]);

  useEffect(() => {
    if (!slug || !contest || reservationId) {
      return;
    }
    let cancelled = false;

    reserveAlias(slug)
      .then((data) => {
        if (!cancelled) {
          setAlias(data.alias);
          setReservationId(data.reservationId);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        if (isUnauthorizedError(err)) {
          void navigate(contestGatePath(slug, `/contest/${slug}/submit`), {
            replace: true,
            state: draft,
          });
          return;
        }
        setAliasError(errorMessage(err, t));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draft is a one-time navigation payload, not expected to change
  }, [slug, contest, reservationId, navigate]);

  const maxArtworks = contest?.maxArtworksPerSubmission ?? 1;
  const formPath = `/contest/${slug}/submit`;

  const buildDraft = (artworks: UploadedPhotoDraft[]): SubmissionDraftState => ({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    description,
    artworks,
    alias,
    reservationId,
    rulesAccepted,
  });

  const queue = usePhotoUploadQueue({ kind: 'contest', slug }, maxArtworks, {
    initialPhotos: draft?.artworks ?? [],
    onUnauthorized: () => {
      // The draft carries the uploaded photos through the gate and back to the form.
      queue.keep();
      void navigate(contestGatePath(slug, formPath), {
        replace: true,
        state: buildDraft(queue.items.flatMap(uploadedDraft)),
      });
    },
  });
  const { summary, uploadedPhotos } = queue;

  useLeaveWarning(summary.total > 0);

  const uploadsBlockedReason =
    summary.total === 0
      ? null
      : summary.busy
        ? t('components.photoUpload.waitForUploads')
        : summary.failed > 0
          ? t('components.photoUpload.fixFailedUploads')
          : null;

  const handleCancel = async () => {
    setCancelling(true);
    await queue.clear();
    void navigate(`/contest/${slug}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setFormError(t('pages.submissionForm.errors.nameRequired'));
      return;
    }

    if (!uploadedPhotos) {
      setFormError(uploadsBlockedReason ?? t('pages.submissionForm.errors.artworkRequired'));
      return;
    }

    if (!alias || !reservationId) {
      setFormError(t('pages.submissionForm.errors.aliasPending'));
      return;
    }

    if (!rulesAccepted) {
      setFormError(t('pages.submissionForm.errors.rulesRequired'));
      return;
    }

    queue.keep();
    void navigate(`${formPath}/preview`, { state: buildDraft(uploadedPhotos) });
  };

  if (loadError) {
    return <Alert variant="error">{t('pages.contest.failedToLoad')}</Alert>;
  }

  if (!contest) {
    return <Spinner />;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
        {t('pages.submissionForm.heading', { title: contest.title })}
      </h1>

      <Alert variant="info">
        {t('pages.submissionForm.infoNamePublished')}
        <br />
        {t('pages.submissionForm.infoAliasAfter')}
        <br />
        {t('pages.submissionForm.infoAdminOnly')}
      </Alert>

      <Card className="flex flex-col gap-4">
        <div>
          <Label htmlFor="alias">{t('pages.submissionForm.nicknameLabel')}</Label>
          <Input
            id="alias"
            value={
              alias ||
              (aliasError
                ? t('pages.submissionForm.nicknameUnavailable')
                : t('pages.submissionForm.nicknameAssigning'))
            }
            disabled
            className="cursor-not-allowed bg-zinc-100 text-zinc-500"
          />
          <p className="mt-1 text-sm text-zinc-500">{t('pages.submissionForm.nicknameHint')}</p>
          {aliasError && <p className="mt-1 text-sm text-rose-600">{aliasError}</p>}
        </div>

        <div>
          <Label htmlFor="firstName">{t('pages.submissionForm.firstNameLabel')}</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="lastName">{t('pages.submissionForm.lastNameLabel')}</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="description">{t('common.descriptionOptional')}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900">
          {t('pages.submissionForm.artworksHeading', { max: maxArtworks })}
        </h2>
        <PhotoUploadList queue={queue} />
      </div>

      <label className="flex items-start gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={rulesAccepted}
          onChange={(event) => setRulesAccepted(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
        />
        <span>
          <Trans
            i18nKey="pages.submissionForm.rulesLabel"
            components={{
              rulesLink: (
                <button
                  type="button"
                  onClick={() => setRulesModalOpen(true)}
                  className="font-medium text-indigo-600 underline hover:text-indigo-800"
                />
              ),
            }}
          />
        </span>
      </label>

      <RulesModal
        variant="contest"
        open={rulesModalOpen}
        onClose={() => setRulesModalOpen(false)}
      />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap justify-between gap-3">
          <Button
            type="button"
            variant="secondaryDanger"
            disabled={cancelling}
            onClick={() => void handleCancel()}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={cancelling || uploadsBlockedReason !== null}>
            <i className="bi bi-send" aria-hidden="true" />
            {t('pages.submissionForm.continueToPreview')}
          </Button>
        </div>
        {uploadsBlockedReason && (
          <p className="text-right text-sm text-zinc-500">{uploadsBlockedReason}</p>
        )}
      </div>

      {formError && <Alert variant="error">{formError}</Alert>}
    </form>
  );
};

export default SubmissionFormPage;

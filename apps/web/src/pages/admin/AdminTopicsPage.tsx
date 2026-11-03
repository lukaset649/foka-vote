import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { ErrorCode, MAX_CONTEST_TOPIC_TITLE_LENGTH, type ContestTopicDto } from '@foka-vote/shared';
import { errorMessage } from '../../lib/errorMessage';
import { ApiError } from '../../services/apiClient';
import {
  createContestTopic,
  deleteContestTopic,
  fetchContestTopics,
  updateContestTopic,
} from '../../services/contestTopics';
import FortuneWheel, { type FortuneWheelHandle } from '../../components/FortuneWheel';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Label from '../../components/ui/Label';
import LinkButton from '../../components/ui/LinkButton';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';
import useConfirm from '../../lib/useConfirm';

function topicErrorMessage(err: unknown, t: TFunction): string {
  if (err instanceof ApiError && err.code === ErrorCode.CONFLICT) {
    return t('pages.adminTopics.duplicate');
  }
  return errorMessage(err, t);
}

const AdminTopicsPage = () => {
  const { t } = useTranslation();
  const { confirm, confirmDialog } = useConfirm();
  const [topics, setTopics] = useState<ContestTopicDto[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const wheelRef = useRef<FortuneWheelHandle>(null);
  const [spinning, setSpinning] = useState(false);
  const [pendingResultId, setPendingResultId] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  // Deleting or renaming the drawn topic afterwards is reflected here automatically.
  const result = topics?.find((topic) => topic.id === resultId) ?? null;

  useEffect(() => {
    let cancelled = false;

    fetchContestTopics()
      .then((data) => {
        if (!cancelled) {
          setTopics(data);
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
  }, []);

  const spin = () => {
    if (!topics || spinning) {
      return;
    }
    const index = Math.floor(Math.random() * topics.length);
    const drawn = topics[index];
    if (!drawn) {
      return;
    }

    setResultId(null);
    setPendingResultId(drawn.id);
    setSpinning(true);
    wheelRef.current?.spinTo(index);
  };

  const handleSpinEnd = () => {
    setSpinning(false);
    setResultId(pendingResultId);
    setPendingResultId(null);
  };

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newTitle.trim().length === 0) {
      return;
    }

    setAdding(true);
    setActionError(null);
    createContestTopic({ title: newTitle })
      .then((created) => {
        setTopics((prev) => [...(prev ?? []), created]);
        setNewTitle('');
      })
      .catch((err: unknown) => setActionError(topicErrorMessage(err, t)))
      .finally(() => setAdding(false));
  };

  const startEditing = (topic: ContestTopicDto) => {
    setEditingId(topic.id);
    setEditTitle(topic.title);
    setActionError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const saveEdit = (topic: ContestTopicDto) => {
    if (editTitle.trim().length === 0) {
      return;
    }

    setBusyId(topic.id);
    setActionError(null);
    updateContestTopic(topic.id, { title: editTitle })
      .then((updated) => {
        setTopics((prev) => prev?.map((item) => (item.id === updated.id ? updated : item)) ?? prev);
        cancelEditing();
      })
      .catch((err: unknown) => setActionError(topicErrorMessage(err, t)))
      .finally(() => setBusyId(null));
  };

  const handleEditKeyDown = (event: KeyboardEvent<HTMLInputElement>, topic: ContestTopicDto) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveEdit(topic);
    } else if (event.key === 'Escape') {
      cancelEditing();
    }
  };

  const handleDelete = async (topic: ContestTopicDto) => {
    const confirmed = await confirm({
      message: t('pages.adminTopics.confirmDelete', { title: topic.title }),
      confirmLabel: t('common.remove'),
      confirmVariant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    setBusyId(topic.id);
    setActionError(null);
    deleteContestTopic(topic.id)
      .then(() => setTopics((prev) => prev?.filter((item) => item.id !== topic.id) ?? prev))
      .catch((err: unknown) => setActionError(errorMessage(err, t)))
      .finally(() => setBusyId(null));
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('pages.adminTopics.title')} />

      {loadError && <Alert variant="error">{t('pages.adminTopics.failedToLoad')}</Alert>}
      {actionError && <Alert variant="error">{actionError}</Alert>}
      {!loadError && topics === null && <Spinner />}

      {topics !== null && (
        <>
          {topics.length > 0 && (
            <Card className="flex flex-col items-center gap-6">
              <FortuneWheel
                ref={wheelRef}
                labels={topics.map((topic) => topic.title)}
                onSpinEnd={handleSpinEnd}
              />

              <div aria-live="polite" className="flex w-full flex-col items-center gap-4">
                {result ? (
                  <>
                    <div className="text-center">
                      <p className="text-sm text-zinc-500">{t('pages.adminTopics.drawnTopic')}</p>
                      <p className="text-xl font-semibold break-words text-zinc-900">
                        {result.title}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="button" variant="secondary" onClick={spin}>
                        <i className="bi bi-arrow-repeat" aria-hidden="true" />
                        {t('pages.adminTopics.spinAgain')}
                      </Button>
                      <LinkButton
                        to={`/admin/contests/new?topicId=${encodeURIComponent(result.id)}`}
                        variant="success"
                      >
                        <i className="bi bi-plus-circle" aria-hidden="true" />
                        {t('pages.adminTopics.createContest')}
                      </LinkButton>
                    </div>
                  </>
                ) : (
                  <Button type="button" disabled={spinning} onClick={spin}>
                    <i className="bi bi-shuffle" aria-hidden="true" />
                    {spinning ? t('pages.adminTopics.spinning') : t('pages.adminTopics.spin')}
                  </Button>
                )}
              </div>
            </Card>
          )}

          <Card>
            <form className="flex flex-col gap-2" onSubmit={handleAdd}>
              <Label htmlFor="new-topic">{t('pages.adminTopics.newTopicLabel')}</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="new-topic"
                  value={newTitle}
                  maxLength={MAX_CONTEST_TOPIC_TITLE_LENGTH}
                  placeholder={t('pages.adminTopics.newTopicPlaceholder')}
                  onChange={(event) => setNewTitle(event.target.value)}
                />
                <Button
                  type="submit"
                  variant="success"
                  className="sm:shrink-0"
                  disabled={adding || spinning || newTitle.trim().length === 0}
                >
                  <i className="bi bi-plus-circle" aria-hidden="true" />
                  {t('pages.adminTopics.add')}
                </Button>
              </div>
            </form>
          </Card>

          {topics.length === 0 ? (
            <EmptyState icon="bi-lightbulb" text={t('pages.adminTopics.noTopicsYet')} />
          ) : (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-zinc-900">
                {t('pages.adminTopics.listHeading', { count: topics.length })}
              </h2>
              <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white shadow-sm">
                {topics.map((topic) => (
                  <li
                    key={topic.id}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    {editingId === topic.id ? (
                      <>
                        <Input
                          aria-label={t('pages.adminTopics.editLabel')}
                          value={editTitle}
                          maxLength={MAX_CONTEST_TOPIC_TITLE_LENGTH}
                          autoFocus
                          onChange={(event) => setEditTitle(event.target.value)}
                          onKeyDown={(event) => handleEditKeyDown(event, topic)}
                        />
                        <div className="flex gap-2 sm:shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              busyId === topic.id || spinning || editTitle.trim().length === 0
                            }
                            onClick={() => saveEdit(topic)}
                          >
                            <i className="bi bi-check-lg" aria-hidden="true" />
                            {t('pages.adminTopics.save')}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={busyId === topic.id}
                            onClick={cancelEditing}
                          >
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 break-words text-zinc-900">{topic.title}</span>
                        <div className="flex gap-2 sm:shrink-0">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={busyId === topic.id || spinning}
                            onClick={() => startEditing(topic)}
                          >
                            <i className="bi bi-pencil-square" aria-hidden="true" />
                            {t('pages.submissionPreview.edit')}
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            disabled={busyId === topic.id || spinning}
                            onClick={() => void handleDelete(topic)}
                          >
                            <i className="bi bi-trash" aria-hidden="true" />
                            {t('common.remove')}
                          </Button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {confirmDialog}
    </div>
  );
};

export default AdminTopicsPage;

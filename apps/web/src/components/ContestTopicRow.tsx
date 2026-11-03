import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_CONTEST_TOPIC_TITLE_LENGTH, type ContestTopicDto } from '@foka-vote/shared';
import Button from './ui/Button';
import Input from './ui/Input';

interface ContestTopicRowProps {
  topic: ContestTopicDto;
  disabled: boolean;
  // Resolves to true when the new title was saved, so the row can leave edit mode.
  onSave: (title: string) => Promise<boolean>;
  onDelete: () => void;
}

const ContestTopicRow = ({ topic, disabled, onSave, onDelete }: ContestTopicRowProps) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const canSave = !disabled && !saving && editTitle.trim().length > 0;

  const startEditing = () => {
    setEditTitle(topic.title);
    setEditing(true);
  };

  const save = () => {
    if (!canSave) {
      return;
    }

    setSaving(true);
    void onSave(editTitle).then((saved) => {
      setSaving(false);
      if (saved) {
        setEditing(false);
      }
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      save();
    } else if (event.key === 'Escape') {
      setEditing(false);
    }
  };

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      {editing ? (
        <>
          <Input
            aria-label={t('pages.adminTopics.editLabel')}
            value={editTitle}
            maxLength={MAX_CONTEST_TOPIC_TITLE_LENGTH}
            autoFocus
            onChange={(event) => setEditTitle(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex gap-2 sm:shrink-0">
            <Button type="button" size="sm" disabled={!canSave} onClick={save}>
              <i className="bi bi-check-lg" aria-hidden="true" />
              {t('pages.adminTopics.save')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => setEditing(false)}
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
              disabled={disabled}
              onClick={startEditing}
            >
              <i className="bi bi-pencil-square" aria-hidden="true" />
              {t('pages.submissionPreview.edit')}
            </Button>
            <Button type="button" variant="danger" size="sm" disabled={disabled} onClick={onDelete}>
              <i className="bi bi-trash" aria-hidden="true" />
              {t('common.remove')}
            </Button>
          </div>
        </>
      )}
    </li>
  );
};

export default ContestTopicRow;

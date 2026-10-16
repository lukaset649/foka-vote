import { useTranslation } from 'react-i18next';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface RulesSection {
  heading: string;
  items: string[];
}

type RulesVariant = 'contest' | 'album';

const I18N_KEYS = {
  contest: {
    title: 'components.contestRulesModal.title',
    sections: 'components.contestRulesModal.sections',
  },
  album: {
    title: 'components.albumRulesModal.title',
    sections: 'components.albumRulesModal.sections',
  },
} as const;

interface RulesModalProps {
  variant: RulesVariant;
  open: boolean;
  onClose: () => void;
}

const RulesModal = ({ variant, open, onClose }: RulesModalProps) => {
  const { t } = useTranslation();
  const keys = I18N_KEYS[variant];

  const sections = t(keys.sections, {
    returnObjects: true,
  }) as RulesSection[];

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabelledBy="rules-modal-title"
      className="flex max-h-[85vh] max-w-lg flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
        <h2 id="rules-modal-title" className="text-lg font-semibold text-zinc-900">
          {t(keys.title)}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="text-zinc-400 hover:text-zinc-600"
        >
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto px-6 py-4 text-sm text-zinc-700">
        {sections.map((section) => (
          <div key={section.heading}>
            <h3 className="mb-1 font-semibold text-zinc-900">{section.heading}</h3>
            <ol className="list-decimal space-y-1 pl-5">
              {section.items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <div className="flex justify-end border-t border-zinc-200 px-6 py-4">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
      </div>
    </Modal>
  );
};

export default RulesModal;

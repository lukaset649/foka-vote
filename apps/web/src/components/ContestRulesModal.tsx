import { useTranslation } from 'react-i18next';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface RulesSection {
  heading: string;
  items: string[];
}

interface ContestRulesModalProps {
  open: boolean;
  onClose: () => void;
}

const ContestRulesModal = ({ open, onClose }: ContestRulesModalProps) => {
  const { t } = useTranslation();

  const sections = t('components.contestRulesModal.sections', {
    returnObjects: true,
  }) as RulesSection[];

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabelledBy="contest-rules-title"
      className="flex max-h-[85vh] max-w-lg flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
        <h2 id="contest-rules-title" className="text-lg font-semibold text-zinc-900">
          {t('components.contestRulesModal.title')}
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

export default ContestRulesModal;

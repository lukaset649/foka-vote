import { useTranslation } from 'react-i18next';
import type { NavItem } from './Layout';
import LanguageSwitcher from './ui/LanguageSwitcher';
import LinkButton from './ui/LinkButton';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  items: readonly NavItem[];
}

const MobileNav = ({ isOpen, onClose, items }: MobileNavProps) => {
  const { t } = useTranslation();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-30 sm:hidden">
      <button
        type="button"
        aria-label={t('nav.closeMenu')}
        className="absolute inset-0 bg-zinc-900/40"
        onClick={onClose}
      />
      <div className="absolute right-0 top-0 flex h-full w-64 max-w-[80%] flex-col gap-4 bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-500">{t('nav.menu')}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('nav.closeMenu')}
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
        <nav className="flex flex-col gap-2">
          {items.map((item) => (
            <LinkButton
              key={item.to}
              to={item.to}
              variant="secondary"
              size="sm"
              className="w-full !justify-start"
            >
              {t(item.labelKey)}
            </LinkButton>
          ))}
        </nav>
        <div className="mt-auto border-t border-zinc-200 pt-4">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
};

export default MobileNav;

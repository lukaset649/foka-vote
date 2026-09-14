import { useEffect, useState } from 'react';
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
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsVisible(true));
      });
      return () => cancelAnimationFrame(raf);
    }
    setIsVisible(false);
  }, [isOpen]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-30 sm:hidden">
      <button
        type="button"
        aria-label={t('nav.closeMenu')}
        className={`absolute inset-0 bg-zinc-900/40 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 flex h-full w-64 max-w-[80%] flex-col gap-4 bg-white p-4 shadow-xl transition-transform duration-300 ease-out ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
        onTransitionEnd={() => {
          if (!isOpen) {
            setShouldRender(false);
          }
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-500">{t('nav.menu')}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('nav.closeMenu')}
            className="flex h-11 w-11 items-center justify-center rounded-md text-lg text-zinc-500 transition-colors hover:bg-zinc-100"
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
              className="w-full !min-h-11 !justify-start !text-base"
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

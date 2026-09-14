import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation, useMatches } from 'react-router';
import logo from '../assets/logo.svg';
import type { RouteHandle } from '../routes';
import MobileNav from './MobileNav';
import LanguageSwitcher from './ui/LanguageSwitcher';
import LinkButton from './ui/LinkButton';

export const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.voting' },
  { to: '/admin', labelKey: 'nav.admin' },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

const Layout = () => {
  const { t } = useTranslation();
  const matches = useMatches();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isWide = matches.some((match) => (match.handle as RouteHandle | undefined)?.wide);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="FO-KA" className="h-10 w-auto" />
            <span className="text-lg font-semibold tracking-tight">FOKA Vote</span>
          </Link>

          <nav className="hidden items-center gap-2 sm:flex">
            {NAV_ITEMS.map((item) => (
              <LinkButton
                key={item.to}
                to={item.to}
                variant={item.to === '/admin' ? 'secondary' : 'ghost'}
                size="sm"
                className={
                  item.to === '/admin'
                    ? 'hover:!border-indigo-600 hover:!bg-indigo-600 hover:!text-white'
                    : undefined
                }
              >
                {t(item.labelKey)}
              </LinkButton>
            ))}
            <LanguageSwitcher />
          </nav>

          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label={t('nav.openMenu')}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-zinc-300 text-xl text-zinc-600 transition-colors hover:bg-zinc-100 sm:hidden"
          >
            <i className="bi bi-list" aria-hidden="true" />
          </button>
        </div>
      </header>

      <MobileNav isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} items={NAV_ITEMS} />

      <main className={`mx-auto px-4 py-6 sm:px-6 sm:py-8 ${isWide ? 'max-w-5xl' : 'max-w-3xl'}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

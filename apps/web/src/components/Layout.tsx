import { Link, Outlet, useMatches } from 'react-router';
import logo from '../assets/logo.svg';
import type { RouteHandle } from '../routes';
import LanguageSwitcher from './ui/LanguageSwitcher';
import LinkButton from './ui/LinkButton';

const Layout = () => {
  const matches = useMatches();
  const isWide = matches.some((match) => (match.handle as RouteHandle | undefined)?.wide);

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="FO-KA" className="h-10 w-auto" />
            <span className="text-lg font-semibold tracking-tight">FOKA Vote</span>
          </Link>
          <nav className="flex items-center gap-2">
            <LinkButton to="/" variant="ghost" size="sm">
              Voting
            </LinkButton>
            <LinkButton
              to="/admin"
              variant="secondary"
              size="sm"
              className="hover:!border-indigo-600 hover:!bg-indigo-600 hover:!text-white"
            >
              Admin
            </LinkButton>
            <LanguageSwitcher />
          </nav>
        </div>
      </header>
      <main className={`mx-auto px-4 py-6 sm:px-6 sm:py-8 ${isWide ? 'max-w-5xl' : 'max-w-3xl'}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

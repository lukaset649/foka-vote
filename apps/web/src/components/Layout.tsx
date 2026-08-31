import { Link, Outlet } from 'react-router';
import LinkButton from './ui/LinkButton';

const Layout = () => {
  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <i className="bi bi-camera-fill text-lg text-indigo-600" aria-hidden="true" />
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
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

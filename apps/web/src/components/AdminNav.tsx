import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router';
import LinkButton from './ui/LinkButton';

const SECTIONS = [
  {
    key: 'contests',
    to: '/admin/contests',
    labelKey: 'pages.adminContestsList.title',
    createTo: '/admin/contests/new',
    createLabelKey: 'pages.adminContestsList.newContest',
  },
  {
    key: 'gallery',
    to: '/admin/gallery',
    labelKey: 'pages.adminGallery.title',
    createTo: '/admin/gallery/albums/new',
    createLabelKey: 'pages.adminGallery.createAlbum',
  },
] as const;

const AdminNav = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const activeSection = SECTIONS.find((section) => pathname.startsWith(section.to)) ?? SECTIONS[0];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <nav className="flex flex-wrap gap-2">
          {SECTIONS.map((section) => (
            <LinkButton
              key={section.key}
              to={section.to}
              variant={section === activeSection ? 'primary' : 'ghost'}
              size="sm"
            >
              {t(section.labelKey)}
            </LinkButton>
          ))}
        </nav>

        <LinkButton to={activeSection.createTo} variant="success" size="sm">
          <i className="bi bi-plus-circle" aria-hidden="true" />
          {t(activeSection.createLabelKey)}
        </LinkButton>
      </div>

      <Outlet />
    </div>
  );
};

export default AdminNav;

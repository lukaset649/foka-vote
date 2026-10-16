import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router';
import LinkButton from './ui/LinkButton';
import SegmentedTabs from './ui/SegmentedTabs';

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
        <SegmentedTabs
          activeKey={activeSection.key}
          items={SECTIONS.map((section) => ({
            key: section.key,
            label: t(section.labelKey),
            to: section.to,
          }))}
        />

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

import { createBrowserRouter } from 'react-router';

import Layout from './components/Layout';
import RequireAdmin from './components/RequireAdmin';
import ContestsListPage from './pages/public/ContestsListPage';
import ContestPage from './pages/public/ContestPage';
import AccessGatePage from './pages/public/AccessGatePage';
import SubmissionFormPage from './pages/public/SubmissionFormPage';
import SubmissionPreviewPage from './pages/public/SubmissionPreviewPage';
import SubmissionConfirmationPage from './pages/public/SubmissionConfirmationPage';
import GalleryPage from './pages/public/GalleryPage';
import VoteCardPage from './pages/public/VoteCardPage';
import VoteConfirmationPage from './pages/public/VoteConfirmationPage';
import ResultsPage from './pages/public/ResultsPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminContestsListPage from './pages/admin/AdminContestsListPage';
import AdminContestFormPage from './pages/admin/AdminContestFormPage';
import AdminSubmissionsPage from './pages/admin/AdminSubmissionsPage';
import AdminSubmissionEditPage from './pages/admin/AdminSubmissionEditPage';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <ContestsListPage /> },
      { path: '/contest/:slug', element: <ContestPage /> },
      { path: '/contest/:slug/gate', element: <AccessGatePage /> },
      { path: '/contest/:slug/submit', element: <SubmissionFormPage /> },
      { path: '/contest/:slug/submit/preview', element: <SubmissionPreviewPage /> },
      { path: '/contest/:slug/submit/confirmation', element: <SubmissionConfirmationPage /> },
      { path: '/contest/:slug/gallery', element: <GalleryPage /> },
      { path: '/contest/:slug/vote', element: <VoteCardPage /> },
      { path: '/contest/:slug/vote/confirmation', element: <VoteConfirmationPage /> },
      { path: '/contest/:slug/results', element: <ResultsPage /> },
      { path: '/admin', element: <AdminLoginPage /> },
      { path: '/admin/login', element: <AdminLoginPage /> },
      {
        element: <RequireAdmin />,
        children: [
          { path: '/admin/contests', element: <AdminContestsListPage /> },
          { path: '/admin/contests/new', element: <AdminContestFormPage /> },
          { path: '/admin/contests/:id', element: <AdminContestFormPage /> },
          { path: '/admin/contests/:id/submissions', element: <AdminSubmissionsPage /> },
          {
            path: '/admin/contests/:id/submissions/:submissionId',
            element: <AdminSubmissionEditPage />,
          },
        ],
      },
    ],
  },
]);

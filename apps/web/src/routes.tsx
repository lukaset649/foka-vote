import { createBrowserRouter } from 'react-router';

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
  { path: '/', element: <ContestsListPage /> },
  { path: '/konkurs/:slug', element: <ContestPage /> },
  { path: '/konkurs/:slug/brama', element: <AccessGatePage /> },
  { path: '/konkurs/:slug/zgloszenie', element: <SubmissionFormPage /> },
  { path: '/konkurs/:slug/zgloszenie/podglad', element: <SubmissionPreviewPage /> },
  { path: '/konkurs/:slug/zgloszenie/potwierdzenie', element: <SubmissionConfirmationPage /> },
  { path: '/konkurs/:slug/galeria', element: <GalleryPage /> },
  { path: '/konkurs/:slug/glosowanie', element: <VoteCardPage /> },
  { path: '/konkurs/:slug/glosowanie/potwierdzenie', element: <VoteConfirmationPage /> },
  { path: '/konkurs/:slug/wyniki', element: <ResultsPage /> },
  { path: '/admin', element: <AdminLoginPage /> },
  { path: '/admin/logowanie', element: <AdminLoginPage /> },
  { path: '/admin/konkursy', element: <AdminContestsListPage /> },
  { path: '/admin/konkursy/nowy', element: <AdminContestFormPage /> },
  { path: '/admin/konkursy/:id', element: <AdminContestFormPage /> },
  { path: '/admin/konkursy/:id/zgloszenia', element: <AdminSubmissionsPage /> },
  { path: '/admin/konkursy/:id/zgloszenia/:submissionId', element: <AdminSubmissionEditPage /> },
]);

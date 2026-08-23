import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router';
import { fetchAdminSession } from '../services/adminAuth';

const RequireAdmin = () => {
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>(
    'checking',
  );

  useEffect(() => {
    let cancelled = false;

    fetchAdminSession()
      .then((ok) => {
        if (!cancelled) {
          setStatus(ok ? 'authenticated' : 'unauthenticated');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('unauthenticated');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'checking') {
    return <p>Loading…</p>;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
};

export default RequireAdmin;

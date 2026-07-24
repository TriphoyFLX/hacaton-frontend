import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import Layout from './Layout';
import ProtectedRoute from './ProtectedRoute';
import { useAuthStore } from '../store/authStore';

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-[#f0ede8]">
      Загрузка...
    </div>
  );
}

/**
 * /soundtok is public when `?v=` is present (shared video for guests).
 * Logged-in users get the normal Layout shell.
 */
export default function SoundTokGate({ children }: { children?: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  const [params] = useSearchParams();
  const location = useLocation();
  const sharedId = (params.get('v') || '').trim() || null;

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  if (!hydrated) return <Loading />;

  if (!token) {
    if (!sharedId) {
      const next = encodeURIComponent(`${location.pathname}${location.search || ''}`);
      return <Navigate to={`/login?next=${next}`} replace />;
    }
    return children ? <>{children}</> : <Outlet />;
  }

  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  );
}

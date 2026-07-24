import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/** Only allow in-app relative paths (block open redirects). */
function safeNextPath(pathname: string, search: string): string {
  const next = `${pathname}${search || ''}`;
  if (!next.startsWith('/') || next.startsWith('//')) return '/dashboard';
  return next;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = useAuthStore((state) => state.token);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const location = useLocation();
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  // Don't block first paint when we already have a persisted session
  const [checking, setChecking] = useState(() => !useAuthStore.getState().token);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }

    return useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;
    const hasSession = Boolean(useAuthStore.getState().token);

    if (hasSession) {
      setChecking(false);
      void checkAuth().finally(() => {
        if (!cancelled) setChecking(false);
      });
      return () => {
        cancelled = true;
      };
    }

    const verify = async () => {
      await checkAuth();
      if (!cancelled) setChecking(false);
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, [hydrated, checkAuth]);

  if (!hydrated || (checking && !token)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-[#f0ede8]">
        Загрузка...
      </div>
    );
  }

  if (!token) {
    const next = encodeURIComponent(safeNextPath(location.pathname, location.search));
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <>{children}</>;
}

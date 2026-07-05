import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = useAuthStore((state) => state.token);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  const [checking, setChecking] = useState(true);

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

    const verify = async () => {
      await checkAuth();
      if (!cancelled) {
        setChecking(false);
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [hydrated, checkAuth]);

  if (!hydrated || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-[#f0ede8]">
        Загрузка...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

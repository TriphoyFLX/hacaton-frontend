import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/** Blocks /admin for anyone who is not role=ADMIN (UI only — API still enforces). */
export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

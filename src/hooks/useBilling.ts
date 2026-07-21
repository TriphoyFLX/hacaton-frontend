import { useCallback, useEffect, useState } from 'react';
import { billingApi, type BillingSnapshot } from '../api/billing';
import { useAuthStore } from '../store/authStore';

export function useBilling() {
  const token = useAuthStore((s) => s.token);
  const [billing, setBilling] = useState<BillingSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!token) {
      setBilling(null);
      return null;
    }
    setLoading(true);
    setError('');
    try {
      const snap = await billingApi.me();
      setBilling(snap);
      return snap;
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Не удалось загрузить тариф');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { billing, loading, error, refresh };
}

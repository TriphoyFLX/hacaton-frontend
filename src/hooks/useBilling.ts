import { useCallback, useEffect, useState } from 'react';
import { billingApi, type BillingSnapshot } from '../api/billing';
import { useAuthStore } from '../store/authStore';

const BILLING_CACHE_TTL_MS = 30_000;
let billingCache: { value: BillingSnapshot; at: number } | null = null;
let billingInflight: Promise<BillingSnapshot | null> | null = null;

type BillingErrorLike = {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
};

export function useBilling() {
  const token = useAuthStore((s) => s.token);
  const [billing, setBilling] = useState<BillingSnapshot | null>(() => billingCache?.value ?? null);
  const [loading, setLoading] = useState(() => !billingCache?.value);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!token) {
      setBilling(null);
      billingCache = null;
      return null;
    }
    const cached = billingCache;
    if (cached && Date.now() - cached.at < BILLING_CACHE_TTL_MS) {
      setBilling(cached.value);
      setLoading(false);
      return cached.value;
    }
    setLoading(true);
    setError('');
    try {
      if (!billingInflight) {
        billingInflight = billingApi
          .me()
          .then((snap) => {
            billingCache = { value: snap, at: Date.now() };
            return snap;
          })
          .finally(() => {
            billingInflight = null;
          });
      }
      const snap = await billingInflight;
      if (!snap) return null;
      setBilling(snap);
      return snap;
    } catch (e) {
      const error = e as BillingErrorLike | undefined;
      setError(error?.response?.data?.error || error?.message || 'Не удалось загрузить тариф');
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

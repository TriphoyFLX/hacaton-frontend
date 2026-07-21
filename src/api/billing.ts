import { api } from './client';

export type PlanId = 'FREE' | 'PRO' | 'PLATINUM';

export type BillingSnapshot = {
  plan: PlanId;
  planExpiresAt: string | null;
  tokenBalance: number;
  vocalPresets: boolean;
  maxCloudProjects: number | null;
  maxCloudSavesPerDay: number | null;
  cloudProjectCount: number;
  midiSavesToday: number;
  midiSavesRemainingToday: number | null;
  canCreateCloudProject: boolean;
  canGenerateAi: boolean;
  generationsAvailable: number;
  tokensPerGeneration: number;
  catalog: Record<string, any>;
  tokenPacks: Record<string, any>;
};

export type PaymentKind = 'PLAN_PRO' | 'PLAN_PLATINUM' | 'TOKENS_400';

export const billingApi = {
  catalog: () => api.get('/billing/catalog').then((r) => r.data),
  me: () => api.get<BillingSnapshot>('/billing/me').then((r) => r.data),
  createPayment: (kind: PaymentKind, returnUrl?: string) =>
    api.post<{ paymentId: string; confirmationUrl: string | null; amountRub: number; kind: string }>(
      '/billing/create-payment',
      { kind, returnUrl },
    ).then((r) => r.data),
  syncPayment: (id: string) => api.get(`/billing/payments/${id}`).then((r) => r.data),
};

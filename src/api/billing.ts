import { api } from './client';

export type PlanId = 'FREE' | 'PRO' | 'PLATINUM';
export type TokenPackId = 'TOKENS_400' | 'TOKENS_800' | 'TOKENS_1200' | 'TOKENS_2400';

export type PlanCatalogItem = {
  id: PlanId;
  name: string;
  priceRub: number;
  maxCloudProjects: number | null;
  maxCloudSavesPerDay: number | null;
  monthlyTokens: number;
  vocalPresets: boolean;
  description: string;
};

export type TokenPackCatalogItem = {
  id: TokenPackId;
  name: string;
  tokens: number;
  priceRub: number;
  generations: number;
  description: string;
  badge: string | null;
};

export type BillingCatalog = {
  plans: Record<PlanId, PlanCatalogItem>;
  tokenPacks: Record<TokenPackId, TokenPackCatalogItem>;
  tokensPerGeneration: number;
  paymentsEnabled: boolean;
};

export type BillingSnapshot = {
  plan: PlanId;
  planExpiresAt: string | null;
  tokenBalance: number;
  vocalPresets: boolean;
  maxCloudProjects: number | null;
  maxCloudSavesPerDay: number | null;
  maxProjectBytes: number;
  cloudProjectCount: number;
  midiSavesToday: number;
  midiSavesRemainingToday: number | null;
  canCreateCloudProject: boolean;
  canGenerateAi: boolean;
  generationsAvailable: number;
  tokensPerGeneration: number;
  catalog: Record<PlanId, PlanCatalogItem>;
  tokenPacks: Record<TokenPackId, TokenPackCatalogItem>;
};

export type PaymentKind =
  | 'PLAN_PRO'
  | 'PLAN_PLATINUM'
  | 'TOKENS_400'
  | 'TOKENS_800'
  | 'TOKENS_1200'
  | 'TOKENS_2400';

export const billingApi = {
  catalog: () => api.get<BillingCatalog>('/billing/catalog').then((r) => r.data),
  me: () => api.get<BillingSnapshot>('/billing/me').then((r) => r.data),
  createPayment: (kind: PaymentKind, returnUrl?: string) =>
    api.post<{ paymentId: string; confirmationUrl: string | null; amountRub: number; kind: string }>(
      '/billing/create-payment',
      { kind, returnUrl },
    ).then((r) => r.data),
  syncPayment: (id: string) =>
    api
      .get<{
        payment: { id: string; status: string; kind?: string; amountRub?: number };
        billing?: BillingSnapshot;
      }>(`/billing/payments/${id}`)
      .then((r) => r.data),
};

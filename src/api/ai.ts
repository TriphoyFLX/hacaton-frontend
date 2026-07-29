import { api } from './client';

export type GenerateMusicPayload = {
  title: string;
  tags: string;
  prompt?: string;
  translate_input?: boolean;
  model?: 'v5.5';
};

export type GenerateMusicResponse = {
  id?: string | number;
  request_id?: string | number;
  tokenBalance?: number;
  tokensCharged?: number;
  [key: string]: unknown;
};

export const aiApi = {
  generateMusic: (payload: GenerateMusicPayload) =>
    api.post<GenerateMusicResponse>('/generate-music', payload).then((r) => r.data),
  checkGeneration: (id: string | number) =>
    api.get<Record<string, unknown>>(`/check-generation/${id}`).then((r) => r.data),
};

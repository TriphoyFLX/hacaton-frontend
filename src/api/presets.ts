import { API_ORIGIN, api } from './client';

export type PresetStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface PresetSeller {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
}

export interface Preset {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  priceCents: number;
  currency: string;
  tags: string[];
  status: PresetStatus;
  packageName?: string | null;
  packageSize?: number | null;
  previewUrl?: string | null;
  coverUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  seller?: PresetSeller;
  purchased?: boolean;
  isSeller?: boolean;
  _count?: { purchases: number };
}

export const presetMediaUrl = (url?: string | null) => url ? `${API_ORIGIN}${url}` : undefined;

export const presetsApi = {
  list: async (params?: { q?: string; tag?: string; sort?: string }) =>
    (await api.get<Preset[]>('/presets', { params })).data,
  get: async (id: string) => (await api.get<Preset>(`/presets/${id}`)).data,
  mine: async () => (await api.get<Preset[]>('/presets/mine')).data,
  library: async () => (await api.get<Preset[]>('/presets/library')).data,
  create: async (data: { title: string; description: string; priceCents: number; tags: string[] }) =>
    (await api.post<Preset>('/presets', data)).data,
  update: async (id: string, data: Partial<Pick<Preset, 'title' | 'description' | 'priceCents' | 'tags' | 'status'>>) =>
    (await api.patch<Preset>(`/presets/${id}`, data)).data,
  remove: async (id: string) => api.delete(`/presets/${id}`),
  uploadAssets: async (id: string, files: { package?: File; preview?: File; cover?: File }) => {
    const data = new FormData();
    if (files.package) data.append('package', files.package);
    if (files.preview) data.append('preview', files.preview);
    if (files.cover) data.append('cover', files.cover);
    return (await api.post<Preset>(`/presets/${id}/assets`, data)).data;
  },
  checkout: async (id: string) => (await api.post(`/presets/${id}/checkout`)).data,
  download: async (id: string) => {
    const response = await api.get(`/presets/${id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = '';
    link.click();
    URL.revokeObjectURL(url);
  },
};

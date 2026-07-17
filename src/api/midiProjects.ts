import api from './client';

export interface MidiProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredMidiProject extends MidiProjectSummary {
  data: Record<string, unknown>;
}

export const midiProjectsApi = {
  list: () => api.get<MidiProjectSummary[]>('/midi-projects'),
  get: (id: string) => api.get<StoredMidiProject>(`/midi-projects/${id}`),
  create: (name: string, data: Record<string, unknown>) =>
    api.post<StoredMidiProject>('/midi-projects', { name, data }),
  save: (id: string, name: string, data: Record<string, unknown>) =>
    api.put<StoredMidiProject>(`/midi-projects/${id}`, { name, data }),
  remove: (id: string) => api.delete(`/midi-projects/${id}`),
};

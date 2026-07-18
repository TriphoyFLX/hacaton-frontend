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

export interface MidiSampleUpload {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export const midiProjectsApi = {
  list: () => api.get<MidiProjectSummary[]>('/midi-projects'),
  get: (id: string) => api.get<StoredMidiProject>(`/midi-projects/${id}`),
  create: (name: string, data: Record<string, unknown>) =>
    api.post<StoredMidiProject>('/midi-projects', { name, data }),
  save: (id: string, name: string, data: Record<string, unknown>) =>
    api.put<StoredMidiProject>(`/midi-projects/${id}`, { name, data }),
  rename: (id: string, name: string) =>
    api.put<StoredMidiProject>(`/midi-projects/${id}`, { name }),
  remove: (id: string) => api.delete(`/midi-projects/${id}`),
  uploadSample: (projectId: string, file: File, sampleId?: string) => {
    const form = new FormData();
    form.append('sample', file, file.name);
    if (sampleId) form.append('sampleId', sampleId);
    return api.post<MidiSampleUpload>(`/midi-projects/${projectId}/samples`, form, {
      timeout: 120_000,
      transformRequest: [
        (data, headers) => {
          // Axios must not serialize FormData or force JSON content-type
          if (headers && typeof (headers as { delete?: (k: string) => void }).delete === 'function') {
            (headers as { delete: (k: string) => void }).delete('Content-Type');
          } else if (headers) {
            delete (headers as Record<string, unknown>)['Content-Type'];
          }
          return data;
        },
      ],
    });
  },
  downloadSample: (sampleId: string) =>
    api.get<ArrayBuffer>(`/midi-samples/${sampleId}`, { responseType: 'arraybuffer' }),
};

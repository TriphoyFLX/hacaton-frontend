import api from './client';

export type ReportReason =
  | 'BULLYING'
  | 'SCAM'
  | 'SPAM'
  | 'HARASSMENT'
  | 'HATE'
  | 'IMPERSONATION'
  | 'OTHER';

export type ReportStatus = 'OPEN' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

export const REPORT_REASON_OPTIONS: Array<{ id: ReportReason; label: string }> = [
  { id: 'BULLYING', label: 'Буллинг / травля' },
  { id: 'SCAM', label: 'Скам / мошенничество' },
  { id: 'SPAM', label: 'Спам' },
  { id: 'HARASSMENT', label: 'Домогательства' },
  { id: 'HATE', label: 'Ненависть / оскорбления' },
  { id: 'IMPERSONATION', label: 'Выдача себя за другого' },
  { id: 'OTHER', label: 'Другое' },
];

export const reportsApi = {
  create: async (payload: {
    reportedUserId: string;
    reason: ReportReason;
    details?: string;
  }) => {
    const { data } = await api.post('/reports', payload);
    return data as { report: { id: string; reason: ReportReason; status: ReportStatus } };
  },
};

export default reportsApi;

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

export const REPORT_REASON_OPTIONS: Array<{
  id: ReportReason;
  label: string;
  hint: string;
  detailsRequired?: boolean;
}> = [
  {
    id: 'BULLYING',
    label: 'Буллинг / травля',
    hint: 'Систематические оскорбления, травля, давление',
  },
  {
    id: 'SCAM',
    label: 'Скам / мошенничество',
    hint: 'Обман, вымогательство, фейковые сделки',
    detailsRequired: true,
  },
  {
    id: 'SPAM',
    label: 'Спам',
    hint: 'Массовые рассылки, реклама, навязчивые сообщения',
  },
  {
    id: 'HARASSMENT',
    label: 'Домогательства',
    hint: 'Нежелательные сообщения интимного характера',
  },
  {
    id: 'HATE',
    label: 'Ненависть / оскорбления',
    hint: 'Речь ненависти, дискриминация, угрозы',
  },
  {
    id: 'IMPERSONATION',
    label: 'Выдача себя за другого',
    hint: 'Фейковый профиль или подмена личности',
  },
  {
    id: 'OTHER',
    label: 'Другое',
    hint: 'Опишите ситуацию своими словами',
    detailsRequired: true,
  },
];

export const REPORT_STATUS_OPTIONS: Array<{
  id: ReportStatus;
  label: string;
  tone: 'open' | 'review' | 'ok' | 'muted';
}> = [
  { id: 'OPEN', label: 'Открыта', tone: 'open' },
  { id: 'REVIEWING', label: 'В работе', tone: 'review' },
  { id: 'RESOLVED', label: 'Решена', tone: 'ok' },
  { id: 'DISMISSED', label: 'Отклонена', tone: 'muted' },
];

export function reportReasonLabel(reason: string): string {
  return REPORT_REASON_OPTIONS.find((r) => r.id === reason)?.label || reason;
}

export function reportStatusLabel(status: string): string {
  return REPORT_STATUS_OPTIONS.find((s) => s.id === status)?.label || status;
}

export function mapReportApiError(error: unknown): string {
  const status = (error as { response?: { status?: number; data?: { error?: string } } })?.response
    ?.status;
  const raw =
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error || '';

  if (status === 409 || /already have an open report/i.test(raw)) {
    return 'У вас уже есть открытая жалоба на этого пользователя';
  }
  if (status === 429 || /Too many reports/i.test(raw)) {
    return 'Слишком много жалоб. Подождите около часа и попробуйте снова';
  }
  if (status === 401) {
    return 'Войдите в аккаунт, чтобы отправить жалобу';
  }
  if (/Cannot report yourself/i.test(raw)) {
    return 'Нельзя пожаловаться на себя';
  }
  if (/Cannot report an admin/i.test(raw)) {
    return 'На администраторов жалобы не принимаются';
  }
  if (/Details required/i.test(raw)) {
    return 'Для этой причины нужно кратко описать ситуацию';
  }
  if (raw && !/^[A-Za-z]/.test(raw)) return raw;
  return 'Не удалось отправить жалобу. Попробуйте ещё раз';
}

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

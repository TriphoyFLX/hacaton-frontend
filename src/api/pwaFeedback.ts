import api from './client';

export type PwaUninstallReason =
  | 'bugs'
  | 'slow'
  | 'dont_need'
  | 'prefer_browser'
  | 'privacy'
  | 'other';

export const pwaFeedbackApi = {
  submitUninstallFeedback: async (payload: {
    reason: PwaUninstallReason;
    details?: string;
  }): Promise<{ success: boolean }> => {
    const response = await api.post('/feedback/pwa-uninstall', {
      reason: payload.reason,
      details: payload.details?.trim() || undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      platform: typeof navigator !== 'undefined' ? navigator.platform : undefined,
      language: typeof navigator !== 'undefined' ? navigator.language : undefined,
    });
    return response.data;
  },
};

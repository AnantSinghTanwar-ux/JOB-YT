import { api } from '../lib/api';
import { APIResponse } from '../types';

export const analyticsService = {
  async getSummary(): Promise<APIResponse<{
    summary: {
      total_jobs: number;
      active_jobs: number;
      total_applications: number;
      total_hired: number;
      total_views: number;
    }
  }>> {
    const response = await api.get('/analytics/summary');
    return response.data;
  },

  async getApplicationsByDay(): Promise<APIResponse<any>> {
    const response = await api.get('/analytics/applications-by-day');
    return response.data;
  },

  async getCreditUsage(): Promise<APIResponse<any>> {
    const response = await api.get('/analytics/credit-usage');
    return response.data;
  },
};

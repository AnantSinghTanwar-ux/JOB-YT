import { api } from '../lib/api';
import { APIResponse } from '../types';

export const interviewService = {
  async startSession(payload: {
    roleTitle: string;
    jobDescription?: string;
    questionCount?: number;
  }): Promise<APIResponse<any>> {
    const response = await api.post<APIResponse<any>>('/interviews/sessions', payload);
    return response.data;
  },

  async listSessions(): Promise<APIResponse<any[]>> {
    const response = await api.get<APIResponse<any[]>>('/interviews/sessions');
    return response.data;
  },

  async getSession(id: string): Promise<APIResponse<any>> {
    const response = await api.get<APIResponse<any>>(`/interviews/sessions/${id}`);
    return response.data;
  },

  async submitResponse(
    sessionId: string,
    payload: {
      questionId: string;
      responseText: string;
    }
  ): Promise<APIResponse<any>> {
    const response = await api.post<APIResponse<any>>(`/interviews/sessions/${sessionId}/submit`, payload);
    return response.data;
  },

  async completeSession(sessionId: string): Promise<APIResponse<any>> {
    const response = await api.post<APIResponse<any>>(`/interviews/sessions/${sessionId}/complete`);
    return response.data;
  },

  async getReport(sessionId: string): Promise<APIResponse<any>> {
    const response = await api.get<APIResponse<any>>(`/interviews/sessions/${sessionId}/report`);
    return response.data;
  },

  async getReadiness(): Promise<APIResponse<any>> {
    const response = await api.get<APIResponse<any>>('/interviews/readiness');
    return response.data;
  },
};
export default interviewService;

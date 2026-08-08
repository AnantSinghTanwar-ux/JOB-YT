import { api } from '../lib/api';
import { APIResponse, Application } from '../types';

export const applicationService = {
  async getMyApplications(): Promise<APIResponse<Application[]>> {
    const response = await api.get<APIResponse<Application[]>>('/applications/my');
    return response.data;
  },

  async getMyApplicationsFiltered(params: { status?: string; jobTitle?: string }): Promise<APIResponse<Application[]>> {
    const response = await api.get<APIResponse<Application[]>>('/applications/my/filtered', { params });
    return response.data;
  },

  async getApplicationStats(): Promise<APIResponse<any>> {
    const response = await api.get<APIResponse<any>>('/applications/my/stats');
    return response.data;
  },

  async checkApplication(jobId: string): Promise<APIResponse<{ applied: boolean }>> {
    const response = await api.get<APIResponse<{ applied: boolean }>>(`/applications/jobs/${jobId}/check`);
    return response.data;
  },

  async applyToJob(
    jobId: string,
    payload: {
      resume_id: string;
      cover_letter?: string;
      answers?: { question_id: string; answer: string }[];
    }
  ): Promise<APIResponse<Application>> {
    const response = await api.post<APIResponse<Application>>(`/applications/jobs/${jobId}`, payload);
    return response.data;
  },

  async getPipelineEvents(applicationId: string): Promise<APIResponse<any[]>> {
    const response = await api.get<APIResponse<any[]>>(`/applications/${applicationId}/events`);
    return response.data;
  },

  // Recruiter methods
  async getJobApplications(jobId: string): Promise<APIResponse<Application[]>> {
    const response = await api.get<APIResponse<Application[]>>(`/applications/jobs/${jobId}`);
    return response.data;
  },

  async updateApplicationStatus(applicationId: string, status: string): Promise<APIResponse<any>> {
    const response = await api.patch(`/applications/${applicationId}/status`, { status });
    return response.data;
  },

  async getRecruiterApplicants(params?: { limit?: number; page?: number }): Promise<APIResponse<any[]>> {
    const response = await api.get('/applications/recruiter/applicants', { params });
    return response.data;
  },

  async getRecruiterApplicantsStats(): Promise<APIResponse<any>> {
    const response = await api.get('/applications/recruiter/applicants/stats');
    return response.data;
  },

  async getResumeUrl(applicationId: string): Promise<APIResponse<{ url: string }>> {
    const response = await api.get<APIResponse<{ url: string }>>(`/applications/${applicationId}/resume-url`);
    return response.data;
  },
};

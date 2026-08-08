import { api } from '../lib/api';
import { APIResponse, Job } from '../types';

export const jobService = {
  async getJobs(params: {
    q?: string;
    type?: string;
    location?: string;
    salary_min?: number;
    salary_max?: number;
    skills?: string;
    page?: number;
    limit?: number;
  }): Promise<APIResponse<{ jobs: Job[]; total: number; page: number; limit: number }>> {
    const response = await api.get('/jobs', { params });
    return response.data;
  },

  async getJobById(id: string): Promise<APIResponse<{ job: Job } | Job>> {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },

  async getSavedJobs(): Promise<APIResponse<Job[]>> {
    const response = await api.get<APIResponse<Job[]>>('/users/me/saved-jobs');
    return response.data;
  },

  async saveJob(jobId: string): Promise<APIResponse<any>> {
    const response = await api.post(`/users/me/saved-jobs/${jobId}`);
    return response.data;
  },

  async unsaveJob(jobId: string): Promise<APIResponse<any>> {
    const response = await api.delete(`/users/me/saved-jobs/${jobId}`);
    return response.data;
  },

  // Recruiter methods
  async getMyJobListings(params?: { limit?: number; page?: number }): Promise<APIResponse<Job[]>> {
    const response = await api.get('/jobs/my/listings', { params });
    return response.data;
  },

  async createJob(payload: {
    title: string;
    description: string;
    type: string;
    location: string;
    salary_min?: number;
    salary_max?: number;
    skills?: string[];
    requirements?: string;
  }): Promise<APIResponse<Job>> {
    const response = await api.post('/jobs', payload);
    return response.data;
  },

  async updateJob(id: string, payload: Partial<{
    title: string;
    description: string;
    type: string;
    location: string;
    salary_min: number;
    salary_max: number;
    skills: string[];
    requirements: string;
  }>): Promise<APIResponse<Job>> {
    const response = await api.put(`/jobs/${id}`, payload);
    return response.data;
  },

  async publishJob(id: string): Promise<APIResponse<any>> {
    const response = await api.patch(`/jobs/${id}/publish`, {});
    return response.data;
  },

  async deleteJob(id: string): Promise<APIResponse<any>> {
    const response = await api.delete(`/jobs/${id}`);
    return response.data;
  },
};

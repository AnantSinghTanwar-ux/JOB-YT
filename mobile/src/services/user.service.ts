import { api } from '../lib/api';
import { APIResponse, Resume } from '../types';

export interface ProfileData {
  name?: string | null;
  phone?: string | null;
  bio?: string | null;
  portfolio_url?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  skills?: string[];
  experience?: any[];
  education?: any[];
}

export interface UserProfileResponse {
  email: string;
  role: string;
  credit_balance: number;
  referral_code?: string;
  profile: ProfileData & { photo_url?: string | null; logo_url?: string | null; resume_url?: string | null };
  completeness: number;
}

export const userService = {
  async getProfile(): Promise<APIResponse<UserProfileResponse>> {
    const response = await api.get<APIResponse<UserProfileResponse>>('/users/me');
    return response.data;
  },

  async updateProfile(payload: ProfileData): Promise<APIResponse<any>> {
    const response = await api.put<APIResponse<any>>('/users/me', payload);
    return response.data;
  },

  async uploadPhoto(formData: FormData): Promise<APIResponse<{ url: string }>> {
    const response = await api.post<APIResponse<{ url: string }>>('/users/me/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async uploadResume(formData: FormData): Promise<APIResponse<{ resume: { id: string; file_url: string; created_at: string } }>> {
    const response = await api.post<APIResponse<{ resume: { id: string; file_url: string; created_at: string } }>>('/users/me/resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async setDefaultResume(resumeId: string): Promise<APIResponse<any>> {
    const response = await api.patch<APIResponse<any>>(`/users/me/resumes/${resumeId}/set-default`, {});
    return response.data;
  },

  async deleteResume(resumeId: string): Promise<APIResponse<any>> {
    const response = await api.delete<APIResponse<any>>(`/users/me/resumes/${resumeId}`);
    return response.data;
  },

  // Recruiter Profile methods
  async getRecruiterProfile(): Promise<APIResponse<any>> {
    const response = await api.get<APIResponse<any>>('/recruiter/profile');
    return response.data;
  },

  async updateRecruiterProfile(payload: {
    companyName?: string;
    company_email?: string;
    industry?: string;
    description?: string;
    company_size?: string;
    website?: string;
    location?: string;
    logo_url?: string;
  }): Promise<APIResponse<any>> {
    const response = await api.put<APIResponse<any>>('/recruiter/profile', payload);
    return response.data;
  },

  async createRecruiterProfile(payload: {
    companyName: string;
    company_email?: string;
    industry?: string;
    description?: string;
    company_size?: string;
    website?: string;
    location?: string;
  }): Promise<APIResponse<any>> {
    const response = await api.post<APIResponse<any>>('/recruiter/profile', payload);
    return response.data;
  },

  async uploadLogo(formData: FormData): Promise<APIResponse<{ url: string }>> {
    const response = await api.post<APIResponse<{ url: string }>>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

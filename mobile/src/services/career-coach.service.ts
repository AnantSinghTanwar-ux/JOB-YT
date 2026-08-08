import { api } from '../lib/api';
import { APIResponse, Resume } from '../types';

export const careerCoachService = {
  async getMyResumes(): Promise<APIResponse<{ resumes: Resume[] }>> {
    const response = await api.get<APIResponse<{ resumes: Resume[] }>>('/users/me/resumes');
    return response.data;
  },

  async uploadAndParseResume(formData: FormData): Promise<APIResponse<any>> {
    const response = await api.post<APIResponse<any>>('/users/me/resume-parse', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async analyzeATS(resumeData: any, jobData: any): Promise<APIResponse<any>> {
    const response = await api.post<APIResponse<any>>('/ai/analyze-ats', {
      resumeData,
      jobData,
    });
    return response.data;
  },

  async matchWorkflow(payload: {
    userSkills: string[];
    jobSkills: string[];
    resumeText?: string;
    jobDescription?: string;
  }): Promise<APIResponse<any>> {
    const response = await api.post<APIResponse<any>>('/ai/match-workflow', payload);
    return response.data;
  },

  async getSkillGap(userSkills: string[], requiredSkills: string[]): Promise<APIResponse<any>> {
    const response = await api.post<APIResponse<any>>('/jobs/skill-gap', {
      userSkills,
      requiredSkills,
    });
    return response.data;
  },

  async scoreATS(payload: {
    resume_id?: string;
    resumeText?: string;
    jobDescription: string;
  }): Promise<APIResponse<any>> {
    const response = await api.post<APIResponse<any>>('/users/me/resume-score', payload);
    return response.data;
  },

  async orchestrate(type: string, data: any): Promise<APIResponse<any>> {
    const response = await api.post<APIResponse<any>>('/ai/orchestrate', {
      type,
      data,
    });
    return response.data;
  },

  async listCoachSessions(): Promise<APIResponse<any[]>> {
    const response = await api.get<APIResponse<any[]>>('/coach/sessions');
    return response.data;
  },

  async startCoachSession(payload: any): Promise<APIResponse<any>> {
    if (payload instanceof FormData) {
      const response = await api.post<APIResponse<any>>('/coach/sessions', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    }
    const response = await api.post<APIResponse<any>>('/coach/sessions', payload);
    return response.data;
  },

  async getCoachSession(id: string): Promise<APIResponse<any>> {
    const response = await api.get<APIResponse<any>>(`/coach/sessions/${id}`);
    return response.data;
  },

  async sendCoachMessage(id: string, message: string): Promise<APIResponse<any>> {
    const response = await api.post<APIResponse<any>>(`/coach/sessions/${id}/messages`, { message });
    return response.data;
  },

  async submitMessageFeedback(messageId: string, feedback: 'up' | 'down', comment?: string): Promise<APIResponse<any>> {
    const response = await api.post<APIResponse<any>>(`/coach/messages/${messageId}/feedback`, {
      feedback,
      comment,
    });
    return response.data;
  },
};

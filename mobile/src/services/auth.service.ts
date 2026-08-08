import { api } from '../lib/api';
import { AuthResponse, User, UserPreferences, APIResponse } from '../types';

export const authService = {
  async login(payload: any): Promise<AuthResponse> {
    const response = await api.post<APIResponse<AuthResponse>>('/auth/login', payload);
    return response.data.data;
  },

  async register(payload: any): Promise<AuthResponse> {
    const response = await api.post<APIResponse<AuthResponse>>('/auth/register', payload);
    return response.data.data;
  },

  async googleLogin(idToken: string): Promise<AuthResponse> {
    const response = await api.post<APIResponse<AuthResponse>>('/auth/google', { idToken });
    return response.data.data;
  },

  async logout(refreshToken?: string): Promise<void> {
    await api.post('/auth/logout', { refreshToken });
  },

  async forgotPassword(email: string): Promise<any> {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  async getMe(): Promise<APIResponse<User>> {
    const response = await api.get<APIResponse<User>>('/auth/me');
    return response.data;
  },

  async getPreferences(): Promise<APIResponse<UserPreferences>> {
    const response = await api.get<APIResponse<UserPreferences>>('/users/me/preferences');
    return response.data;
  },

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<APIResponse<UserPreferences>> {
    const response = await api.put<APIResponse<UserPreferences>>('/users/me/preferences', preferences);
    return response.data;
  },
};

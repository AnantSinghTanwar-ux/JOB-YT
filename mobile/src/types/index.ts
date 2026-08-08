import { Role, ApplicationStatus } from '../constants';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_verified: boolean;
  phone?: string;
  bio?: string;
  skills?: string[];
  experience?: any[];
  education?: any[];
  created_at: string;
}

export interface UserPreferences {
  email_alerts_enabled: boolean;
  whatsapp_alerts_enabled: boolean;
  push_alerts_enabled: boolean;
}

export interface Resume {
  id: string;
  user_id: string;
  filename: string;
  file_url: string;
  parsed_data?: {
    skills?: string[];
    experience?: any[];
    education?: any[];
    summary?: string;
  };
  created_at: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  skills: string[];
  created_at: string;
  is_saved?: boolean;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  cover_letter?: string;
  resume_id: string;
  created_at: string;
  updated_at: string;
  job: Job;
}

export interface CreditBalance {
  balance: number;
  user_id: string;
}

export interface CreditLedgerEntry {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface APIResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

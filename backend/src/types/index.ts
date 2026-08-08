import type { RecruiterProfile } from '../models/recruiterProfile.model';
import type { ApiKey } from '../models/apiKey.model';

export type UserRole = 'applicant' | 'recruiter' | 'admin';

export interface JwtPayload {
  userId: string;
  email: string | null;
  role: UserRole;
}

export interface ApiKeyPayload {
  apiKeyId: string;
  userId: string;
  email: string | null;
  role: UserRole;
  scopes: string[];
}

export type ApiKeyScope = string;

export interface AuthRequest extends Express.Request {
  user?: JwtPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      employer?: RecruiterProfile;
      apiKey?: ApiKey;
    }
  }
}

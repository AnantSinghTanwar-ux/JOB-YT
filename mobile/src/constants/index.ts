export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export const COLORS = {
  primary: '#c3ff3d', // Brand primary (lime)
  primaryLight: '#d9ff66',
  secondary: '#2563eb', // Brand blue
  background: '#fcfcfc', // Light page background
  card: '#ffffff', // White card background
  text: '#0b1120', // Dark text color
  textMuted: '#64748b', // Slate 500
  border: '#e2e8f0', // Slate 200
  error: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  coral: '#ff6b6b', // Brand Coral
};

export const ROUTES = {
  auth: {
    login: '/(auth)/login',
    register: '/(auth)/register',
    forgotPassword: '/(auth)/forgot-password',
  },
  tabs: {
    home: '/(tabs)/home',
    jobs: '/(tabs)/jobs',
    applications: '/(tabs)/applications',
    careerCoach: '/(tabs)/career-coach',
    profile: '/(tabs)/profile',
  },
};

export enum Role {
  APPLICANT = 'applicant',
  RECRUITER = 'recruiter',
}

export enum ApplicationStatus {
  APPLIED = 'applied',
  IN_REVIEW = 'in_review',
  SHORTLISTED = 'shortlisted',
  INTERVIEW = 'interview',
  OFFER = 'offer',
  HIRED = 'hired',
  REJECTED = 'rejected',
}

export enum NotificationType {
  JOB_MATCH = 'job_match',
  APPLICATION_STATUS = 'application_status',
  NEW_MESSAGE = 'new_message',
  REFERRAL_JOINED = 'referral_joined',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILURE = 'payment_failure',
  LOW_CREDIT = 'low_credit',
}

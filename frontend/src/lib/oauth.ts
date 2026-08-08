import { api } from '@/lib/api';
import { AuthTokens, AuthUser } from '@/types';

export type OAuthProvider = 'google' | 'github' | 'linkedin';

const OAUTH_STATE_KEY_PREFIX = 'oauth_state';
const OAUTH_REFERRAL_KEY = 'oauth_referral_code';
const OAUTH_ROLE_KEY = 'oauth_role';
const OAUTH_REDIRECT_KEY = 'oauth_redirect_target';
const OAUTH_PURPOSE_KEY = 'oauth_purpose';

export interface OAuthResponseData {
  user?: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
  };
  requiresEmail?: boolean;
  requiresVerification?: boolean;
}

export interface ParsedOAuthResult {
  user?: AuthUser;
  tokens?: AuthTokens;
  requiresEmail: boolean;
  requiresVerification: boolean;
}

export const readPublicEnv = (name: string): string | undefined => {
  const publicEnv: Record<string, string | undefined> = {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_GITHUB_CLIENT_ID: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
    NEXT_PUBLIC_LINKEDIN_CLIENT_ID: process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID,
    NEXT_PUBLIC_OAUTH_REDIRECT_URI: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI,
  };

  return publicEnv[name];
};

export const parseOAuthResponse = (payload: OAuthResponseData | undefined): ParsedOAuthResult => {
  const accessToken = payload?.accessToken ?? payload?.tokens?.accessToken;
  const refreshToken = payload?.refreshToken ?? payload?.tokens?.refreshToken;

  const hasTokens = Boolean(accessToken && refreshToken);

  return {
    user: payload?.user,
    tokens: hasTokens
      ? {
          accessToken: accessToken as string,
          refreshToken: refreshToken as string,
        }
      : undefined,
    requiresEmail: Boolean(payload?.requiresEmail),
    requiresVerification: Boolean(payload?.requiresVerification),
  };
};

export const getOAuthRedirectUri = (provider?: string) => {
  if (typeof window === 'undefined') return '';
  const fallback = `${window.location.origin}/oauth/callback`;
  const configured = readPublicEnv('NEXT_PUBLIC_OAUTH_REDIRECT_URI');

  if (!configured) return fallback;

  try {
    const configuredUrl = new URL(configured);
    const currentHost = window.location.hostname.toLowerCase();
    const configuredHost = configuredUrl.hostname.toLowerCase();
    const runningOnLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';
    const configuredIsLocalhost = configuredHost === 'localhost' || configuredHost === '127.0.0.1';

    // Prevent stale production builds from using localhost OAuth callbacks.
    if (!runningOnLocalhost && configuredIsLocalhost) {
      return fallback;
    }
  } catch {
    return fallback;
  }

  const finalUrl = configured || fallback;
  if (provider) {
    return `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}provider=${provider}`;
  }
  return finalUrl;
};

export const saveOAuthState = (provider: Exclude<OAuthProvider, 'google'>, state: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${OAUTH_STATE_KEY_PREFIX}:${provider}`, state);
};

export const readOAuthState = (provider: Exclude<OAuthProvider, 'google'>) => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`${OAUTH_STATE_KEY_PREFIX}:${provider}`);
};

export const clearOAuthState = (provider: Exclude<OAuthProvider, 'google'>) => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${OAUTH_STATE_KEY_PREFIX}:${provider}`);
};

export const saveOAuthReferralCode = (referralCode?: string) => {
  if (typeof window === 'undefined') return;
  if (referralCode?.trim()) {
    localStorage.setItem(OAUTH_REFERRAL_KEY, referralCode.trim());
    return;
  }
  localStorage.removeItem(OAUTH_REFERRAL_KEY);
};

export const getOAuthReferralCode = () => {
  if (typeof window === 'undefined') return undefined;
  const value = localStorage.getItem(OAUTH_REFERRAL_KEY);
  return value?.trim() ? value.trim() : undefined;
};

export const clearOAuthReferralCode = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OAUTH_REFERRAL_KEY);
};

export const saveOAuthRole = (role?: 'applicant' | 'recruiter') => {
  if (typeof window === 'undefined') return;
  if (role && (role === 'applicant' || role === 'recruiter')) {
    localStorage.setItem(OAUTH_ROLE_KEY, role);
    return;
  }
  localStorage.removeItem(OAUTH_ROLE_KEY);
};

export const getOAuthRole = () => {
  if (typeof window === 'undefined') return undefined;
  const value = localStorage.getItem(OAUTH_ROLE_KEY);
  if (value === 'applicant' || value === 'recruiter') return value;
  return undefined;
};

export const clearOAuthRole = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OAUTH_ROLE_KEY);
};

export const saveOAuthRedirectTarget = (target?: string | null) => {
  if (typeof window === 'undefined') return;
  if (target?.trim()) {
    localStorage.setItem(OAUTH_REDIRECT_KEY, target.trim());
    return;
  }
  localStorage.removeItem(OAUTH_REDIRECT_KEY);
};

export const getOAuthRedirectTarget = () => {
  if (typeof window === 'undefined') return undefined;
  const value = localStorage.getItem(OAUTH_REDIRECT_KEY);
  return value?.trim() ? value.trim() : undefined;
};

export const clearOAuthRedirectTarget = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OAUTH_REDIRECT_KEY);
};

export const saveOAuthPurpose = (purpose?: string | null) => {
  if (typeof window === 'undefined') return;
  if (purpose?.trim()) {
    localStorage.setItem(OAUTH_PURPOSE_KEY, purpose.trim());
    return;
  }
  localStorage.removeItem(OAUTH_PURPOSE_KEY);
};

export const getOAuthPurpose = () => {
  if (typeof window === 'undefined') return undefined;
  return localStorage.getItem(OAUTH_PURPOSE_KEY) || undefined;
};

export const clearOAuthPurpose = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OAUTH_PURPOSE_KEY);
};

const buildState = () => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
};

export const beginOAuthRedirect = async (
  provider: Exclude<OAuthProvider, 'google'>,
  referralCode?: string,
  role?: 'applicant' | 'recruiter',
  redirectTarget?: string | null,
) => {
  console.log('[beginOAuthRedirect] Starting OAuth flow with role:', role);
  const state = buildState();
  // GitHub does NOT allow query strings in registered callback URLs.
  // Pass `undefined` so the redirect_uri is the plain callback URL (e.g. /oauth/callback),
  // which can be registered in the GitHub OAuth App settings.
  // Provider is identified in the callback via the `state` parameter stored in localStorage.
  const callbackWithProvider = provider === 'github'
    ? getOAuthRedirectUri()
    : getOAuthRedirectUri(provider === 'linkedin' ? undefined : provider);
  const redirectUri = encodeURIComponent(callbackWithProvider);

  saveOAuthState(provider, state);
  saveOAuthReferralCode(referralCode);
  saveOAuthRole(role);
  saveOAuthRedirectTarget(redirectTarget);
  console.log('[beginOAuthRedirect] Metadata saved to localStorage:', { role, redirectTarget });

  await api.post('/auth/oauth/state', { provider, state });

  if (provider === 'github') {
    const clientId = readPublicEnv('NEXT_PUBLIC_GITHUB_CLIENT_ID');
    if (!clientId) throw new Error('GitHub OAuth is not configured. Missing NEXT_PUBLIC_GITHUB_CLIENT_ID.');

    const url = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&scope=user:email&state=${encodeURIComponent(state)}&redirect_uri=${redirectUri}`;
    window.location.href = url;
    return;
  }

  const clientId = readPublicEnv('NEXT_PUBLIC_LINKEDIN_CLIENT_ID');
  if (!clientId || clientId === 'your_linkedin_client_id') {
    throw new Error('LinkedIn OAuth is not configured. Please define NEXT_PUBLIC_LINKEDIN_CLIENT_ID in your frontend .env.local file.');
  }

  const scope = encodeURIComponent('openid profile email');
  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${encodeURIComponent(clientId)}&state=${encodeURIComponent(state)}&redirect_uri=${redirectUri}&scope=${scope}`;
  window.location.href = url;
};

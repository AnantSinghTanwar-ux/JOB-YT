'use client';

import { signIn } from 'next-auth/react';
import { saveOAuthReferralCode, saveOAuthRole } from '@/lib/oauth';
import { ROUTES } from '@/constants';
import { AuthTokens, AuthUser } from '@/types';
import { OAuthButton } from './OAuthButton';

interface GoogleLoginButtonProps {
  referralCode?: string;
  role?: 'applicant' | 'recruiter';
  disabled?: boolean;
  className?: string;
  onStart?: () => void;
  onComplete?: () => void;
  onSuccess: (tokens: AuthTokens, user: AuthUser) => void;
  onRequiresEmail?: () => void;
  onRequiresVerification?: () => void;
  onError: (message: string) => void;
  redirectTarget?: string | null;
}

const GoogleIcon = () => (
  <img
    src="/google-icon.svg"
    alt=""
    aria-hidden="true"
    className="h-5 w-5 object-contain"
  />
);

export function GoogleLoginButton({
  referralCode,
  role,
  disabled,
  className,
  onStart,
  onComplete,
  onError,
  redirectTarget,
}: GoogleLoginButtonProps) {
  const handleClick = async () => {
    onStart?.();
    try {
      saveOAuthRole(role);
      saveOAuthReferralCode(referralCode);
      const { saveOAuthRedirectTarget } = await import('@/lib/oauth');
      saveOAuthRedirectTarget(redirectTarget);
      await signIn('google', { callbackUrl: ROUTES.oauthGoogleBridge });
    } catch {
      onError('Login failed. Please try again.');
    } finally {
      onComplete?.();
    }
  };

  return (
    <OAuthButton
      icon={<GoogleIcon />}
      label="Google"
      variant="google"
      disabled={disabled}
      onClick={handleClick}
      className={className}
    />
  );
}

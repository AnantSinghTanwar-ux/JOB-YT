'use client';

import { useEffect, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, Spinner, Button } from '@/components/ui';
import { ROUTES } from '@/constants';
import { api } from '@/lib/api';
import {
  clearOAuthReferralCode,
  clearOAuthRole,
  getOAuthReferralCode,
  getOAuthRole,
  getOAuthRedirectTarget,
  clearOAuthRedirectTarget,
  OAuthResponseData,
  parseOAuthResponse,
} from '@/lib/oauth';
import { useAuthStore } from '@/store/auth.store';

type SessionWithGoogleToken = {
  googleIdToken?: string;
};

export default function GoogleBridgePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const setSession = useAuthStore((s) => s.setSession);
  
  const [bridgeStatus, setBridgeStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [error, setError] = useState('');
  const runStarted = useRef(false);

  useEffect(() => {
    // If already started or still loading session, do nothing
    if (status === 'loading' || runStarted.current) return;

    // If session is missing and we haven't succeeded yet, it's an error
    if (status === 'unauthenticated' && bridgeStatus !== 'success') {
      setBridgeStatus('error');
      setError('Authentication session expired or not found. Please try again.');
      return;
    }

    const run = async () => {
      if (status !== 'authenticated' || runStarted.current) return;
      runStarted.current = true;
      setBridgeStatus('loading');

      try {
        const googleIdToken = (session as SessionWithGoogleToken | null)?.googleIdToken;
        if (!googleIdToken) {
          throw new Error('Google login session is missing token. Please try again.');
        }

        const role = getOAuthRole();
        const referralCode = getOAuthReferralCode();

        const res = await api.post('/auth/google', {
          idToken: googleIdToken,
          ...(referralCode ? { referralCode } : {}),
          ...(role ? { role } : {}),
        });

        clearOAuthRole();
        clearOAuthReferralCode();

        const parsed = parseOAuthResponse(res.data as OAuthResponseData);
        if (!parsed.tokens || !parsed.user) {
          throw new Error('Login failed. Please try again.');
        }

        // 1. Update our own auth store
        setSession(parsed.tokens.accessToken, parsed.tokens.refreshToken, parsed.user);
        
        // 2. Mark as success BEFORE signing out of next-auth
        // This ensures the UI stays in loading/success state during the transition
        setBridgeStatus('success');

        // 3. Clear next-auth session
        await signOut({ redirect: false });

        // 4. Redirect to appropriate destination
        if (parsed.requiresEmail || !parsed.user.email) {
          router.replace(ROUTES.addEmail);
          return;
        }

        if (parsed.requiresVerification) {
          router.replace(`${ROUTES.verifyEmail}?pending=1`);
          return;
        }

        const redirectTarget = getOAuthRedirectTarget();
        clearOAuthRedirectTarget();

        const defaultDestination =
          parsed.user.role === 'recruiter'
            ? ROUTES.recruiterDashboard
            : parsed.user.role === 'admin'
              ? ROUTES.adminDashboard
              : ROUTES.dashboard;

        router.replace(redirectTarget || defaultDestination);
      } catch (err) {
        runStarted.current = false; // Allow retry on error
        clearOAuthRole();
        clearOAuthReferralCode();
        setBridgeStatus('error');
        setError(err instanceof Error ? err.message : 'Google login failed. Please try again.');
        // Don't sign out on error unless you want to completely reset the flow
      }
    };

    void run();
  }, [router, session, setSession, status, bridgeStatus]);

  if (bridgeStatus === 'loading' || bridgeStatus === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardBody className="p-8 text-center">
            <Spinner className="mx-auto mb-4" />
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              {bridgeStatus === 'success' ? 'Redirecting...' : 'Completing Google login'}
            </h2>
            <p className="text-sm text-gray-500">
              {bridgeStatus === 'success' ? 'Taking you to your dashboard...' : 'Finalizing secure sign in...'}
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardBody className="p-8 text-center">
          <div className="mb-3 text-4xl">⚠️</div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Google login failed</h2>
          <p className="mb-6 text-sm text-gray-500">
            {error || 'Authentication session expired. Please try again.'}
          </p>
          <Button onClick={() => router.replace(ROUTES.login)} className="w-full">
            Back to Sign In
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}


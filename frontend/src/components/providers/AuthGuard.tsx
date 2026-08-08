'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useSocket } from '@/hooks/useSocket';
import { UserRole } from '@/types';
import { Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, isAuthenticated, loading } = useAuthStore();
  useSocket();
  const router = useRouter();
  const pathname = usePathname();
  const isEmployerArea = pathname.startsWith('/recruiter') || pathname.startsWith('/admin');
  const unauthenticatedRoute = isEmployerArea ? ROUTES.employerLogin : ROUTES.login;

  const hasEmail = Boolean(user?.email);
  const isEmailFlowPage = pathname === ROUTES.addEmail || pathname === ROUTES.verifyEmail;
  const isVerified = user?.email_verified !== false;

  const routeByRole = (role: UserRole) =>
    role === 'recruiter'
      ? ROUTES.recruiterDashboard
      : role === 'admin'
        ? ROUTES.adminDashboard
        : ROUTES.dashboard;

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isAuthenticated) {
      const currentPath = window.location.pathname + window.location.search;
      router.replace(`${unauthenticatedRoute}?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    // Safety net: authenticated OAuth users with missing email must complete email first.
    if (user && !hasEmail && !isEmailFlowPage) {
      router.replace(ROUTES.addEmail);
      return;
    }

    if (user && hasEmail && !isVerified && pathname !== ROUTES.verifyEmail) {
      router.replace(`${ROUTES.verifyEmail}?pending=1`);
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.replace(routeByRole(user.role));
    }
  }, [loading, isAuthenticated, user, hasEmail, isVerified, isEmailFlowPage, pathname, allowedRoles, router, unauthenticatedRoute]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (user && !hasEmail && !isEmailFlowPage) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (user && hasEmail && !isVerified && pathname !== ROUTES.verifyEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}

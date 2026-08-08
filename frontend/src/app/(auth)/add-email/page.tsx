'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { ROUTES } from '@/constants';
import { Card, CardBody, Button, Input } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { AuthUser } from '@/types';

export default function AddEmailPage() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const routeByRole = (user: AuthUser) =>
    user.role === 'recruiter'
      ? ROUTES.recruiterDashboard
      : user.role === 'admin'
        ? ROUTES.adminDashboard
        : ROUTES.dashboard;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post<{ requiresVerification?: boolean; user?: AuthUser }>(
        '/auth/add-email',
        { email },
      );

      if (res.data?.requiresVerification) {
        router.push(`${ROUTES.verifyEmail}?pending=1`);
        return;
      }

      const resolvedUser = res.data?.user ?? currentUser;
      if (resolvedUser) {
        router.push(routeByRole(resolvedUser));
        return;
      }

      router.push(ROUTES.dashboard);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'EMAIL_ALREADY_IN_USE') {
          setError('This email is already registered. Try another email.');
        } else if (err.code === 'INVALID_EMAIL' || err.code === 'VALIDATION_ERROR') {
          setError('Please enter a valid email address.');
        } else if (err.code === 'RATE_LIMITED') {
          setError('Too many attempts. Please wait a minute and try again.');
        } else {
          setError(err.message || 'Failed to add email. Please try again.');
        }
      } else {
        setError('Failed to add email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardBody className="p-8">
          <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">Add your email</h1>
          <p className="mb-6 text-center text-sm text-gray-500">
            Your OAuth account needs an email address before we can finish authentication.
          </p>

          {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
            <Button type="submit" className="w-full" isLoading={loading}>
              Save and Send Verification
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

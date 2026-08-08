'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Button, Input, Card, CardBody } from '@/components/ui';
import { ROUTES } from '@/constants';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardBody className="p-8">
          {sent ? (
            <div className="text-center">
              <div className="mb-4 text-5xl">📨</div>
              <h2 className="mb-2 text-xl font-bold">Check your inbox</h2>
              <p className="text-sm text-gray-500">If that email is registered, a reset link has been sent.</p>
              <Link href={ROUTES.login} className="mt-6 block text-sm text-blue-600 hover:underline">Back to sign in</Link>
            </div>
          ) : (
            <>
              <h1 className="mb-2 text-2xl font-bold text-gray-900">Forgot password?</h1>
              <p className="mb-6 text-sm text-gray-500">Enter your email and we&apos;ll send a reset link.</p>
              {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Button type="submit" isLoading={isLoading} className="w-full">Send reset link</Button>
              </form>
              <Link href={ROUTES.login} className="mt-4 block text-center text-sm text-blue-600 hover:underline">Back to sign in</Link>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Button, Card, CardBody } from '@/components/ui';
import { PasswordInput } from '@/components/PasswordInput';
import { ROUTES, APP_NAME } from '@/constants';

const weakPasswords = new Set([
  '123456',
  '12345678',
  '123456789',
  'password',
  'password123',
  'qwerty123',
  'qwertyuiop',
  'admin123',
  'welcome123',
  'letmein123',
]);

const validatePassword = (value: string): string | null => {
  if (!value) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters long';
  if (!/[A-Z]/.test(value)) return 'Password must include at least one uppercase letter';
  if (!/[a-z]/.test(value)) return 'Password must include at least one lowercase letter';
  if (!/[0-9]/.test(value)) return 'Password must include at least one number';
  
  const lowerPassword = value.toLowerCase();
  if (weakPasswords.has(lowerPassword)) return 'Password is too weak. Please choose a stronger password';
  
  const commonPatterns = ['abc123', '123abc', 'qwerty', 'asdfgh'];
  if (commonPatterns.some(pattern => lowerPassword.includes(pattern))) {
    return 'Password contains a common easily guessable pattern';
  }

  return null;
};

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const passwordError = validatePassword(password);
    if (passwordError) { setError(passwordError); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <p className="text-center text-red-600">
        Invalid reset link. <Link href={ROUTES.forgotPassword} className="underline">Request a new one</Link>.
      </p>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h2 className="text-xl font-bold text-gray-900">Password reset!</h2>
        <p className="text-sm text-gray-500">You can now sign in with your new password.</p>
        <Button onClick={() => router.push(ROUTES.login)} className="w-full">Go to Sign In</Button>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Set new password</h1>
      <p className="mb-6 text-sm text-gray-500">Choose a strong password for your {APP_NAME} account.</p>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <PasswordInput
          label="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <PasswordInput
          label="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <Button type="submit" isLoading={loading} className="w-full">Reset Password</Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardBody className="p-8">
          <Suspense fallback={<p className="text-center text-gray-500">Loading...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </CardBody>
      </Card>
    </div>
  );
}

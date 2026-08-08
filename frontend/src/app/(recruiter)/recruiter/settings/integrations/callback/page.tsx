'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui';

export default function CalendarCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'connecting' | 'success' | 'error'>('connecting');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');

      if (!code || !state) {
        setStatus('error');
        setMessage('Missing authorization code or state. Please try again.');
        return;
      }

      try {
        await api.post('/calendar/callback', { code, state });
        setStatus('success');
        setMessage('Google Calendar connected successfully');
        setTimeout(() => router.push('/recruiter/settings/integrations'), 2000);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Failed to connect Google Calendar');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f7f7f7] via-[#f9fbf4] to-[#eef7d8]">
      <div className="bg-white rounded-3xl p-8 shadow-lg max-w-md w-full text-center">
        {status === 'connecting' && (
          <>
            <Spinner size="lg" />
            <h2 className="text-xl font-semibold text-slate-900 mt-4">Connecting Google Calendar...</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mt-4">{message}</h2>
            <p className="text-slate-500 text-sm mt-2">Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center">
              <span className="text-red-600 text-2xl">!</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mt-4">Connection Failed</h2>
            <p className="text-slate-500 text-sm mt-2">{message}</p>
            <button
              onClick={() => router.push('/recruiter/settings/integrations')}
              className="mt-6 bg-[#c1f237] hover:bg-[#b0e025] text-black text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              Back to Integrations
            </button>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Spinner } from '@/components/ui';
import toast from 'react-hot-toast';

export default function CalendarIntegrationPage() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.get<{ connected: boolean }>('/calendar/status');
      setConnected(res.data?.connected || false);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await api.get<{ url: string; state: string }>('/calendar/auth-url');
      const { url } = res.data || {};
      if (url) {
        localStorage.setItem('calendar_oauth_state', res.data?.state || '');
        window.location.href = url;
      } else {
        toast.error('Failed to get authorization URL');
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google Calendar? Scheduled interviews will not be affected.')) return;
    setDisconnecting(true);
    try {
      await api.delete('/calendar/disconnect');
      setConnected(false);
      toast.success('Google Calendar disconnected');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-3 sm:px-4 py-6 sm:py-8">
      <div>
        <h1 className="text-3xl font-display font-medium text-slate-900 tracking-tight">Integrations</h1>
        <p className="text-slate-500 text-sm mt-1">Connect third-party services to your recruiter account</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5.8 11.4l-1.4 1.4-4.4-4.4-4.4 4.4-1.4-1.4 4.4-4.4-4.4-4.4 1.4-1.4 4.4 4.4 4.4-4.4 1.4 1.4-4.4 4.4 4.4 4.4z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Google Calendar</h3>
            <p className="text-slate-500 text-sm mt-0.5">
              {connected
                ? 'Connected — interview events sync automatically with Google Meet links'
                : 'Schedule interviews with Google Meet and manage events from your calendar'}
            </p>
          </div>
        </div>
        <div>
          {connected ? (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="bg-[#c1f237] hover:bg-[#b0e025] text-black text-sm font-medium px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {connecting ? 'Redirecting...' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">How it works</h3>
        <ol className="space-y-3 text-sm text-slate-600">
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center text-xs font-bold shrink-0">1</span>
            <span>Connect your Google Calendar account using the button above</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center text-xs font-bold shrink-0">2</span>
            <span>When you move an applicant to "Interview" status, you'll be prompted to schedule a time</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center text-xs font-bold shrink-0">3</span>
            <span>A Google Calendar event is created with a Google Meet link — you and the applicant both get invites</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center text-xs font-bold shrink-0">4</span>
            <span>The applicant receives an in-app notification with the interview details and Meet link</span>
          </li>
        </ol>
      </div>
    </div>
  );
}

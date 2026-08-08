'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import { Webhook, WebhookDelivery } from '@/types';
import { Spinner } from '@/components/ui';
import toast from 'react-hot-toast';

const AVAILABLE_EVENTS = [
  { value: 'application.submitted', label: 'Application Submitted' },
  { value: 'application.status_changed', label: 'Status Changed' },
  { value: 'application.interview_completed', label: 'Interview Completed' },
  { value: 'application.offer_extended', label: 'Offer Extended' },
  { value: 'user.registered', label: 'User Registered' },
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await api.get<Webhook[]>('/webhooks');
      setWebhooks(res.data || []);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const toggleEvent = (eventValue: string) => {
    setNewEvents(prev => prev.includes(eventValue) ? prev.filter(e => e !== eventValue) : [...prev, eventValue]);
  };

  const handleCreate = async () => {
    if (!newUrl.trim() || newEvents.length === 0) {
      toast.error('URL and at least one event are required');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post<Webhook>('/webhooks', { url: newUrl.trim(), events: newEvents });
      const wh = res.data;
      setCreatedSecret(wh?.secret || null);
      toast.success('Webhook registered');
      setNewUrl('');
      setNewEvents([]);
      fetchWebhooks();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create webhook');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook? It will stop receiving events immediately.')) return;
    try {
      await api.delete(`/webhooks/${id}`);
      toast.success('Webhook deleted');
      fetchWebhooks();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete webhook');
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await api.patch(`/webhooks/${id}`, { is_active: !currentActive });
      toast.success(`Webhook ${currentActive ? 'paused' : 'resumed'}`);
      fetchWebhooks();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update webhook');
    }
  };

  const handleViewDeliveries = async (webhookId: string) => {
    setSelectedDeliveryId(webhookId);
    setDeliveryLoading(true);
    try {
      const res = await api.get<WebhookDelivery[]>(`/webhooks/${webhookId}/deliveries`);
      setDeliveries(res.data || []);
    } catch {
      toast.error('Failed to load delivery logs');
    } finally {
      setDeliveryLoading(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-3 sm:px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-medium text-slate-900 tracking-tight">Webhooks</h1>
          <p className="text-slate-500 text-sm mt-1">Receive real-time event notifications</p>
        </div>
        <button
          onClick={() => { setCreatedSecret(null); setShowCreate(true); }}
          className="bg-[#c1f237] hover:bg-[#b0e025] text-black text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          Add Webhook
        </button>
      </div>

      {webhooks.length === 0 ? (
        <div className="bg-[#0a0a0a] rounded-2xl p-8 text-center">
          <p className="text-white/60 text-lg font-medium">No webhooks configured</p>
          <p className="text-white/40 text-sm mt-2">Register a webhook URL to receive event notifications from the platform.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((wh) => (
            <div key={wh.id} className="bg-[#0a0a0a] rounded-2xl p-5 border border-white/5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${wh.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                    <code className="text-white/70 text-sm font-mono truncate">{wh.url}</code>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {wh.events.map((e) => (
                      <span key={e} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/70">
                        {e}
                      </span>
                    ))}
                  </div>
                  {wh.delivery_count !== undefined && (
                    <p className="text-white/30 text-xs mt-2">{wh.delivery_count} deliveries</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleViewDeliveries(wh.id)}
                    className="text-white/40 hover:text-white text-xs font-medium transition-colors"
                  >
                    Logs
                  </button>
                  <button
                    onClick={() => handleToggleActive(wh.id, wh.is_active)}
                    className={`text-xs font-medium transition-colors ${wh.is_active ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'}`}
                  >
                    {wh.is_active ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={() => handleDelete(wh.id)}
                    className="text-white/30 hover:text-red-400 text-xs font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {selectedDeliveryId === wh.id && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h4 className="text-white/70 text-xs font-semibold mb-2">Recent Deliveries</h4>
                  {deliveryLoading ? (
                    <Spinner size="sm" />
                  ) : deliveries.length === 0 ? (
                    <p className="text-white/30 text-xs">No deliveries yet</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {deliveries.map((d) => (
                        <div key={d.id} className="flex items-center gap-3 text-xs py-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${d.response_status && d.response_status < 300 ? 'bg-green-400' : d.response_status ? 'bg-red-400' : 'bg-yellow-400'}`} />
                          <span className="text-white/50 font-mono">{d.event_type}</span>
                          <span className="text-white/30">{d.response_status || 'pending'}</span>
                          <span className="text-white/20">{formatDate(d.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f0f0f] rounded-3xl p-8 w-full max-w-lg border border-white/10">
            {createdSecret ? (
              <>
                <h2 className="text-xl font-bold text-white mb-2">Webhook Registered</h2>
                <p className="text-red-400 text-sm mb-4 font-medium">Save this secret. It will not be shown again.</p>
                <div className="bg-black rounded-xl p-4 mb-1">
                  <code className="text-[#c1f237] text-sm break-all font-mono">{createdSecret}</code>
                </div>
                <p className="text-white/30 text-xs mb-6">Use this to verify the X-Jobyt-Signature header on your server.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { navigator.clipboard.writeText(createdSecret); toast.success('Copied!'); }}
                    className="bg-[#c1f237] hover:bg-[#b0e025] text-black text-sm font-medium px-5 py-2.5 rounded-xl transition-colors flex-1"
                  >
                    Copy Secret
                  </button>
                  <button
                    onClick={() => { setShowCreate(false); setCreatedSecret(null); }}
                    className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-6">Add Webhook</h2>

                <div className="mb-4">
                  <label className="block text-white/70 text-sm mb-1.5">Endpoint URL</label>
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://your-app.com/webhooks/jobyt"
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#c1f237]"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-white/70 text-sm mb-2">Events to Subscribe</label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_EVENTS.map((ev) => (
                      <label
                        key={ev.value}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                          newEvents.includes(ev.value)
                            ? 'border-[#c1f237] bg-[#c1f237]/10 text-white'
                            : 'border-white/10 text-white/60 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={newEvents.includes(ev.value)}
                          onChange={() => toggleEvent(ev.value)}
                          className="accent-[#c1f237]"
                        />
                        {ev.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCreate}
                    disabled={creating || !newUrl.trim() || newEvents.length === 0}
                    className="bg-[#c1f237] hover:bg-[#b0e025] disabled:bg-white/10 disabled:text-white/30 text-black text-sm font-medium px-5 py-2.5 rounded-xl transition-colors flex-1"
                  >
                    {creating ? 'Registering...' : 'Register'}
                  </button>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api';
import { API_BASE } from '@/constants';
import { Spinner } from '@/components/ui';
import { Notification as AppNotification } from '@/types';

interface RecruiterProfileForm {
  name: string;
  companyName: string;
  industry: string;
  company_size: string;
  location: string;
  website: string;
  description: string;
}

interface ProfilePayload {
  profile?: Partial<RecruiterProfileForm> & {
    logo_url?: string | null;
  };
  completeness?: number;
  email?: string | null;
}

const emptyForm: RecruiterProfileForm = {
  name: '',
  companyName: '',
  industry: '',
  company_size: '',
  location: '',
  website: '',
  description: '',
};

const toAbsoluteUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const origin = API_BASE.replace(/\/api\/v1\/?$/, '');
  return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
};

export default function RecruiterProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [email, setEmail] = useState<string>('');
  const [completeness, setCompleteness] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [form, setForm] = useState<RecruiterProfileForm>(emptyForm);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [res, notificationsRes] = await Promise.all([
          api.get<any>('/users/me'),
          api.getPaginated<AppNotification>('/notifications?page=1&limit=5'),
        ]);
        const payload = res.data?.data ?? res.data ?? {};
        const profile = payload.profile ?? {};

        setEmail(payload.email ?? '');
        setCompleteness(payload.completeness ?? 0);
        setLogoUrl(toAbsoluteUrl(profile.logo_url));
        setForm({
          name: profile.name ?? '',
          companyName: profile.companyName ?? '',
          industry: profile.industry ?? '',
          company_size: profile.company_size ?? '',
          location: profile.location ?? '',
          website: profile.website ?? '',
          description: profile.description ?? '',
        });

        setNotifications(notificationsRes.data || []);
        setUnreadNotifications((notificationsRes as unknown as { unread?: number }).unread || 0);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
        setNotificationsLoading(false);
      }
    };

    setNotificationsLoading(true);
    void load();
  }, []);

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
      setUnreadNotifications((prev) => Math.max(0, prev - 1));
    } catch {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      setUnreadNotifications(0);
    } catch {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleNotificationClick = async (id: string, actionUrl?: string | null, read?: boolean) => {
    if (!read) {
      await handleMarkNotificationRead(id);
    }
    if (actionUrl) {
      window.location.href = actionUrl;
    }
  };

  const profileInitials = useMemo(() => {
    const source = form.companyName || form.name || email || 'R';
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }, [email, form.companyName, form.name]);

  const onChange = (key: keyof RecruiterProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await api.post<{ url: string }>('/upload', fd);

      const uploadedUrl = uploadRes.data?.url;
      if (!uploadedUrl) {
        throw new Error('Upload succeeded but URL is missing');
      }

      await api.put('/users/me', { logo_url: uploadedUrl });

      const nextUrl = toAbsoluteUrl(uploadedUrl);
      setLogoUrl(nextUrl);
      toast.success('Logo updated');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        companyName: form.companyName.trim(),
        industry: form.industry.trim(),
        company_size: form.company_size.trim(),
        location: form.location.trim(),
        description: form.description.trim(),
        ...(form.website.trim() ? { website: form.website.trim() } : {}),
      };

      const res = await api.put<any>('/users/me', payload);
      const next = res.data?.data ?? res.data;
      if (next?.profile) {
        setForm((prev) => ({
          ...prev,
          name: next.profile?.name ?? prev.name,
          companyName: next.profile?.companyName ?? prev.companyName,
          industry: next.profile?.industry ?? prev.industry,
          company_size: next.profile?.company_size ?? prev.company_size,
          location: next.profile?.location ?? prev.location,
          website: next.profile?.website ?? prev.website,
          description: next.profile?.description ?? prev.description,
        }));
      }
      if (typeof next?.completeness === 'number') {
        setCompleteness(next.completeness);
      }
      toast.success('Profile saved');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 pb-6 animate-pulse">
        <div className="h-12 bg-slate-200 rounded-lg w-1/4" />
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
            <div className="h-[600px] bg-slate-100 rounded-2xl" />
            <div className="space-y-6">
                <div className="h-40 bg-black rounded-2xl" />
                <div className="h-80 bg-slate-100 rounded-2xl" />
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-8 px-4">
      <h1 className="text-[44px] leading-tight font-black tracking-tight text-black mb-8 font-display">Account Settings</h1>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8">
        <section className="rounded-3xl bg-[#ece9e2] p-6 sm:p-8 space-y-10">
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-8 border-b border-black/5">
              <div className="relative group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-white border-2 border-white shadow-xl flex items-center justify-center text-3xl font-black text-black/20">
                    {logoUrl ? <img src={logoUrl} alt="Company logo" className="w-full h-full object-cover transition-transform group-hover:scale-110" /> : profileInitials}
                </div>
                {uploadingLogo && (
                    <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center backdrop-blur-sm">
                        <Spinner size="sm" className="text-white" />
                    </div>
                )}
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-black text-black">Company Identity</h3>
                <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 rounded-xl bg-black text-lime-300 px-5 py-2.5 text-xs font-black cursor-pointer hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-black/10">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                        {uploadingLogo ? 'Processing...' : 'Upload New Logo'}
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            disabled={uploadingLogo}
                            onChange={handleLogoUpload}
                        />
                    </label>
                    <p className="text-[11px] font-bold text-black/40 uppercase tracking-widest px-2">PNG, JPG or WEBP (Max 2MB)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
              <Field label="Manager Name" value={form.name} onChange={(v) => onChange('name', v)} placeholder="Your full name" />
              <Field label="Email Address" value={email} disabled onChange={() => undefined} placeholder="" />
              <Field label="Company Name" value={form.companyName} onChange={(v) => onChange('companyName', v)} placeholder="e.g. Google" />
              <Field label="Industry Sector" value={form.industry} onChange={(v) => onChange('industry', v)} placeholder="e.g. Technology" />
              <Field label="Team Size" value={form.company_size} onChange={(v) => onChange('company_size', v)} placeholder="e.g. 50-100" />
              <Field label="Primary Location" value={form.location} onChange={(v) => onChange('location', v)} placeholder="City, Country" />
              <div className="md:col-span-2">
                <Field label="Official Website" value={form.website} onChange={(v) => onChange('website', v)} placeholder="https://company.com" type="url" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[11px] font-black uppercase tracking-[0.1em] text-black/40 ml-1">Company Vision & Mission</label>
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => onChange('description', e.target.value)}
                  placeholder="Share your company's story and what makes it a great place to work..."
                  className="w-full bg-white border border-black/5 rounded-2xl p-4 text-[15px] font-bold text-black outline-none focus:ring-2 focus:ring-lime-300 transition-all resize-none shadow-sm"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto rounded-2xl bg-black text-lime-300 px-10 py-4 text-[16px] font-black hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-black/10"
              >
                {saving ? 'Synchronizing...' : 'Save Profile Changes'}
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl bg-black text-white p-6 shadow-2xl relative overflow-hidden group">
            {/* Subtle Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-lime-400/10 to-transparent pointer-events-none" />
            
            <h2 className="text-xl font-black mb-4 flex items-center justify-between relative z-10">
                Profile Health
                <span className="text-[10px] bg-lime-400 text-black px-2 py-0.5 rounded-full uppercase tracking-widest font-black">Official</span>
            </h2>
            <div className="relative z-10 space-y-4">
                <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden border border-white/5">
                    <div className="h-full bg-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.5)] transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, Math.max(0, completeness))}%` }} />
                </div>
                <div className="flex items-end justify-between">
                    <p className="text-5xl font-black text-lime-400 tracking-tighter">{completeness}%</p>
                    <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest text-right max-w-[120px] mb-1">Based on identity verification and bio data</p>
                </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-black/5 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-black">Alerts {unreadNotifications > 0 ? `(${unreadNotifications})` : ''}</h2>
              {unreadNotifications > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllNotificationsRead}
                  className="text-[10px] font-black text-black/40 hover:text-black uppercase tracking-widest transition-colors"
                >
                  Mark All
                </button>
              )}
            </div>

            {notificationsLoading ? (
              <div className="py-8 flex justify-center"><Spinner size="sm" /></div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                  <div className="mx-auto w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  </div>
                  <p className="text-[11px] font-bold text-black/30 uppercase tracking-widest">No alerts yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void handleNotificationClick(item.id, item.action_url, item.read)}
                    className={`w-full text-left rounded-2xl p-4 transition-all hover:scale-[1.02] border ${item.read ? 'border-black/5 bg-slate-50/50 grayscale opacity-60' : 'border-lime-400/20 bg-lime-50 shadow-sm'}`}
                  >
                    <p className={`text-[13px] ${item.read ? 'text-black/60 font-bold' : 'text-black font-black'}`}>{item.title}</p>
                    <p className="text-[11px] text-black/50 mt-1 line-clamp-2 leading-tight">{item.body}</p>
                    <p className="text-[9px] font-black text-black/30 mt-3 uppercase tracking-widest">{new Date(item.created_at).toLocaleDateString()}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-black uppercase tracking-[0.1em] text-black/40 ml-1">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-black/5 rounded-2xl p-4 text-[15px] font-bold text-black disabled:bg-slate-50/50 disabled:text-black/30 outline-none focus:ring-2 focus:ring-lime-300 transition-all shadow-sm"
      />
    </div>
  );
}

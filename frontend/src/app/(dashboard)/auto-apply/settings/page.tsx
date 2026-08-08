'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AutoApplyApi, AutoApplyPreferences, PreviewResult } from '@/lib/api/autoApply.api';
import { ROUTES, JOB_TYPES } from '@/constants';
import { Spinner } from '@/components/ui';
import { TagAutocomplete } from '@/components/ui';
import toast from 'react-hot-toast';

import indianCitiesData from '@/constants/cities.json';

const COMMON_ROLES = [
  "Frontend Engineer", "Backend Engineer", "Full Stack Developer",
  "Software Engineer", "DevOps Engineer", "Data Scientist",
  "Data Engineer", "Machine Learning Engineer", "Product Manager",
  "UI/UX Designer", "QA Engineer", "Mobile Developer", "iOS Developer",
  "Android Developer", "Cloud Architect", "Security Engineer",
  "Engineering Manager", "Technical Lead"
];

const INDIAN_LOCATIONS = indianCitiesData.map((c: any) => `${c.name}, ${c.state}`);

const COMMON_LOCATIONS = Array.from(new Set([
  "Remote", "New York, NY", "San Francisco, CA", "Seattle, WA",
  "Austin, TX", "London, UK", "Berlin, Germany", "Toronto, Canada",
  "Singapore", "Dubai, UAE", "Sydney, Australia",
  ...INDIAN_LOCATIONS
]));

export default function AutoApplySettingsPage() {
  const [prefs, setPrefs] = useState<AutoApplyPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [consented, setConsented] = useState(false);
  const [limits, setLimits] = useState<{ usedToday: number; maxDaily: number; remaining: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prefRes, limitRes] = await Promise.all([
        AutoApplyApi.getPreferences(),
        AutoApplyApi.getLimits(),
      ]);
      const p = prefRes.data;
      if (p) {
        setPrefs(p);
      }
      if (limitRes.data) {
        setLimits({
          usedToday: limitRes.data.usedToday,
          maxDaily: limitRes.data.maxDaily,
          remaining: limitRes.data.remaining,
        });
      }
    } catch {
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const savePrefs = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await AutoApplyApi.updatePreferences({
        match_threshold: prefs.match_threshold,
        approval_mode: prefs.approval_mode,
        target_roles: prefs.target_roles,
        target_locations: prefs.target_locations,
        target_job_types: prefs.target_job_types,
        excluded_companies: prefs.excluded_companies,
        excluded_keywords: prefs.excluded_keywords,
        digest_enabled: prefs.digest_enabled,
        base_resume_id: prefs.base_resume_id,
      });
      if (res.data) setPrefs(res.data);
      toast.success('Preferences saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const runPreview = async () => {
    setPreviewLoading(true);
    try {
      await savePrefs();
      const res = await AutoApplyApi.preview();
      setPreview(res.data || null);
    } catch {
      toast.error('Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  const acknowledgeAndEnable = async () => {
    if (!consented) {
      toast.error('Please consent before enabling');
      return;
    }
    try {
      await AutoApplyApi.acknowledgePreview();
      await AutoApplyApi.updateStatus('enabled', true);
      toast.success('Auto-Apply enabled');
      void load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not enable';
      toast.error(msg);
    }
  };

  if (loading || !prefs) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  const canEnable = Boolean(preview) && consented;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-display text-[#0b1120] tracking-tight">Auto-Apply Settings</h1>
        <Link href={ROUTES.autoApply} className="text-sm font-bold text-slate-500 hover:text-[#0b1120] transition-colors">← Back to Queue</Link>
      </div>

      {limits && (
        <div className="bg-transparent border border-slate-200 rounded-lg px-4 py-2 flex items-center gap-3 w-fit mb-6">
          <span className="text-xl font-bold text-[#0b1120] leading-none">
            {limits.usedToday} <span className="text-sm text-slate-500">/ {limits.maxDaily}</span>
          </span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-snug">
            Applied Today
          </span>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        {/* Left Side: Settings */}
        <div className="glass-card p-8 space-y-8 h-fit">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="font-display text-2xl text-[#0b1120]">Configuration</h2>
            <p className="text-sm text-slate-500 mt-1">Set your preferences for automated job matching</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-bold text-[#0b1120]">Match threshold</label>
                <span className="text-[#0b1120] font-bold bg-[#c3ff3d] px-2 py-0.5 rounded text-xs">{prefs.match_threshold}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={95}
                value={prefs.match_threshold}
                onChange={(e) => setPrefs({ ...prefs, match_threshold: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#0b1120] [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 [&::-webkit-slider-thumb]:transition-transform [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-[#0b1120] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full hover:[&::-moz-range-thumb]:scale-110 [&::-moz-range-thumb]:transition-transform focus:outline-none"
              />
              <div className="flex justify-between text-xs text-slate-400 font-bold mt-2">
                <span>Broad (50%)</span>
                <span>Strict (95%)</span>
              </div>
            </div>

            <div>
              <TagAutocomplete
                label="Target roles"
                placeholder="e.g. Frontend Engineer"
                suggestions={COMMON_ROLES}
                selectedTags={prefs.target_roles}
                onChange={(tags) => setPrefs({ ...prefs, target_roles: tags })}
                helperText="Type a role and press Enter or select from the dropdown."
              />
            </div>

            <div>
              <TagAutocomplete
                label="Target locations"
                placeholder="e.g. Remote, Bangalore"
                suggestions={COMMON_LOCATIONS}
                selectedTags={prefs.target_locations}
                onChange={(tags) => setPrefs({ ...prefs, target_locations: tags })}
                helperText="Type a location and press Enter."
              />
            </div>

            <div>
              <p className="text-sm font-bold text-[#0b1120] mb-3">Job types</p>
              <div className="flex flex-wrap gap-2">
                {JOB_TYPES.map((t) => {
                  const selected = prefs.target_job_types.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        const next = selected
                          ? prefs.target_job_types.filter((x) => x !== t)
                          : [...prefs.target_job_types, t];
                        setPrefs({ ...prefs, target_job_types: next });
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                        selected ? 'bg-[#c3ff3d] border-[#c3ff3d] text-[#0b1120]' : 'bg-transparent border-slate-100 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {t.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <p className="text-sm font-bold text-[#0b1120] mb-3">Approval mode</p>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-slate-100 cursor-pointer group hover:border-slate-300 transition-colors">
                  <div className="flex items-center h-5">
                    <input
                      type="radio"
                      name="approval"
                      checked={prefs.approval_mode === 'manual'}
                      onChange={() => setPrefs({ ...prefs, approval_mode: 'manual' })}
                      className="w-4 h-4 text-[#0b1120] bg-white border-slate-300 focus:ring-[#0b1120]"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#0b1120]">Ask me before each application</span>
                    <span className="text-xs text-slate-500 mt-1">Recommended. Review generated resumes before they are sent.</span>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-slate-100 cursor-pointer group hover:border-slate-300 transition-colors">
                  <div className="flex items-center h-5">
                    <input
                      type="radio"
                      name="approval"
                      checked={prefs.approval_mode === 'auto'}
                      onChange={() => setPrefs({ ...prefs, approval_mode: 'auto' })}
                      className="w-4 h-4 text-[#0b1120] bg-white border-slate-300 focus:ring-[#0b1120]"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#0b1120]">Apply automatically</span>
                    <span className="text-xs text-slate-500 mt-1">Fully automated. Zero intervention required.</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <button
            onClick={() => void savePrefs()}
            disabled={saving}
            className="w-full px-8 py-3.5 rounded-xl bg-[#0b1120] text-white text-sm font-bold disabled:opacity-50 hover:bg-black transition-colors"
          >
            {saving ? 'Saving...' : 'Save preferences'}
          </button>
        </div>

        {/* Right Side: Preview */}
        <div className="space-y-6">
          <div className="glass-card p-6 h-fit sticky top-6">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="font-display text-xl text-[#0b1120]">Preview & Enable</h2>
              <p className="text-xs text-slate-500 mt-1">See today's matches before activating</p>
            </div>

            <button
              onClick={() => void runPreview()}
              disabled={previewLoading}
              className="w-full px-4 py-3 rounded-xl border-2 border-[#0b1120] text-[#0b1120] bg-transparent hover:bg-slate-50 text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {previewLoading ? <Spinner size="sm" /> : 'Run Preview'}
            </button>

            {preview && (
              <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex gap-3">
                  {[
                    { n: preview.summary.total_scanned, l: 'Found' },
                    { n: preview.summary.eligible, l: 'Eligible', highlight: true },
                    { n: preview.summary.excluded, l: 'Excluded' },
                  ].map((s) => (
                    <div key={s.l} className={`rounded-lg px-4 py-2 text-center border ${s.highlight ? 'bg-[#c3ff3d]/10 border-[#c3ff3d]' : 'bg-transparent border-slate-200'} min-w-[80px]`}>
                      <div className={`text-lg font-bold ${s.highlight ? 'text-[#0b1120]' : 'text-[#0b1120]'}`}>{s.n}</div>
                      <div className={`text-[10px] font-bold ${s.highlight ? 'text-[#0b1120]' : 'text-slate-500'}`}>{s.l}</div>
                    </div>
                  ))}
                </div>
                
                {preview.eligible_jobs.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg p-4">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Top Matches</h3>
                    <ul className="max-h-60 overflow-y-auto text-sm space-y-3 pr-2 custom-scrollbar">
                      {preview.eligible_jobs.slice(0, 5).map((j) => (
                        <li key={j.job_id} className="flex flex-col gap-1 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-[#0b1120] line-clamp-1">{j.title}</span>
                            <span className="text-[#0b1120] bg-[#c3ff3d]/20 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">{j.match_score}%</span>
                          </div>
                          <span className="text-xs text-slate-500 truncate">{j.company}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg p-6 text-center bg-slate-50/50">
                    <p className="text-sm font-medium text-slate-500">No eligible matches found based on your criteria.</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-100">
              <label className="flex items-start gap-3 cursor-pointer group mb-6">
                <div className="flex items-center h-5 mt-0.5">
                  <input 
                    type="checkbox" 
                    checked={consented} 
                    onChange={(e) => setConsented(e.target.checked)} 
                    className="w-4 h-4 rounded text-[#0b1120] border-slate-300 focus:ring-[#0b1120]" 
                  />
                </div>
                <span className="text-xs text-slate-500 leading-relaxed group-hover:text-slate-700 transition-colors">
                  I authorize Jobyt to apply on my behalf using my resume for matched jobs.
                </span>
              </label>

              <button
                onClick={() => void acknowledgeAndEnable()}
                disabled={!canEnable || prefs.status === 'enabled'}
                className="w-full px-4 py-3.5 rounded-xl bg-[#0b1120] text-[#c3ff3d] text-sm font-bold disabled:opacity-40 hover:bg-black transition-all flex items-center justify-center gap-2"
              >
                {prefs.status === 'enabled' ? (
                  'Auto-Apply is Active'
                ) : (
                  'Enable Auto-Apply'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

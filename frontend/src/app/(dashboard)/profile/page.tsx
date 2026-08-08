'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { ApplicantProfile, RecruiterProfile, ApplicantProject, ApplicantCertification } from '@/types';
import { Spinner, Avatar } from '@/components/ui';
import toast from 'react-hot-toast';
import { FaPenToSquare, FaCheck, FaGlobe, FaGithub, FaAward, FaFileArrowDown } from 'react-icons/fa6';
import { ResumeUploadCard } from '@/components/profile/ResumeUploadCard';
import { ResumeListCard } from '@/components/profile/ResumeListCard';
import { NotificationPreferences } from '@/components/profile/NotificationPreferences';
import { resolveAssetUrl } from '@/lib/assetUrl';
type ProfileData = Partial<ApplicantProfile & RecruiterProfile>;

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [completeness, setCompleteness] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  
  // Visibility State
  const [visibilitySetting, setVisibilitySetting] = useState<'public' | 'private' | 'hidden'>('public');

  // Edit States
  const [editBasic, setEditBasic] = useState(false);
  const [editBio, setEditBio] = useState(false);
  const [editCompany, setEditCompany] = useState(false);
  const [editLinks, setEditLinks] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<ProfileData>();

  // Determine missing fields
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [resumeRefreshKey, setResumeRefreshKey] = useState(0);

  // Projects State
  const [projects, setProjects] = useState<ApplicantProject[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ApplicantProject | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectTechStack, setProjectTechStack] = useState('');
  const [projectGithubUrl, setProjectGithubUrl] = useState('');
  const [projectDemoUrl, setProjectDemoUrl] = useState('');
  const [projectMediaUrl, setProjectMediaUrl] = useState('');
  const [projectMediaFile, setProjectMediaFile] = useState<File | null>(null);
  const [projectMediaPreview, setProjectMediaPreview] = useState<string | null>(null);
  const [projectSubmitting, setProjectSubmitting] = useState(false);
  const [projectUploadingMedia, setProjectUploadingMedia] = useState(false);

  // Certifications State
  const [certifications, setCertifications] = useState<ApplicantCertification[]>([]);
  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedCert, setSelectedCert] = useState<ApplicantCertification | null>(null);
  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certIssueDate, setCertIssueDate] = useState('');
  const [certCredentialUrl, setCertCredentialUrl] = useState('');
  const [certFileUrl, setCertFileUrl] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certFilePreview, setCertFilePreview] = useState<string | null>(null);
  const [certSubmitting, setCertSubmitting] = useState(false);
  const [certUploadingFile, setCertUploadingFile] = useState(false);

  const handleOpenAddCertModal = () => {
    setSelectedCert(null);
    setCertName('');
    setCertIssuer('');
    setCertIssueDate('');
    setCertCredentialUrl('');
    setCertFileUrl('');
    setCertFile(null);
    setCertFilePreview(null);
    setShowCertModal(true);
  };

  const handleOpenEditCertModal = (cert: ApplicantCertification) => {
    setSelectedCert(cert);
    setCertName(cert.name);
    setCertIssuer(cert.issuer);
    setCertIssueDate(cert.issue_date ? new Date(cert.issue_date).toISOString().split('T')[0] : '');
    setCertCredentialUrl(cert.credential_url || '');
    setCertFileUrl(cert.file_url || '');
    setCertFile(null);
    setCertFilePreview(null);
    setShowCertModal(true);
  };

  const handleCertFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCertFile(file);
    setCertFilePreview(file.name);
  };

  const handleSaveCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certName.trim()) {
      toast.error('Certification name is required');
      return;
    }
    if (!certIssuer.trim()) {
      toast.error('Issuer is required');
      return;
    }

    setCertSubmitting(true);
    try {
      let finalFileUrl = certFileUrl;

      if (certFile) {
        setCertUploadingFile(true);
        const form = new FormData();
        form.append('file', certFile);
        const uploadRes = await api.post<{ url: string }>('/upload', form);
        if (uploadRes.data?.url) {
          finalFileUrl = uploadRes.data.url;
        }
        setCertUploadingFile(false);
      }

      const payload = {
        name: certName,
        issuer: certIssuer,
        issue_date: certIssueDate || null,
        credential_url: certCredentialUrl || null,
        file_url: finalFileUrl || null,
      };

      if (selectedCert) {
        await api.put(`/users/me/certifications/${selectedCert.id}`, payload);
        toast.success('Certification updated successfully!');
      } else {
        await api.post('/users/me/certifications', payload);
        toast.success('Certification added successfully!');
      }

      setShowCertModal(false);
      void loadProfile();
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save certification');
    } finally {
      setCertSubmitting(false);
      setCertUploadingFile(false);
    }
  };

  const handleDeleteCert = async (certId: string) => {
    if (!confirm('Are you sure you want to delete this certification?')) return;
    try {
      await api.delete(`/users/me/certifications/${certId}`);
      toast.success('Certification deleted successfully!');
      void loadProfile();
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete certification');
    }
  };

  const handleOpenAddProjectModal = () => {
    setSelectedProject(null);
    setProjectTitle('');
    setProjectDescription('');
    setProjectTechStack('');
    setProjectGithubUrl('');
    setProjectDemoUrl('');
    setProjectMediaUrl('');
    setProjectMediaFile(null);
    setProjectMediaPreview(null);
    setShowProjectModal(true);
  };

  const handleOpenEditProjectModal = (project: ApplicantProject) => {
    setSelectedProject(project);
    setProjectTitle(project.title);
    setProjectDescription(project.description || '');
    setProjectTechStack(project.tech_stack ? project.tech_stack.join(', ') : '');
    setProjectGithubUrl(project.github_url || '');
    setProjectDemoUrl(project.demo_url || '');
    setProjectMediaUrl(project.media_url || '');
    setProjectMediaFile(null);
    setProjectMediaPreview(project.media_url ? resolveAssetUrl(project.media_url) : null);
    setShowProjectModal(true);
  };

  const handleProjectMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProjectMediaFile(file);
    setProjectMediaPreview(URL.createObjectURL(file));
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim()) {
      toast.error('Project title is required');
      return;
    }

    setProjectSubmitting(true);
    try {
      let finalMediaUrl = projectMediaUrl;

      if (projectMediaFile) {
        setProjectUploadingMedia(true);
        const form = new FormData();
        form.append('file', projectMediaFile);
        const uploadRes = await api.post<{ url: string }>('/upload', form);
        if (uploadRes.data?.url) {
          finalMediaUrl = uploadRes.data.url;
        }
        setProjectUploadingMedia(false);
      }

      const payload = {
        title: projectTitle,
        description: projectDescription,
        tech_stack: projectTechStack,
        github_url: projectGithubUrl,
        demo_url: projectDemoUrl,
        media_url: finalMediaUrl,
      };

      if (selectedProject) {
        await api.put(`/users/me/projects/${selectedProject.id}`, payload);
        toast.success('Project updated successfully!');
      } else {
        await api.post('/users/me/projects', payload);
        toast.success('Project added successfully!');
      }

      setShowProjectModal(false);
      void loadProfile();
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save project');
    } finally {
      setProjectSubmitting(false);
      setProjectUploadingMedia(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.delete(`/users/me/projects/${projectId}`);
      toast.success('Project deleted successfully!');
      void loadProfile();
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete project');
    }
  };

  const loadProfile = useCallback(async () => {
    try {
      const r = await api.get<any>('/users/me');
      const payload = r.data?.data ?? r.data ?? {};
      reset(payload.profile || {});
      setCompleteness(payload.completeness || 0);
      setProjects(payload.projects || []);
      setCertifications(payload.certifications || []);
      if (payload.profile) {
        const p = payload.profile as ApplicantProfile & RecruiterProfile;
        setPhotoUrl(resolveAssetUrl(p.photo_url || p.logo_url || null));
        setVisibilitySetting(p.visibility || 'public');

        const missing: string[] = [];
        if (user?.role === 'recruiter') {
          if (!p.name) missing.push('Full Name');
          if (!r.data?.email) missing.push('Email');
          if (!p.companyName) missing.push('Company Name');
          if (!p.location) missing.push('Location');
          if (!p.logo_url) missing.push('Profile Picture');
        } else {
          if (!p.name) missing.push('Full Name');
          if (!r.data?.email) missing.push('Email');
          if (!p.phone) missing.push('Phone Number');
          if (!p.bio) missing.push('Bio');
          if (!p.portfolio_url) missing.push('Portfolio Link');
          if (!p.linkedin_url) missing.push('LinkedIn Link');
          if (!p.github_url) missing.push('GitHub Link');
          if (!p.photo_url) missing.push('Profile Picture');
        }
        setMissingFields(missing);
      } else if (user?.role === 'applicant') {
        setMissingFields([
          'Full Name',
          'Email',
          'Phone Number',
          'Bio',
          'Portfolio Link',
          'LinkedIn Link',
          'GitHub Link',
          'Profile Picture',
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [reset, user]);

  const handleVisibilityChange = async (value: 'public' | 'private' | 'hidden') => {
    try {
      await api.put('/users/me', { visibility: value });
      toast.success(`Profile visibility updated to ${value}!`);
      void loadProfile();
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update visibility');
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sync = params.get('sync');
      const provider = params.get('provider') || 'LinkedIn';
      if (sync === 'success') {
        toast.success(`${provider} profile imported successfully!`);
        window.history.replaceState({}, document.title, window.location.pathname);
        void loadProfile();
      } else if (sync === 'failed') {
        const errorMsg = params.get('error') || `Failed to sync with ${provider}.`;
        toast.error(errorMsg);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [loadProfile]);

  const handleLinkedInImport = async () => {
    try {
      const { beginOAuthRedirect, saveOAuthPurpose } = await import('@/lib/oauth');
      saveOAuthPurpose('import_profile');
      await beginOAuthRedirect('linkedin', undefined, undefined, '/profile');
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize LinkedIn sync');
    }
  };

  const handleGitHubImport = async () => {
    try {
      const { beginOAuthRedirect, saveOAuthPurpose } = await import('@/lib/oauth');
      saveOAuthPurpose('import_profile');
      await beginOAuthRedirect('github', undefined, undefined, '/profile');
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize GitHub sync');
    }
  };

  const onSubmit = async (data: ProfileData) => {
    try {
      const toNullable = (value: unknown) => {
        if (typeof value !== 'string') return value ?? null;
        const trimmed = value.trim();
        return trimmed.length ? trimmed : null;
      };

      // Client-side LinkedIn URL validation
      if (data.linkedin_url && typeof data.linkedin_url === 'string' && data.linkedin_url.trim()) {
        const linkedinVal = data.linkedin_url.trim().replace(/^https?:\/\//i, '').toLowerCase();
        if (!linkedinVal.startsWith('linkedin.com/') && !linkedinVal.startsWith('www.linkedin.com/')) {
          toast.error('LinkedIn URL must be from linkedin.com (e.g. https://linkedin.com/in/username)');
          return;
        }
      }

      const payload =
        user?.role === 'recruiter'
          ? {
              name: toNullable(data.name),
              location: toNullable(data.location),
              companyName: toNullable(data.companyName),
              industry: toNullable(data.industry),
              company_size: toNullable(data.company_size),
              description: toNullable(data.description),
              website: toNullable(data.website),
            }
          : {
              name: toNullable(data.name),
              phone: toNullable(data.phone),
              bio: toNullable(data.bio),
              portfolio_url: toNullable(data.portfolio_url),
              github_url: toNullable(data.github_url),
              linkedin_url: toNullable(data.linkedin_url),
            };

      await api.put('/users/me', payload);
      setEditBasic(false);
      setEditBio(false);
      setEditCompany(false);
      setEditLinks(false);
      setShowSaveModal(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const uploadRes = await api.post<{ url: string }>('/upload', form);

      const uploadedUrl = uploadRes.data?.url;
      if (!uploadedUrl) {
        throw new Error('Photo upload succeeded but URL is missing.');
      }

      await api.put('/users/me', { photo_url: uploadedUrl });

      setPhotoUrl(resolveAssetUrl(uploadedUrl));
      toast.success('Photo updated!');
      await loadProfile();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-[1308px] ml-4 sm:ml-6 lg:ml-8 pr-4 pb-8 font-brand">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h1 className="text-[40px] leading-[54px] font-normal text-black tracking-tight">My Profile</h1>
        {user?.role === 'applicant' && (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleLinkedInImport}
              className="flex items-center gap-2 bg-[#0a66c2] hover:bg-[#08549d] text-white font-bold px-5 py-2.5 rounded-[12px] text-sm shadow-sm transition-all active:scale-95 shrink-0"
            >
              <span>Import from LinkedIn</span>
            </button>
            <button
              type="button"
              onClick={handleGitHubImport}
              className="flex items-center gap-2 bg-[#24292e] hover:bg-[#1c1f23] text-white font-bold px-5 py-2.5 rounded-[12px] text-sm shadow-sm transition-all active:scale-95 shrink-0"
            >
              <span>Import from GitHub</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const url = `${window.location.origin}/profile/${user.id}`;
                navigator.clipboard.writeText(url);
                toast.success('Public profile link copied to clipboard!');
              }}
              className="flex items-center gap-2 bg-black hover:bg-[#1a1a1a] text-lime-400 font-bold px-5 py-2.5 rounded-[12px] text-sm shadow-sm transition-all active:scale-95 shrink-0"
            >
              <span>🔗 Share Public Profile</span>
            </button>
            <Link
              href="/resume-builder"
              className="flex items-center gap-2 bg-[#c3ff3d] hover:bg-[#aee62d] text-black font-bold px-5 py-2.5 rounded-[12px] text-sm shadow-sm transition-all active:scale-95 shrink-0"
            >
              <span>📝 Build Your Resume</span>
            </Link>
            <Link
              href="/settings/api-keys"
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-[12px] text-sm shadow-sm transition-all active:scale-95 shrink-0"
            >
              <span>🔑 API Keys</span>
            </Link>
          </div>
        )}
      </div>
      
      {/* Notification Preferences */}
      <div className="mb-6">
        <NotificationPreferences />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[800px_484px] gap-6 items-start">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Beige Form Container */}
          <div className="bg-[#F4F1EA] rounded-[20px] p-6 shadow-sm border border-[#e8e4db] relative">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-6">
            
            {/* Avatar Row */}
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="w-24 h-24 sm:w-[150px] sm:h-[150px] rounded-full overflow-hidden border-4 border-white shadow-sm shrink-0">
                <Avatar src={photoUrl} name={user?.email} size="xl" className="w-full h-full object-cover" />
              </div>
              <div className="text-center sm:text-left">
                <label className="cursor-pointer bg-black text-white px-5 py-2.5 rounded-[10px] text-sm font-normal hover:bg-gray-800 transition-colors inline-block mb-2">
                  {uploading ? 'Uploading...' : 'Upload New Photo'}
                  <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handlePhotoUpload} />
                </label>
                <p className="text-sm text-[#525252]">800 x 800 px JPG or PNG allowed</p>
              </div>
            </div>

            {/* Personal Info */}
            <div 
              onDoubleClick={() => setEditBasic(!editBasic)}
              title="Double-click to edit"
              className={`bg-white rounded-[10px] p-6 shadow-sm relative transition-all border ${editBasic ? 'border-lime-400' : 'border-[#c3ff3d]/60 cursor-pointer'}`}
            >
              <button 
                type="button" 
                onClick={() => setEditBasic(!editBasic)}
                className={`absolute top-6 right-6 transition-all ${editBasic ? 'text-lime-500 opacity-100' : 'text-gray-400 hover:text-lime-500 opacity-60 hover:opacity-100'}`}
              >
                <FaPenToSquare />
              </button>
              <h3 className="font-normal text-black mb-4 text-[18px] leading-6">Personal Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Full Name</label>
                  <input 
                    {...register('name')} 
                    readOnly={!editBasic}
                    className={`w-full bg-transparent border-b border-transparent focus:border-lime-400 focus:outline-none text-gray-900 font-medium py-1 ${!editBasic ? 'cursor-pointer' : ''}`} 
                    placeholder="Your Name" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Email</label>
                  <input readOnly value={user?.email || ''} className="w-full bg-transparent text-gray-900 font-medium py-1 opacity-70 cursor-pointer" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    {user?.role === 'recruiter' ? 'Location' : 'Phone Number'}
                  </label>
                  {user?.role === 'recruiter' ? (
                    <input
                      {...register('location')}
                      readOnly={!editBasic}
                      className={`w-full bg-transparent border-b border-transparent focus:border-lime-400 focus:outline-none text-gray-900 font-medium py-1 ${!editBasic ? 'cursor-pointer' : ''}`}
                      placeholder="City, Country"
                    />
                  ) : (
                    <input
                      {...register('phone')}
                      readOnly={!editBasic}
                      className={`w-full bg-transparent border-b border-transparent focus:border-lime-400 focus:outline-none text-gray-900 font-medium py-1 ${!editBasic ? 'cursor-pointer' : ''}`}
                      placeholder="+91 98XXXXXXXX"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {user?.role === 'applicant' && (
              <div 
                onDoubleClick={() => setEditBio(!editBio)}
                title="Double-click to edit"
                className={`bg-white rounded-[10px] p-6 shadow-sm relative transition-all border ${editBio ? 'border-lime-400' : 'border-[#c3ff3d]/60 cursor-pointer'}`}
              >
                <button 
                  type="button" 
                  onClick={() => setEditBio(!editBio)}
                  className={`absolute top-6 right-6 transition-all ${editBio ? 'text-lime-500 opacity-100' : 'text-gray-400 hover:text-lime-500 opacity-60 hover:opacity-100'}`}
                >
                  <FaPenToSquare />
                </button>
                <h3 className="font-normal text-black mb-2 text-[18px] leading-6">Bio</h3>
                <textarea 
                  {...register('bio')} 
                  readOnly={!editBio}
                  rows={3}
                  className={`w-full bg-transparent border-b border-transparent focus:border-lime-400 focus:outline-none text-gray-700 text-sm leading-relaxed resize-none mt-2 ${!editBio ? 'cursor-pointer' : ''}`}
                  placeholder="Tell us about yourself..."
                />
              </div>
            )}

            {/* Profile Visibility Configurations */}
            {user?.role === 'applicant' && (
              <div className="bg-white rounded-[10px] p-6 shadow-sm border border-[#c3ff3d]/60 relative">
                <h3 className="font-normal text-black mb-1 text-[18px] leading-6">Profile Visibility</h3>
                <p className="text-xs text-[#525252] mb-6 leading-relaxed">
                  Control who can see your showcase profile page and search for your credentials. Settings apply instantly.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Public Card */}
                  <div
                    onClick={() => handleVisibilityChange('public')}
                    className={`relative flex flex-col p-5 rounded-xl border cursor-pointer transition-all duration-300 hover:shadow-md select-none ${
                      visibilitySetting === 'public'
                        ? 'border-lime-400 bg-lime-400/5 shadow-sm'
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-gray-900 text-sm">Public</span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        visibilitySetting === 'public' ? 'border-lime-500 bg-lime-500' : 'border-gray-300'
                      }`}>
                        {visibilitySetting === 'public' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-500 leading-relaxed">
                      Anyone can view your public profile. recruiters can search your showcase.
                    </span>
                  </div>

                  {/* Private Card */}
                  <div
                    onClick={() => handleVisibilityChange('private')}
                    className={`relative flex flex-col p-5 rounded-xl border cursor-pointer transition-all duration-300 hover:shadow-md select-none ${
                      visibilitySetting === 'private'
                        ? 'border-lime-400 bg-lime-400/5 shadow-sm'
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-gray-900 text-sm">Private</span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        visibilitySetting === 'private' ? 'border-lime-500 bg-lime-500' : 'border-gray-300'
                      }`}>
                        {visibilitySetting === 'private' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-500 leading-relaxed">
                      Only matched recruiters, admins, and you can view. Guests are blocked.
                    </span>
                  </div>

                  {/* Hidden Card */}
                  <div
                    onClick={() => handleVisibilityChange('hidden')}
                    className={`relative flex flex-col p-5 rounded-xl border cursor-pointer transition-all duration-300 hover:shadow-md select-none ${
                      visibilitySetting === 'hidden'
                        ? 'border-lime-400 bg-lime-400/5 shadow-sm'
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-gray-900 text-sm">Hidden</span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        visibilitySetting === 'hidden' ? 'border-lime-500 bg-lime-500' : 'border-gray-300'
                      }`}>
                        {visibilitySetting === 'hidden' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-500 leading-relaxed">
                      Only you and admins can view. Access returns a Not Found page for all others.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Corporate Info for Recruiters */}
            {user?.role === 'recruiter' && (
              <div 
                onDoubleClick={() => setEditCompany(!editCompany)}
                title="Double-click to edit"
                className={`bg-white rounded-[10px] p-6 shadow-sm relative transition-all border ${editCompany ? 'border-lime-400' : 'border-[#c3ff3d]/60 cursor-pointer'}`}
              >
                <button 
                  type="button" 
                  onClick={() => setEditCompany(!editCompany)}
                  className={`absolute top-6 right-6 transition-all ${editCompany ? 'text-lime-500 opacity-100' : 'text-gray-400 hover:text-lime-500 opacity-60 hover:opacity-100'}`}
                >
                  <FaPenToSquare />
                </button>
                <h3 className="font-normal text-black mb-4 text-[18px] leading-6">Company Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Company Name</label>
                    <input {...register('companyName')} readOnly={!editCompany} className={`w-full bg-transparent border-b border-transparent focus:border-lime-400 focus:outline-none text-gray-900 font-medium py-1 ${!editCompany ? 'cursor-pointer' : ''}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Industry</label>
                    <input {...register('industry')} readOnly={!editCompany} className={`w-full bg-transparent border-b border-transparent focus:border-lime-400 focus:outline-none text-gray-900 font-medium py-1 ${!editCompany ? 'cursor-pointer' : ''}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Company Size</label>
                    <input {...register('company_size')} readOnly={!editCompany} className={`w-full bg-transparent border-b border-transparent focus:border-lime-400 focus:outline-none text-gray-900 font-medium py-1 ${!editCompany ? 'cursor-pointer' : ''}`} placeholder="e.g. 11-50" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Description</label>
                    <textarea {...register('description')} readOnly={!editCompany} rows={2} className={`w-full bg-transparent border-b border-transparent focus:border-lime-400 focus:outline-none text-gray-900 font-medium py-1 resize-none ${!editCompany ? 'cursor-pointer' : ''}`} />
                  </div>
                </div>
              </div>
            )}

            {/* Links */}
            <div 
              onDoubleClick={() => setEditLinks(!editLinks)}
              title="Double-click to edit"
              className={`bg-white rounded-[10px] p-6 shadow-sm relative transition-all border ${editLinks ? 'border-lime-400' : 'border-[#c3ff3d]/60 cursor-pointer'}`}
            >
              <button 
                type="button" 
                onClick={() => setEditLinks(!editLinks)}
                className={`absolute top-6 right-6 transition-all ${editLinks ? 'text-lime-500 opacity-100' : 'text-gray-400 hover:text-lime-500 opacity-60 hover:opacity-100'}`}
              >
                <FaPenToSquare />
              </button>
              <h3 className="font-normal text-black mb-4 text-[18px] leading-6">Links</h3>
              
              <div className="space-y-5">
                {user?.role === 'applicant' ? (
                  <>
                    <div>
                      <label className="block text-base font-normal text-black mb-2">Portfolio Link</label>
                      <input {...register('portfolio_url')} readOnly={!editLinks} type="url" className="w-full bg-black text-lime-400 rounded-[10px] px-3 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors cursor-pointer" placeholder="https://" />
                    </div>
                    <div>
                      <label className="block text-base font-normal text-black mb-2">LinkedIn Link</label>
                      <input
                        {...register('linkedin_url')}
                        readOnly={!editLinks}
                        type="url"
                        className="w-full bg-black text-lime-400 rounded-[10px] px-3 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors cursor-pointer"
                        placeholder="https://linkedin.com/in/username"
                      />
                      {editLinks && (
                        <p className="text-xs text-gray-400 mt-1">Must be a valid linkedin.com profile URL</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-base font-normal text-black mb-2">GitHub Link</label>
                      <input {...register('github_url')} readOnly={!editLinks} type="url" className="w-full bg-black text-lime-400 rounded-[10px] px-3 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors cursor-pointer" placeholder="https://github.com/username" />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Website</label>
                    <input {...register('website')} readOnly={!editLinks} type="url" className="w-full bg-black text-lime-400 rounded-lg px-4 py-3 font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 transition-colors cursor-pointer" placeholder="https://" />
                  </div>
                )}
              </div>
            </div>

            {/* Showcase Projects Management */}
            {user?.role === 'applicant' && (
              <div className="bg-white rounded-[10px] p-6 shadow-sm border border-[#c3ff3d]/60 relative">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-normal text-black text-[18px] leading-6">Project Showcase</h3>
                  <button
                    type="button"
                    onClick={handleOpenAddProjectModal}
                    className="flex items-center gap-1.5 bg-black hover:bg-gray-800 text-lime-400 font-bold px-4 py-2 rounded-[10px] text-xs shadow-sm transition-all active:scale-95"
                  >
                    <span>+ Add Project</span>
                  </button>
                </div>

                {projects.length > 0 ? (
                  <div className="space-y-4">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100/50 transition-colors gap-4"
                      >
                        <div className="flex items-center gap-4">
                          {project.media_url && (
                            <div className="w-16 h-12 rounded-lg overflow-hidden bg-black/10 shrink-0">
                              <img
                                src={resolveAssetUrl(project.media_url) || undefined}
                                alt={project.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm">{project.title}</h4>
                            <p className="text-[11px] text-gray-500 line-clamp-1">{project.description || 'No description provided.'}</p>
                            {project.tech_stack && project.tech_stack.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {project.tech_stack.map((t, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[9px] text-gray-600 font-medium">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleOpenEditProjectModal(project)}
                            className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-xs font-bold"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProject(project.id)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors text-xs font-bold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#525252] italic text-center py-6 border border-dashed border-gray-200 rounded-[10px]">
                    No showcase projects added yet. Click "+ Add Project" to showcase your work!
                  </p>
                )}
              </div>
            )}

            {/* Certification Showcase */}
            {user?.role === 'applicant' && (
              <div className="bg-white rounded-[10px] p-6 shadow-sm border border-[#c3ff3d]/60 relative">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-normal text-black text-[18px] leading-6">Certifications & Credentials</h3>
                  <button
                    type="button"
                    onClick={handleOpenAddCertModal}
                    className="flex items-center gap-1.5 bg-black hover:bg-gray-800 text-lime-400 font-bold px-4 py-2 rounded-[10px] text-xs shadow-sm transition-all active:scale-95"
                  >
                    <span>+ Add Certification</span>
                  </button>
                </div>

                {certifications.length > 0 ? (
                  <div className="space-y-4">
                    {certifications.map((cert) => (
                      <div
                        key={cert.id}
                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100/50 transition-colors gap-4"
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="p-3 bg-lime-400/10 border border-lime-400/20 text-lime-600 rounded-xl text-lg shrink-0">
                            <FaAward />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-gray-900 text-sm truncate" title={cert.name}>{cert.name}</h4>
                            <p className="text-[11px] text-gray-500 font-semibold">{cert.issuer}</p>
                            <div className="flex flex-wrap gap-2 items-center mt-1">
                              {cert.issue_date && (
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                                  Issued: {new Date(cert.issue_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              )}
                              {cert.credential_url && (
                                <a
                                  href={cert.credential_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-lime-600 hover:text-lime-700 font-bold flex items-center gap-1"
                                >
                                  <FaGlobe className="text-[10px]" />
                                  <span>Verify Link</span>
                                </a>
                              )}
                              {cert.file_url && (
                                <a
                                  href={cert.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-gray-600 hover:text-gray-800 font-bold flex items-center gap-1"
                                >
                                  <FaFileArrowDown className="text-[10px]" />
                                  <span>Document</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCertModal(cert)}
                            className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-xs font-bold"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCert(cert.id)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors text-xs font-bold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#525252] italic text-center py-6 border border-dashed border-gray-200 rounded-[10px]">
                    No certifications added yet. Click "+ Add Certification" to display your credentials!
                  </p>
                )}
              </div>
            )}

            {/* Save Container at the bottom */}
            <div className="flex justify-center pt-2">
              <button 
                type="submit" 
                disabled={isSubmitting || (!editBasic && !editBio && !editCompany && !editLinks)}
                className="bg-[#c3ff3d] text-black font-normal text-[18px] leading-6 px-5 py-[15px] rounded-[20px] hover:bg-[#aee62d] transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed shadow-md min-w-[158px] h-[54px]"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
        
      </div>

      {/* Right Column: Dark Sidebar Cards */}
        <div className="space-y-4">
          {/* Complete Profile Card */}
          <div className="bg-[#0b0b0b] rounded-[20px] p-6 shadow-xl border border-gray-900 min-h-[383px]">
            <h3 className="text-white font-normal text-[24px] leading-8 mb-6 text-center">Complete Your Profile</h3>
            
            {/* Donut Chart */}
            <div className="relative w-36 h-36 sm:w-[150px] sm:h-[150px] mx-auto flex justify-center items-center mb-4">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#333" strokeWidth="12" fill="none" />
                <circle cx="50" cy="50" r="40" stroke="#c3ff3d" strokeWidth="12" fill="none" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * completeness) / 100} className="transition-all duration-1000 ease-out" />
              </svg>
              <div className="absolute flex items-center justify-center flex-col">
                <span className="text-[27px] leading-9 font-normal text-white">{completeness}%</span>
              </div>
            </div>

            {/* Checklist Split into Columns */}
            <div className="flex flex-row justify-evenly gap-y-4 w-full text-sm font-normal">
              {/* Left Column: Basic Info */}
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-lime-400 shrink-0"></div>
                  <span className="text-lime-400 font-medium whitespace-nowrap">Setup Account</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('Full Name') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                  <span className={missingFields.includes('Full Name') ? 'text-gray-400' : 'text-lime-400 font-medium'}>Full Name</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('Email') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                  <span className={missingFields.includes('Email') ? 'text-gray-400' : 'text-lime-400 font-medium'}>Email</span>
                </li>
                {user?.role === 'recruiter' ? (
                  <>
                    <li className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('Company Name') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                      <span className={missingFields.includes('Company Name') ? 'text-gray-400' : 'text-lime-400 font-medium'}>Company Name</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('Location') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                      <span className={missingFields.includes('Location') ? 'text-gray-400' : 'text-lime-400 font-medium'}>Location</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('Phone Number') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                      <span className={missingFields.includes('Phone Number') ? 'text-gray-400' : 'text-lime-400 font-medium'}>Phone Number</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('Bio') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                      <span className={missingFields.includes('Bio') ? 'text-gray-400' : 'text-lime-400 font-medium'}>Bio</span>
                    </li>
                  </>
                )}
              </ul>

              {/* Right Column: Links & Media */}
              <ul className="space-y-3">
                {user?.role === 'applicant' ? (
                  <>
                    <li className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('Portfolio Link') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                      <span className={missingFields.includes('Portfolio Link') ? 'text-gray-400' : 'text-lime-400 font-medium'}>Portfolio Link</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('LinkedIn Link') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                      <span className={missingFields.includes('LinkedIn Link') ? 'text-gray-400' : 'text-lime-400 font-medium'}>LinkedIn Link</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('GitHub Link') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                      <span className={missingFields.includes('GitHub Link') ? 'text-gray-400' : 'text-lime-400 font-medium'}>GitHub Link</span>
                    </li>
                  </>
                ) : null}
                <li className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${missingFields.includes('Profile Picture') ? 'bg-gray-500' : 'bg-lime-400'}`}></div>
                  <span className={missingFields.includes('Profile Picture') ? 'text-gray-400' : 'text-lime-400 font-medium'}>Profile Picture</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Resume Upload + Parsing */}
          {user?.role === 'applicant' && (
            <div className="space-y-4">
              <ResumeUploadCard
                onSuccess={async () => {
                  toast.success('Resume uploaded successfully');
                  setLoading(true);
                  await loadProfile();
                  setResumeRefreshKey((prev) => prev + 1);
                }}
              />
              <ResumeListCard refreshKey={resumeRefreshKey} />
            </div>
          )}
        </div>
      </div>

      {/* Save Notification Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-brand">
          <div className="bg-[#0b0b0b] border border-gray-800 rounded-2xl w-full max-w-sm p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-lime-400/20 mx-auto flex items-center justify-center mb-5">
              <FaCheck className="text-3xl text-lime-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 tracking-wide">Saved!</h3>
            <p className="text-white/60 text-sm mb-8 leading-relaxed">
              Your profile has been successfully updated and saved securely.
            </p>
            <button
              onClick={() => setShowSaveModal(false)}
              className="w-full px-6 py-3 rounded-lg bg-[#c3ff3d] text-black font-semibold hover:bg-[#aee62d] transition-colors text-sm"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Project Creation/Editing Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-brand">
          <div className="bg-[#0b0b0b] border border-gray-800 rounded-2xl w-full max-w-lg p-8 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6 tracking-wide">
              {selectedProject ? 'Edit Showcase Project' : 'Add Showcase Project'}
            </h3>
            
            <form onSubmit={handleSaveProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Project Title *</label>
                <input
                  type="text"
                  required
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="w-full bg-[#161616] text-white rounded-lg px-4 py-2.5 text-sm border border-gray-850 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
                  placeholder="e.g. Portfolio Website"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Description</label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-[#161616] text-white rounded-lg px-4 py-2.5 text-sm border border-gray-850 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 resize-none"
                  placeholder="Describe your project, your role, achievements, etc."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Tech Stack (comma separated)</label>
                <input
                  type="text"
                  value={projectTechStack}
                  onChange={(e) => setProjectTechStack(e.target.value)}
                  className="w-full bg-[#161616] text-white rounded-lg px-4 py-2.5 text-sm border border-gray-850 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
                  placeholder="e.g. Next.js, TailwindCSS, PostgreSQL"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2">GitHub Repository URL</label>
                  <input
                    type="url"
                    value={projectGithubUrl}
                    onChange={(e) => setProjectGithubUrl(e.target.value)}
                    className="w-full bg-[#161616] text-white rounded-lg px-4 py-2.5 text-sm border border-gray-850 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
                    placeholder="https://github.com/..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2">Live Demo URL</label>
                  <input
                    type="url"
                    value={projectDemoUrl}
                    onChange={(e) => setProjectDemoUrl(e.target.value)}
                    className="w-full bg-[#161616] text-white rounded-lg px-4 py-2.5 text-sm border border-gray-850 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Project Media / Screenshot</label>
                <div className="flex items-center gap-4">
                  {projectMediaPreview && (
                    <div className="w-24 h-16 rounded-lg overflow-hidden border border-gray-800 shrink-0 bg-black/40">
                      <img src={projectMediaPreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <label className="cursor-pointer bg-white text-black px-4 py-2 rounded-[8px] text-xs font-semibold hover:bg-gray-100 transition-colors inline-block">
                    Choose Screenshot
                    <input type="file" accept="image/*" className="hidden" onChange={handleProjectMediaChange} />
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="flex-1 py-3 rounded-lg bg-transparent hover:bg-gray-900 border border-gray-800 text-white font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={projectSubmitting || projectUploadingMedia}
                  className="flex-1 py-3 rounded-lg bg-[#c3ff3d] hover:bg-[#aee62d] text-black font-semibold text-sm transition-transform active:scale-95 disabled:opacity-50"
                >
                  {projectSubmitting
                    ? projectUploadingMedia
                      ? 'Uploading Screenshot...'
                      : 'Saving Project...'
                    : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Certification Creation/Editing Modal */}
      {showCertModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-brand">
          <div className="bg-[#0b0b0b] border border-gray-800 rounded-2xl w-full max-w-lg p-8 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6 tracking-wide">
              {selectedCert ? 'Edit Certification' : 'Add Certification'}
            </h3>
            
            <form onSubmit={handleSaveCert} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Certification Name *</label>
                <input
                  type="text"
                  required
                  value={certName}
                  onChange={(e) => setCertName(e.target.value)}
                  className="w-full bg-[#161616] text-white rounded-lg px-4 py-2.5 text-sm border border-gray-850 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
                  placeholder="e.g. AWS Certified Solutions Architect"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Issuer *</label>
                <input
                  type="text"
                  required
                  value={certIssuer}
                  onChange={(e) => setCertIssuer(e.target.value)}
                  className="w-full bg-[#161616] text-white rounded-lg px-4 py-2.5 text-sm border border-gray-850 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
                  placeholder="e.g. Amazon Web Services (AWS)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Issue Date</label>
                <input
                  type="date"
                  value={certIssueDate}
                  onChange={(e) => setCertIssueDate(e.target.value)}
                  className="w-full bg-[#161616] text-white rounded-lg px-4 py-2.5 text-sm border border-gray-850 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Credential URL</label>
                <input
                  type="url"
                  value={certCredentialUrl}
                  onChange={(e) => setCertCredentialUrl(e.target.value)}
                  className="w-full bg-[#161616] text-white rounded-lg px-4 py-2.5 text-sm border border-gray-850 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Certificate Document (PDF, JPG, PNG)</label>
                <div className="flex items-center gap-4">
                  {certFilePreview && (
                    <div className="text-xs text-lime-400 truncate max-w-[200px]">
                      Selected: {certFilePreview}
                    </div>
                  )}
                  {!certFilePreview && certFileUrl && (
                    <div className="text-xs text-lime-400 truncate max-w-[200px]">
                      <a href={certFileUrl} target="_blank" rel="noopener noreferrer" className="underline">View current document</a>
                    </div>
                  )}
                  <label className="cursor-pointer bg-white text-black px-4 py-2 rounded-[8px] text-xs font-semibold hover:bg-gray-100 transition-colors inline-block">
                    Choose Document
                    <input type="file" accept="image/*, application/pdf" className="hidden" onChange={handleCertFileChange} />
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowCertModal(false)}
                  className="flex-1 py-3 rounded-lg bg-transparent hover:bg-gray-900 border border-gray-800 text-white font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={certSubmitting || certUploadingFile}
                  className="flex-1 py-3 rounded-lg bg-[#c3ff3d] hover:bg-[#aee62d] text-black font-semibold text-sm transition-transform active:scale-95 disabled:opacity-50"
                >
                  {certSubmitting
                    ? certUploadingFile
                      ? 'Uploading Document...'
                      : 'Saving...'
                    : 'Save Certification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

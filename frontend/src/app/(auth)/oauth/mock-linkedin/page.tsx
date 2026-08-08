'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardBody, Button } from '@/components/ui';
import { FaLinkedin, FaShieldHalved, FaChevronRight } from 'react-icons/fa6';

function MockLinkedInForm() {
  const searchParams = useSearchParams();
  const state = searchParams.get('state') || '';
  const redirectUri = searchParams.get('redirect_uri') || '';

  const [selectedProfile, setSelectedProfile] = useState<'mock_code_swe' | 'mock_code_pm' | 'mock_code_ds'>('mock_code_swe');

  const handleAuthorize = () => {
    if (!redirectUri) {
      alert('Error: Missing redirect_uri in parameters.');
      return;
    }
    const finalUrl = `${redirectUri}${redirectUri.includes('?') ? '&' : '?'}code=${selectedProfile}&state=${encodeURIComponent(state)}`;
    window.location.href = finalUrl;
  };

  const handleCancel = () => {
    if (!redirectUri) {
      window.close();
      return;
    }
    const finalUrl = `${redirectUri}${redirectUri.includes('?') ? '&' : '?'}error=user_cancelled&state=${encodeURIComponent(state)}`;
    window.location.href = finalUrl;
  };

  return (
    <Card className="w-full max-w-lg border-gray-800 bg-[#0d0d12]/90 shadow-2xl backdrop-blur-md">
      <CardBody className="p-8">
        {/* Header Branding */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-6">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0a66c2] text-white">
              <FaLinkedin className="h-7 w-7" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">LinkedIn Sandbox</h1>
              <p className="text-xs text-gray-400">Developer Simulation Flow</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <FaShieldHalved />
            Sandbox Active
          </div>
        </div>

        {/* Info Area */}
        <div className="my-6 space-y-2.5">
          <h2 className="text-xl font-semibold text-white">Authorize Profile Sync</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            <span className="font-semibold text-lime-400">Jobyt</span> is requesting permission to access and synchronize your LinkedIn profile data.
          </p>
          <div className="rounded-lg bg-gray-900/50 p-4 border border-gray-800 text-xs text-gray-400 space-y-1.5">
            <p className="font-semibold text-white mb-1">Requested Permissions:</p>
            <p>• r_liteprofile (Name, Profile Picture)</p>
            <p>• r_emailaddress (Primary Email Address)</p>
            <p>• r_member_profile_timeline (Professional timelines, Skills)</p>
          </div>
        </div>

        {/* Profile Selector */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-300">Select Test Profile Dataset:</label>
          <div className="grid gap-2">
            {/* SWE Profile */}
            <div
              onClick={() => setSelectedProfile('mock_code_swe')}
              className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all duration-200 ${
                selectedProfile === 'mock_code_swe'
                  ? 'border-lime-500 bg-lime-500/5 text-white'
                  : 'border-gray-800 bg-gray-900/20 text-gray-400 hover:border-gray-700'
              }`}
            >
              <div>
                <p className="font-semibold text-sm text-white">Alex Rivera</p>
                <p className="text-xs text-gray-400">Software Engineer (TypeScript, React, Node.js)</p>
              </div>
              <FaChevronRight className={selectedProfile === 'mock_code_swe' ? 'text-lime-400' : 'text-gray-600'} />
            </div>

            {/* PM Profile */}
            <div
              onClick={() => setSelectedProfile('mock_code_pm')}
              className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all duration-200 ${
                selectedProfile === 'mock_code_pm'
                  ? 'border-lime-500 bg-lime-500/5 text-white'
                  : 'border-gray-800 bg-gray-900/20 text-gray-400 hover:border-gray-700'
              }`}
            >
              <div>
                <p className="font-semibold text-sm text-white">Taylor Morgan</p>
                <p className="text-xs text-gray-400">Product Manager (Product Strategy, Figma, Agile)</p>
              </div>
              <FaChevronRight className={selectedProfile === 'mock_code_pm' ? 'text-lime-400' : 'text-gray-600'} />
            </div>

            {/* DS Profile */}
            <div
              onClick={() => setSelectedProfile('mock_code_ds')}
              className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all duration-200 ${
                selectedProfile === 'mock_code_ds'
                  ? 'border-lime-500 bg-lime-500/5 text-white'
                  : 'border-gray-800 bg-gray-900/20 text-gray-400 hover:border-gray-700'
              }`}
            >
              <div>
                <p className="font-semibold text-sm text-white">Dr. Jordan Lee</p>
                <p className="text-xs text-gray-400">Data Scientist (Machine Learning, PyTorch, SQL)</p>
              </div>
              <FaChevronRight className={selectedProfile === 'mock_code_ds' ? 'text-lime-400' : 'text-gray-600'} />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-8 flex gap-3">
          <Button
            onClick={handleCancel}
            className="flex-1 border border-gray-800 bg-transparent text-gray-400 hover:bg-gray-900 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAuthorize}
            className="flex-1 bg-lime-500 text-black font-semibold hover:bg-lime-400"
          >
            Authorize Import
          </Button>
        </div>

        {/* Safety Disclaimer */}
        <p className="mt-4 text-center text-[10px] text-gray-500 leading-tight">
          This is a simulated authentication window. No password or real LinkedIn login credentials will be collected.
        </p>
      </CardBody>
    </Card>
  );
}

export default function MockLinkedInPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#09090b] px-4 py-12">
      {/* Background Glowing Circles */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-500/10 blur-[120px]"></div>
      <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-80 w-80 translate-x-1/2 translate-y-1/2 rounded-full bg-[#0a66c2]/10 blur-[120px]"></div>

      <Suspense fallback={
        <Card className="w-full max-w-lg border-gray-800 bg-[#0d0d12]/90 p-8 text-center text-white">
          <p>Loading Sandbox simulation parameters...</p>
        </Card>
      }>
        <MockLinkedInForm />
      </Suspense>
    </div>
  );
}

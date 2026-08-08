'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConsentScreen } from '@/components/video/ConsentScreen';
import { VideoCapture } from '@/components/video/VideoCapture';
import { Card, CardBody, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function VideoInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: applicationId } = use(params);
  
  const [step, setStep] = useState<'consent' | 'capture' | 'submitting'>('consent');

  const handleConsent = async (consentGiven: boolean) => {
    if (!consentGiven) {
      router.push('/applications');
      return;
    }
    
    try {
      // Save consent to DB
      await api.post('/interviews/video/consent', {
        consentGiven: true,
        consentVersion: '1.0',
        retentionDays: 30,
      });
      setStep('capture');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save consent');
    }
  };

  const handleUploadSuccess = async (fileId: string) => {
    setStep('submitting');
    try {
      // Submit video session and trigger background transcription
      await api.post('/interviews/video/submit', {
        applicationId,
        videoUrl: fileId,
      });
      toast.success('Video interview submitted successfully!');
      router.push('/applications');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit interview response');
      setStep('capture');
    }
  };

  const handleCancel = () => {
    router.push('/applications');
  };

  if (step === 'submitting') {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Spinner size="lg" />
        <p className="text-slate-600 font-medium">Submitting and processing your video interview...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Asynchronous Video Interview
        </h1>
        <p className="text-sm text-slate-500">
          Complete your application process by recording a quick video introduction.
        </p>
      </div>

      {step === 'consent' && (
        <ConsentScreen onConsent={handleConsent} onCancel={handleCancel} />
      )}

      {step === 'capture' && (
        <VideoCapture
          applicationId={applicationId}
          onUploadSuccess={handleUploadSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

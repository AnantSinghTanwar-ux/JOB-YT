'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { Button, Card, CardBody } from '@/components/ui';

type UploadedResume = {
  id: string;
  file_url: string;
  created_at: string;
};

type ResumeUploadPayload = {
  resume: UploadedResume;
};

interface ResumeUploadCardProps {
  onSuccess?: (resume: UploadedResume) => void | Promise<void>;
  className?: string;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
]);

const ACCEPTED_EXTENSIONS = ['.pdf'];

const hasAcceptedExtension = (fileName: string): boolean => {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

export function ResumeUploadCard({ onSuccess, className }: ResumeUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const resetSelection = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (isUploading) {
      return;
    }

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    setError('');
    setProgress(0);
    setUploadSuccess(false);

    const selected = event.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      return;
    }

    const isMimeAccepted = ACCEPTED_MIME_TYPES.has(selected.type);
    const isExtensionAccepted = hasAcceptedExtension(selected.name);

    if (!isMimeAccepted && !isExtensionAccepted) {
      setError('Please upload a PDF file.');
      resetSelection();
      return;
    }

    if (selected.size <= 0) {
      setError('Selected file is empty. Please choose a valid file.');
      resetSelection();
      return;
    }

    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setError('Max file size is 10MB.');
      resetSelection();
      return;
    }

    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file || isUploading) {
      return;
    }

    setIsUploading(true);
    setError('');
    setProgress(0);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await api.post<ResumeUploadPayload>('/users/me/resume', formData, {
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          const percent = Math.round((evt.loaded * 100) / evt.total);
          setProgress(percent);
        },
      });

      const uploadedResume = res.data?.resume;
      if (!uploadedResume) {
        throw new Error('Upload succeeded but resume data is missing.');
      }

      setProgress(100);
      await onSuccess?.(uploadedResume);
      resetSelection();
      setUploadSuccess(true);

      resetTimerRef.current = setTimeout(() => {
        setProgress(0);
        setUploadSuccess(false);
      }, 2200);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Upload failed. Please try again.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Upload failed. Please try again.');
      }
      setUploadSuccess(false);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className={className}>
      <CardBody className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Upload Resume</h3>
          <p className="mt-1 text-sm text-slate-500">PDF only. Max size 10MB.</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          disabled={isUploading}
          className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />

        {file && (
          <p className="text-sm text-slate-600">
            Selected: <span className="font-medium">{file.name}</span>
          </p>
        )}

        {(isUploading || progress > 0) && (
          <div className="space-y-2">
            <div className="h-2 w-full bg-slate-100 rounded overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-slate-500">
              <span>{isUploading ? 'Uploading...' : 'Uploaded'}</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}

        {uploadSuccess && progress === 100 && !isUploading && (
          <p className="text-sm text-green-600">Upload complete ✅</p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button onClick={handleUpload} isLoading={isUploading} disabled={!file || isUploading} className="w-full">
          {isUploading ? 'Uploading...' : 'Upload Resume'}
        </Button>
      </CardBody>
    </Card>
  );
}

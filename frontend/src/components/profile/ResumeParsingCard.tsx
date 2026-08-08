'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { Badge, Button, Card, CardBody } from '@/components/ui';

interface ParsedExperienceItem {
  company?: string;
  role?: string;
}

interface ParsedEducationItem {
  degree?: string;
  institution?: string;
}

interface ParsedResume {
  name?: string;
  email?: string;
  skills?: string[];
  experience?: ParsedExperienceItem[];
  education?: ParsedEducationItem[];
}

interface ResumeParsePayload {
  rawText?: string;
  skills?: string[];
  emails?: string[];
  phones?: string[];
  name?: string | null;
  experience?: ParsedExperienceItem[];
  education?: ParsedEducationItem[];
}

interface ResumeParsingCardProps {
  onParsed?: (parsed: ParsedResume) => void | Promise<void>;
  className?: string;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

const hasAcceptedExtension = (fileName: string): boolean => {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

export function ResumeParsingCard({ onParsed, className }: ResumeParsingCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetInput = () => {
    setFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError('');

    const selected = event.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      return;
    }

    const isMimeAccepted = ACCEPTED_MIME_TYPES.has(selected.type);
    const isExtensionAccepted = hasAcceptedExtension(selected.name);

    if (!isMimeAccepted && !isExtensionAccepted) {
      setError('Please upload a PDF, DOC, or DOCX file.');
      resetInput();
      return;
    }

    if (selected.size <= 0) {
      setError('Selected file is empty. Please choose a valid file.');
      resetInput();
      return;
    }

    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setError('Max file size is 5MB.');
      resetInput();
      return;
    }

    setFile(selected);
  };

  const handleParse = async () => {
    if (!file || loading) {
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await api.post<ResumeParsePayload>('/users/me/resume-parse', formData);

      const payload = res.data;
      const parsed: ParsedResume = {
        name: payload?.name || undefined,
        email: payload?.emails?.[0] || undefined,
        skills: payload?.skills || [],
        experience: payload?.experience || [],
        education: payload?.education || [],
      };

      const hasDetectedData =
        Boolean(parsed.name) ||
        Boolean(parsed.email) ||
        (parsed.skills?.length || 0) > 0 ||
        (parsed.experience?.length || 0) > 0 ||
        (parsed.education?.length || 0) > 0;
      if (!hasDetectedData) {
        throw new Error('No data detected in resume.');
      }

      setParsedData(parsed);
      await onParsed?.(parsed);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Parsing failed. Try again.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Parsing failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardBody className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Parse Resume</h3>
          <p className="mt-1 text-sm text-slate-500">Upload your resume and extract structured details.</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
          disabled={loading}
          className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />

        {file && (
          <p className="text-sm text-slate-600">
            Selected: <span className="font-medium">{file.name}</span>
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="flex gap-2">
          <Button onClick={handleParse} isLoading={loading} disabled={!file} className="w-full">
            {loading ? 'Parsing...' : 'Parse Resume'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setParsedData(null);
              setError('');
              resetInput();
            }}
            disabled={loading}
          >
            Clear
          </Button>
        </div>

        {parsedData && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-sm font-semibold text-slate-900">Parsed Resume Data</h4>

            <div className="space-y-1 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Name:</span> {parsedData.name || 'Not detected'}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Email:</span> {parsedData.email || 'Not detected'}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">Skills</p>
              {parsedData.skills && parsedData.skills.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {parsedData.skills.map((skill) => (
                    <Badge key={skill}>{skill}</Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-500">No skills detected.</p>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">Experience</p>
              {parsedData.experience && parsedData.experience.length > 0 ? (
                <div className="mt-2 space-y-1.5 text-sm text-slate-700">
                  {parsedData.experience.map((exp, idx) => (
                    <p key={`${exp.company || 'company'}-${exp.role || 'role'}-${idx}`}>
                      {(exp.role || 'Role not detected')} @ {(exp.company || 'Company not detected')}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-500">No experience detected.</p>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">Education</p>
              {parsedData.education && parsedData.education.length > 0 ? (
                <div className="mt-2 space-y-1.5 text-sm text-slate-700">
                  {parsedData.education.map((edu, idx) => (
                    <p key={`${edu.degree || 'degree'}-${edu.institution || 'institution'}-${idx}`}>
                      {(edu.degree || 'Degree not detected')} - {(edu.institution || 'Institution not detected')}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-500">No education detected.</p>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

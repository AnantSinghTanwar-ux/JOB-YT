'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CodingApi } from '@/lib/api/coding.api';
import { Badge, Button, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { CodingSubmission } from '@/types/coding';

export default function VersionSubmissionsPage({ params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = use(params);
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('assessmentId');
  const [submissions, setSubmissions] = useState<CodingSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    CodingApi.listVersionSubmissions(versionId)
      .then((res) => setSubmissions(res.data || []))
      .finally(() => setLoading(false));
  }, [versionId]);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Candidate Submissions</h1>
        <Link href={assessmentId ? ROUTES.recruiterAssessmentVersions(assessmentId) : ROUTES.recruiterAssessments}>
          <Button variant="ghost">Back</Button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#1a1a1a] text-lime-300">
            <tr>
              <th className="px-4 py-3 text-left">Attempt</th>
              <th className="px-4 py-3 text-left">Language</th>
              <th className="px-4 py-3 text-left">Score</th>
              <th className="px-4 py-3 text-left">Pass/Fail</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Review</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-4 py-3">#{s.attempt_number}</td>
                <td className="px-4 py-3">{s.language}</td>
                <td className="px-4 py-3">{s.score != null ? `${s.score}%` : '—'}</td>
                <td className="px-4 py-3">
                  <Badge className={s.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {s.passed ? 'Passed' : s.passed === false ? 'Failed' : 'Pending'}
                  </Badge>
                </td>
                <td className="px-4 py-3">{s.status}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`${ROUTES.recruiterSubmissionReview(s.id)}?versionId=${encodeURIComponent(versionId)}${assessmentId ? `&assessmentId=${encodeURIComponent(assessmentId)}` : ''}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {submissions.length === 0 && <p className="text-center text-slate-500 py-12">No submissions yet</p>}
      </div>
      <p className="text-xs text-slate-500 mt-4">Pass/fail is determined by hidden test cases only. AI scores are advisory.</p>
    </div>
  );
}

'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Badge, Button, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { AssessmentVersion } from '@/types/coding';

export default function AssessmentVersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: assessmentId } = use(params);
  const [versions, setVersions] = useState<AssessmentVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    CodingApi.listAssessmentVersions(assessmentId)
      .then((res) => setVersions(res.data || []))
      .finally(() => setLoading(false));
  }, [assessmentId]);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assessment Versions</h1>
          <p className="text-sm text-slate-500 mt-1">Immutable snapshots published from the assessment draft</p>
        </div>
        <Link href={ROUTES.recruiterAssessmentDetail(assessmentId)}>
          <Button variant="ghost">Back to Assessment</Button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#1a1a1a] text-lime-300">
            <tr>
              <th className="px-4 py-3 text-left">Version</th>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Timing</th>
              <th className="px-4 py-3 text-left">Passing Score</th>
              <th className="px-4 py-3 text-left">Published</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">v{v.version_number}</td>
                <td className="px-4 py-3">{v.title}</td>
                <td className="px-4 py-3">
                  <Badge>{v.assessment_timing === 'during_apply' ? 'During apply' : 'Post apply'}</Badge>
                </td>
                <td className="px-4 py-3">{v.passing_score}%</td>
                <td className="px-4 py-3">{new Date(v.published_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`${ROUTES.recruiterAssessmentSubmissions(v.id)}?assessmentId=${encodeURIComponent(assessmentId)}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    View submissions
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {versions.length === 0 && (
          <p className="text-center text-slate-500 py-12">No published versions yet. Publish the assessment to create a version.</p>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Badge, Button, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { CodingAssessment } from '@/types/coding';
import { FaCode, FaPlus, FaRegClock, FaRegCircleCheck } from 'react-icons/fa6';

export default function RecruiterAssessmentsPage() {
  const [assessments, setAssessments] = useState<CodingAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    CodingApi.listAssessments()
      .then((res) => setAssessments(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center min-h-[50vh]"><Spinner /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[32px] leading-tight font-bold text-slate-900 font-display tracking-tight">Coding Assessments</h1>
          <p className="text-slate-500 mt-1">Manage and track candidate coding challenges.</p>
        </div>
        <Link href={ROUTES.recruiterAssessmentNew}>
          <Button variant="brand" className="rounded-full pl-3 pr-4 shadow-[0_8px_20px_rgba(195,255,61,0.2)]">
            <FaPlus className="mr-2" /> New Assessment
          </Button>
        </Link>
      </div>

      {/* Table Area */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {assessments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#1a1a1a] text-[#C3FF3D]">
                <tr>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Title</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Passing Score</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Timing</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assessments.map((a) => (
                  <tr key={a.id} className="hover:bg-[#f9fbf4] transition-colors group">
                    <td className="px-6 py-5 font-semibold text-slate-900">{a.title}</td>
                    <td className="px-6 py-5">
                      <Badge className={a.status === 'published' ? 'bg-lime-100 text-lime-800' : 'bg-slate-100 text-slate-700'}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <FaRegCircleCheck className="text-lime-500" />
                        {a.passing_score}%
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1.5 text-slate-600 capitalize">
                        <FaRegClock className="text-slate-400" />
                        {a.assessment_timing.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={ROUTES.recruiterAssessmentDetail(a.id)}>
                          <Button variant="outline" size="sm" className="rounded-full bg-white hover:border-slate-400 hover:text-slate-900">
                            Edit
                          </Button>
                        </Link>
                        {a.status === 'published' && (
                          <Link href={ROUTES.recruiterAssessmentVersions(a.id)}>
                            <Button variant="ghost" size="sm" className="rounded-full hover:bg-slate-100">
                              Versions
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="w-16 h-16 bg-[#f9fbf4] rounded-full flex items-center justify-center mb-4">
              <FaCode className="text-2xl text-lime-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No assessments yet</h3>
            <p className="text-slate-500 max-w-sm mb-6">Create your first coding assessment to evaluate candidate skills automatically.</p>
            <Link href={ROUTES.recruiterAssessmentNew}>
              <Button variant="outline" className="rounded-full border-slate-300">
                Create First Assessment
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

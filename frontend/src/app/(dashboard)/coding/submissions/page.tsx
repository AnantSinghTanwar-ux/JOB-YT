'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Badge, Button, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { CodingSubmission } from '@/types/coding';
import { formatDate } from '@/lib/utils';

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<CodingSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    CodingApi.listSubmissions()
      .then((res) => setSubmissions(res.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-[1400px] ml-4 sm:ml-6 lg:ml-8 pr-4 py-8 pb-20 font-sans">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Submission History</h1>
        <Link href={ROUTES.coding}><Button variant="ghost">Back</Button></Link>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#1a1a1a] text-lime-300">
            <tr>
              <th className="px-4 py-3 text-left">Attempt</th>
              <th className="px-4 py-3 text-left">Language</th>
              <th className="px-4 py-3 text-left">Score</th>
              <th className="px-4 py-3 text-left">Result</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3">#{s.attempt_number}</td>
                <td className="px-4 py-3">{s.language}</td>
                <td className="px-4 py-3">{s.score != null ? `${s.score}%` : '—'}</td>
                <td className="px-4 py-3">
                  <Badge className={
                    s.passed ? 'bg-green-100 text-green-700' :
                    s.passed === false ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }>
                    {s.status === 'pending' || s.status === 'running' ? s.status : s.passed ? 'Passed' : 'Failed'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(s.created_at)}</td>
                <td className="px-4 py-3">
                  <Link href={ROUTES.codingSubmissionDetail(s.id)} className="text-blue-600 hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {submissions.length === 0 && (
          <p className="text-center text-slate-500 py-12">No submissions yet</p>
        )}
      </div>
    </div>
  );
}

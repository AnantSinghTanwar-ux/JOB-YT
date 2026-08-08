'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Badge, Button, Spinner } from '@/components/ui';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ROUTES } from '@/constants';
import { CodingSubmission } from '@/types/coding';

export default function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [submission, setSubmission] = useState<CodingSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await CodingApi.getSubmission(id);
      if (!res.data) { setLoading(false); return; }
      setSubmission(res.data);
      if (res.data.status === 'pending' || res.data.status === 'running') {
        setTimeout(load, 2000);
        return;
      }
      setLoading(false);
    };
    void load();
  }, [id]);

  if (loading || !submission) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Submission #{submission.attempt_number}</h1>
        <Link href={ROUTES.codingSubmissions}><Button variant="ghost">Back</Button></Link>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader><h2 className="font-semibold">Result</h2></CardHeader>
          <CardBody className="space-y-2">
            <div className="flex gap-4">
              <Badge className={submission.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                {submission.passed ? 'Passed' : 'Failed'}
              </Badge>
              <span className="text-sm text-slate-600">Pass/fail from hidden test cases only</span>
            </div>
            {submission.score != null && <p>Score: {submission.score}% ({submission.test_pass_count}/{submission.test_total_count} tests)</p>}
            <p className="text-xs text-slate-500">Source: {submission.passFailSource || 'hidden_tests'}</p>
          </CardBody>
        </Card>

        {submission.testResults && submission.testResults.length > 0 && (
          <Card>
            <CardHeader><h2 className="font-semibold">Test Results</h2></CardHeader>
            <CardBody className="space-y-2">
              {submission.testResults.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className={t.passed ? 'text-green-600' : 'text-red-600'}>{t.passed ? '✓' : '✗'}</span>
                  <span>Test {i + 1}{t.is_hidden ? ' (hidden)' : ''}</span>
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        {submission.evaluation && (
          <Card>
            <CardHeader><h2 className="font-semibold">AI Feedback (Advisory)</h2></CardHeader>
            <CardBody className="space-y-3 text-sm">
              <p className="text-slate-500 italic">{submission.evaluation.disclaimer}</p>
              {submission.evaluation.overall_quality_score != null && (
                <p>Quality Score: {submission.evaluation.overall_quality_score}/100</p>
              )}
              {submission.evaluation.strengths?.length > 0 && (
                <div>
                  <p className="font-medium text-green-700">Strengths</p>
                  <ul className="list-disc pl-4">{submission.evaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
              {submission.evaluation.suggestions?.length > 0 && (
                <div>
                  <p className="font-medium text-blue-700">Suggestions</p>
                  <ul className="list-disc pl-4">{submission.evaluation.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

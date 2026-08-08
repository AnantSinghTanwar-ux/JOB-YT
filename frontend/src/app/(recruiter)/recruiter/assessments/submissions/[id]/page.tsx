'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CodingApi } from '@/lib/api/coding.api';
import { Badge, Button, Spinner } from '@/components/ui';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { CodeEditor } from '@/components/coding/CodeEditor';
import { ROUTES } from '@/constants';
import { CodingLanguage, SubmissionReview } from '@/types/coding';

export default function RecruiterSubmissionReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const versionId = searchParams.get('versionId');
  const assessmentId = searchParams.get('assessmentId');
  const [submission, setSubmission] = useState<SubmissionReview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    CodingApi.reviewSubmission(id)
      .then((res) => setSubmission(res.data ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !submission) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }

  const language = (submission.language || 'python') as CodingLanguage;
  const problemTitle =
    (submission.problem_snapshot as { title?: string } | null | undefined)?.title || 'Submission review';
  const backHref = versionId
    ? `${ROUTES.recruiterAssessmentSubmissions(versionId)}${assessmentId ? `?assessmentId=${encodeURIComponent(assessmentId)}` : ''}`
    : ROUTES.recruiterAssessments;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{problemTitle}</h1>
          <p className="text-sm text-slate-500 mt-1">Attempt #{submission.attempt_number} · {submission.language}</p>
        </div>
        <Link href={backHref}><Button variant="ghost">Back</Button></Link>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader><h2 className="font-semibold">Pass / Fail (hidden tests only)</h2></CardHeader>
          <CardBody className="space-y-2">
            <Badge className={submission.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
              {submission.passed ? 'Passed' : submission.passed === false ? 'Failed' : 'Pending'}
            </Badge>
            {submission.score != null && (
              <p className="text-sm">Score: {submission.score}% ({submission.test_pass_count}/{submission.test_total_count} tests)</p>
            )}
            <p className="text-xs text-slate-500">Source: {submission.passFailSource || 'hidden_tests'}</p>
          </CardBody>
        </Card>

        {submission.testResults && submission.testResults.length > 0 && (
          <Card>
            <CardHeader><h2 className="font-semibold">Test Results</h2></CardHeader>
            <CardBody className="space-y-2">
              {submission.testResults.map((t, i) => (
                <div key={i} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                  <span className={t.passed ? 'text-green-600' : 'text-red-600'}>
                    {t.passed ? '✓' : '✗'} Test {i + 1}{t.is_hidden ? ' (hidden)' : ''}
                  </span>
                  {t.actual_output && <pre className="text-xs mt-1 text-slate-600 whitespace-pre-wrap">{t.actual_output}</pre>}
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader><h2 className="font-semibold">Submitted Code</h2></CardHeader>
          <CardBody className="h-[360px]">
            <CodeEditor
              language={language}
              value={submission.source_code || ''}
              onChange={() => {}}
              readOnly
              height="340px"
            />
          </CardBody>
        </Card>

        {submission.evaluation && (
          <Card>
            <CardHeader><h2 className="font-semibold">AI Feedback (Advisory)</h2></CardHeader>
            <CardBody className="space-y-3 text-sm">
              <p className="text-slate-500 italic">{submission.evaluation.disclaimer}</p>
              {submission.evaluation.overall_quality_score != null && (
                <p>Quality score: {submission.evaluation.overall_quality_score}/100</p>
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

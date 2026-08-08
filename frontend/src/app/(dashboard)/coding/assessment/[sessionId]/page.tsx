'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CodingApi } from '@/lib/api/coding.api';
import { ROUTES } from '@/constants';
import { CodingIDELayout } from '@/components/coding/CodingIDELayout';
import { DesktopOnlyGuard } from '@/components/coding/DesktopOnlyGuard';
import { useCodingIDE } from '@/hooks/useCodingIDE';
import { Spinner } from '@/components/ui';
import { ProblemVersion } from '@/types/coding';

interface SessionProblem {
  problem_version_id: string;
  order_index: number;
  points: number;
  title: string;
  description: string;
  constraints: string | null;
  hints: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  supported_languages: string[];
  starter_code: Record<string, string>;
  sample_cases?: Array<{ input: string; expected_output: string; explanation?: string | null }>;
}

export default function AssessmentIDEPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');
  const [problemVersionId, setProblemVersionId] = useState<string | null>(null);
  const [problems, setProblems] = useState<SessionProblem[]>([]);
  const [problemIndex, setProblemIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      await CodingApi.resume(sessionId).catch(() => {});
      const res = await CodingApi.getSessionProblems(sessionId);
      const probs = res.data as unknown as SessionProblem[];
      setProblems(probs);
      if (probs.length > 0) setProblemVersionId(probs[0].problem_version_id);
    };
    void load();
  }, [sessionId]);

  const pvId = problemVersionId || '';

  const ide = useCodingIDE({
    problemVersionId: pvId,
    assessmentSessionId: sessionId,
    onSubmitComplete: () => {
      if (problemIndex < problems.length - 1) {
        const nextIndex = problemIndex + 1;
        setProblemIndex(nextIndex);
        setProblemVersionId(problems[nextIndex].problem_version_id);
      } else {
        void CodingApi.completeSession(sessionId).then(() => {
          if (jobId && sessionStorage.getItem(`pending_job_apply_${jobId}`)) {
            router.push(`${ROUTES.jobDetail(jobId)}?apply=1&assessmentComplete=1`);
          }
        });
      }
    },
  });

  const current = problems[problemIndex];

  if ((!ide.problem && !current) || !pvId) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }

  const displayProblem: ProblemVersion = ide.problem || {
    id: current.problem_version_id,
    problem_id: '',
    version_number: 1,
    title: current.title,
    description: current.description,
    constraints: current.constraints,
    hints: current.hints || [],
    difficulty: current.difficulty,
    supported_languages: current.supported_languages,
    starter_code: current.starter_code || {},
    time_limit_sec: 5,
    memory_limit_kb: 128000,
    published_at: '',
    published_by: '',
    snapshot_hash: '',
    sample_cases: current.sample_cases,
  };

  return (
    <DesktopOnlyGuard>
      <CodingIDELayout
        problem={displayProblem}
        language={ide.language}
        onLanguageChange={ide.handleLanguageChange}
        code={ide.code}
        onCodeChange={ide.setCode}
        onRun={ide.handleRun}
        onSubmit={ide.handleSubmit}
        isRunning={ide.isRunning}
        isSubmitting={ide.isSubmitting}
        isEvaluating={ide.isEvaluating}
        runResults={ide.runResults}
        submissions={ide.submissions}
        evaluation={ide.evaluation}
        remainingSeconds={ide.remainingSeconds}
      />
    </DesktopOnlyGuard>
  );
}

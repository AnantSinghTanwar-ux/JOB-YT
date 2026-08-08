'use client';

import { use, useEffect, useState } from 'react';
import { CodingApi } from '@/lib/api/coding.api';
import { CodingIDELayout } from '@/components/coding/CodingIDELayout';
import { DesktopOnlyGuard } from '@/components/coding/DesktopOnlyGuard';
import { useCodingIDE } from '@/hooks/useCodingIDE';
import { Spinner } from '@/components/ui';

export default function PracticeIDEPage({ params }: { params: Promise<{ problemVersionId: string }> }) {
  const { problemVersionId } = use(params);
  const [practiceSessionId, setPracticeSessionId] = useState<string | undefined>();

  useEffect(() => {
    CodingApi.startPracticeSession(problemVersionId)
      .then((res) => { if (res.data?.id) setPracticeSessionId(res.data.id); })
      .catch(() => {});
  }, [problemVersionId]);

  const ide = useCodingIDE({ problemVersionId, practiceSessionId });

  if (ide.loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <p className="text-red-400 font-medium">{ide.loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!ide.problem) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }


  return (
    <DesktopOnlyGuard>
      <CodingIDELayout
        problem={ide.problem}
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
      />
    </DesktopOnlyGuard>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CodingApi } from '@/lib/api/coding.api';
import { CodingLanguage, CodingSubmission, CodeEvaluation, ProblemVersion, RunResult } from '@/types/coding';
import toast from 'react-hot-toast';

interface UseCodingIDEOptions {
  problemVersionId: string;
  practiceSessionId?: string;
  assessmentSessionId?: string;
  onSubmitComplete?: (submission: CodingSubmission) => void;
}

export function useCodingIDE({ problemVersionId, practiceSessionId, assessmentSessionId, onSubmitComplete }: UseCodingIDEOptions) {
  const [problem, setProblem] = useState<ProblemVersion | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [language, setLanguage] = useState<CodingLanguage>('python');
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [runResults, setRunResults] = useState<RunResult[]>([]);
  const [submissions, setSubmissions] = useState<CodingSubmission[]>([]);
  const [evaluation, setEvaluation] = useState<CodeEvaluation | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartTime = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await CodingApi.getProblemVersion(problemVersionId);
        const p = res.data;
        if (!p || cancelled) return;
        setProblem(p);
        setLoadError(null);
        const defaultLang = (p.supported_languages[0] || 'python') as CodingLanguage;
        setLanguage(defaultLang);
        setCode(p.starter_code[defaultLang] || '');
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load problem';
          setLoadError(message);
          toast.error(message);
        }
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [problemVersionId]);

  useEffect(() => {
    if (!assessmentSessionId) return;
    const heartbeat = async () => {
      try {
        const res = await CodingApi.heartbeat(assessmentSessionId);
        if (res.data) setRemainingSeconds(res.data.remaining_time_seconds);
      } catch {
        /* session may have expired */
      }
    };
    void heartbeat();
    const interval = setInterval(heartbeat, 30000);
    return () => clearInterval(interval);
  }, [assessmentSessionId]);

  const handleLanguageChange = useCallback((lang: CodingLanguage) => {
    if (!problem) return;
    setLanguage(lang);
    setCode(problem.starter_code[lang] || '');
  }, [problem]);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    try {
      const res = await CodingApi.runCode({
        problemVersionId,
        language,
        sourceCode: code,
        practiceSessionId,
        assessmentSessionId,
      });
      setRunResults(res.data?.results ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Run failed');
    } finally {
      setIsRunning(false);
    }
  }, [problemVersionId, language, code, practiceSessionId, assessmentSessionId]);

  const pollSubmission = useCallback((submissionId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollStartTime.current = Date.now();
    setIsEvaluating(true);
    setEvaluation(null);

    pollRef.current = setInterval(async () => {
      try {
        const res = await CodingApi.getSubmission(submissionId);
        const sub = res.data;
        if (!sub) return;

        if (sub.status === 'completed' || sub.status === 'failed') {
          setSubmissions((prev) => [sub, ...prev.filter((s) => s.id !== sub.id)]);

          let evalData = sub.evaluation;
          if (!evalData) {
            const evalRes = await CodingApi.getEvaluation(submissionId);
            if (evalRes.data) evalData = evalRes.data;
          }

          if (evalData) {
            if (pollRef.current) clearInterval(pollRef.current);
            setEvaluation(evalData);
            setIsEvaluating(false);
            onSubmitComplete?.(sub);
            toast.success(sub.passed ? 'All tests passed!' : 'Submission evaluated');
          } else {
            // Hard timeout: stop polling after 45 seconds if AI feedback never arrives
            if (Date.now() - pollStartTime.current > 45000) {
              if (pollRef.current) clearInterval(pollRef.current);
              setIsEvaluating(false);
              onSubmitComplete?.(sub);
              toast.success(sub.passed ? 'All tests passed! (AI feedback unavailable)' : 'Submission evaluated');
            }
          }
        }
      } catch { /* keep polling on transient errors */ }
    }, 2500);
  }, [onSubmitComplete]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const res = await CodingApi.submitCode({
        problemVersionId,
        language,
        sourceCode: code,
        practiceSessionId,
        assessmentSessionId,
      });
      const sub = res.data;
      if (!sub) return;
      setSubmissions((prev) => [sub, ...prev]);
      pollSubmission(sub.id);
      toast.success('Submission queued for evaluation');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [problemVersionId, language, code, practiceSessionId, assessmentSessionId, pollSubmission]);

  // Cleanup polling interval on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  return {
    problem,
    loadError,
    language,
    code,
    setCode,
    handleLanguageChange,
    handleRun,
    handleSubmit,
    isRunning,
    isSubmitting,
    isEvaluating,
    runResults,
    submissions,
    evaluation,
    remainingSeconds,
  };
}

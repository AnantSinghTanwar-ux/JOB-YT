'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { CodeEditor } from './CodeEditor';
import { CodingLanguage, ProblemVersion, RunResult, CodingSubmission, CodeEvaluation } from '@/types/coding';
import { cn } from '@/lib/utils';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { GripVertical, GripHorizontal, Loader2 } from 'lucide-react';

type RightTab = 'output' | 'tests' | 'history' | 'ai';

interface CodingIDELayoutProps {
  problem: ProblemVersion;
  language: CodingLanguage;
  onLanguageChange: (lang: CodingLanguage) => void;
  code: string;
  onCodeChange: (code: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  isRunning: boolean;
  isSubmitting: boolean;
  isEvaluating?: boolean;
  runResults: RunResult[];
  submissions: CodingSubmission[];
  evaluation: CodeEvaluation | null;
  remainingSeconds?: number | null;
  showSubmit?: boolean;
}

const LANG_LABELS: Record<CodingLanguage, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  java: 'Java',
  cpp: 'C++',
};

function formatTime(seconds: number | null | undefined) {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Custom Resize Handles to make it look clean
function CustomHorizontalResizeHandle() {
  return (
    <PanelResizeHandle className="w-2 bg-[#1a1a1a] hover:bg-slate-700 transition-colors cursor-col-resize flex flex-col justify-center items-center group">
      <div className="w-1 h-8 rounded-full bg-slate-600 group-hover:bg-slate-400 transition-colors" />
    </PanelResizeHandle>
  );
}

function CustomVerticalResizeHandle() {
  return (
    <PanelResizeHandle className="h-2 bg-[#1a1a1a] hover:bg-slate-700 transition-colors cursor-row-resize flex justify-center items-center group">
      <div className="h-1 w-8 rounded-full bg-slate-600 group-hover:bg-slate-400 transition-colors" />
    </PanelResizeHandle>
  );
}

export function CodingIDELayout({
  problem,
  language,
  onLanguageChange,
  code,
  onCodeChange,
  onRun,
  onSubmit,
  isRunning,
  isSubmitting,
  isEvaluating,
  runResults,
  submissions,
  evaluation,
  remainingSeconds,
  showSubmit = true,
}: CodingIDELayoutProps) {
  const [activeTab, setActiveTab] = useState<RightTab>('output');

  // Switch to AI tab only when evaluation *finishes* — track the previous state
  const [wasEvaluating, setWasEvaluating] = useState(false);

  useEffect(() => {
    if (isEvaluating) {
      setWasEvaluating(true);
    } else if (wasEvaluating) {
      // Evaluation just completed — now switch to AI tab
      setActiveTab('ai');
      setWasEvaluating(false);
    }
  }, [isEvaluating, wasEvaluating]);

  const tabs: { id: RightTab; label: string }[] = [
    { id: 'output', label: 'Output' },
    { id: 'tests', label: 'Test Results' },
    { id: 'history', label: 'Submissions' },
    { id: 'ai', label: 'AI Feedback' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#1a1a1a] overflow-hidden">
      {/* Toolbar - Dark Theme */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#111] border-b border-white/10">
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value as CodingLanguage)}
          className="bg-[#1a1a1a] text-white border border-white/20 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-white/40"
        >
          {problem.supported_languages.map((lang) => (
            <option key={lang} value={lang}>{LANG_LABELS[lang as CodingLanguage] || lang}</option>
          ))}
        </select>

        {remainingSeconds != null && (
          <Badge className="bg-orange-900/50 text-orange-300 border-orange-700 rounded-full px-3 py-1">
            {formatTime(remainingSeconds)}
          </Badge>
        )}

        <Badge className={cn(
          'rounded-full px-3 py-1 uppercase text-[10px] tracking-wider',
          problem.difficulty === 'easy' && 'bg-green-900/40 text-green-400 border-none',
          problem.difficulty === 'medium' && 'bg-yellow-900/40 text-yellow-400 border-none',
          problem.difficulty === 'hard' && 'bg-red-900/40 text-red-400 border-none',
        )}>
          {problem.difficulty}
        </Badge>

        <div className="flex-1" />

        <Button variant="outline" onClick={onRun} isLoading={isRunning} className="bg-transparent border border-white/20 text-white hover:bg-white/10 px-6 font-medium">
          Run
        </Button>
        {showSubmit && (
          <Button variant="brand" onClick={onSubmit} isLoading={isSubmitting} className="bg-[#1e2a4f] hover:bg-[#2a3863] text-white px-6 font-medium border-none">
            Submit
          </Button>
        )}
      </div>

      {/* Main Layout using react-resizable-panels */}
      <div className="flex flex-1 min-h-0 bg-[#f8f9fa]">
        <PanelGroup orientation="horizontal">
          
          {/* Left: Problem Description */}
          <Panel defaultSize={40} minSize={20} className="bg-[#fcfdfc] flex flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">{problem.title}</h2>
              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap mb-6 leading-relaxed">
                {problem.description}
              </div>
              
              {problem.constraints && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Constraints</h3>
                  <pre className="text-xs text-slate-600 whitespace-pre-wrap bg-slate-100/50 p-3 rounded-lg border border-slate-200">{problem.constraints}</pre>
                </div>
              )}
              
              {problem.hints && problem.hints.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Hints</h3>
                  <ul className="text-xs text-slate-600 list-disc pl-4 space-y-1">
                    {problem.hints.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              )}

              {problem.sample_cases && problem.sample_cases.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">Examples</h3>
                  {problem.sample_cases.map((ex, i) => (
                    <Card key={i} className="mb-3 bg-white border-slate-200 shadow-sm">
                      <CardBody className="p-4 text-xs">
                        <div><span className="font-semibold text-slate-800">Input:</span><pre className="mt-1.5 bg-slate-50 border border-slate-100 p-2.5 rounded text-slate-700">{ex.input}</pre></div>
                        <div className="mt-3"><span className="font-semibold text-slate-800">Output:</span><pre className="mt-1.5 bg-slate-50 border border-slate-100 p-2.5 rounded text-slate-700">{ex.expected_output}</pre></div>
                        {ex.explanation && <p className="mt-3 text-slate-600 leading-relaxed"><span className="font-semibold text-slate-800">Explanation:</span> {ex.explanation}</p>}
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          <CustomHorizontalResizeHandle />

          {/* Right: Split Vertically (Code Editor Top, Output Bottom) */}
          <Panel defaultSize={60} minSize={30} className="bg-[#0b1120] flex flex-col">
            <PanelGroup orientation="vertical">
              
              {/* Editor Pane */}
              <Panel defaultSize={70} minSize={20} className="flex flex-col">
                <div className="flex-1 min-h-0 relative">
                  <CodeEditor language={language} value={code} onChange={onCodeChange} height="100%" />
                </div>
              </Panel>

              <CustomVerticalResizeHandle />

              {/* Bottom Pane (Tabs) */}
              <Panel defaultSize={30} minSize={10} className="bg-white flex flex-col border-t border-slate-200">
                <div className="flex border-b border-slate-200 bg-slate-50/80 px-2 pt-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'px-4 py-2 text-[13px] font-semibold transition-colors relative',
                        activeTab === tab.id ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700',
                      )}
                    >
                      {tab.label}
                      {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-500 rounded-t-full" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 text-sm bg-white">
                  {activeTab === 'output' && (
                    <div className="space-y-3">
                      {runResults.length === 0 ? (
                        <p className="text-slate-500 text-sm italic">Run your code to see output</p>
                      ) : runResults.map((r, i) => (
                        <div key={i} className="border border-slate-200 rounded-lg p-3 shadow-sm">
                          <Badge className={r.passed ? 'bg-green-100 text-green-700 border-none' : 'bg-red-100 text-red-700 border-none'}>
                            {r.passed ? 'Passed' : 'Failed'}
                          </Badge>
                          {r.stdout && <pre className="mt-3 text-xs bg-slate-50 border border-slate-100 p-3 rounded-md whitespace-pre-wrap text-slate-800">{r.stdout}</pre>}
                          {r.stderr && <pre className="mt-3 text-xs bg-red-50 text-red-800 border border-red-100 p-3 rounded-md whitespace-pre-wrap">{r.stderr}</pre>}
                          {r.compileOutput && <pre className="mt-3 text-xs bg-yellow-50 text-yellow-800 border border-yellow-100 p-3 rounded-md whitespace-pre-wrap">{r.compileOutput}</pre>}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'tests' && (
                    <div className="space-y-2">
                      {runResults.length === 0 ? (
                        <p className="text-slate-500 text-sm italic">Test results appear after Run or Submit</p>
                      ) : runResults.map((r, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm p-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-100">
                          <span className={cn("flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white", r.passed ? 'bg-green-500' : 'bg-red-500')}>
                            {r.passed ? '✓' : '✗'}
                          </span>
                          <span className="font-medium text-slate-700">Test Case {i + 1}</span>
                          {r.time != null && <span className="text-slate-400 text-xs ml-auto bg-slate-100 px-2 py-0.5 rounded-full">{r.time}s</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'history' && (
                    <div className="space-y-3">
                      {submissions.length === 0 ? (
                        <p className="text-slate-500 text-sm italic">No submissions yet</p>
                      ) : submissions.map((s) => (
                        <div key={s.id} className="border border-slate-200 rounded-lg p-3 text-sm flex items-center justify-between shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                          <div>
                            <span className="font-semibold text-slate-800">Attempt #{s.attempt_number}</span>
                            {s.score != null && <p className="text-slate-500 text-xs mt-1">Score: <span className="font-medium text-slate-700">{s.score}%</span></p>}
                          </div>
                          <Badge className={s.passed ? 'bg-green-100 text-green-700 border-none' : s.passed === false ? 'bg-red-100 text-red-700 border-none' : 'bg-slate-100 text-slate-600 border-none'}>
                            {s.status === 'pending' || s.status === 'running' ? s.status : s.passed ? 'Accepted' : 'Rejected'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'ai' && (
                    <div className="space-y-4 text-sm max-w-3xl">
                      {isSubmitting || isEvaluating ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4">
                          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                          <p className="text-slate-500 italic">Please wait, your feedback is being prepared...</p>
                        </div>
                      ) : !evaluation ? (
                        <p className="text-slate-500 italic">
                          {submissions.length > 0 
                            ? "AI feedback could not be generated for this submission."
                            : "AI feedback available after submission completes"}
                        </p>
                      ) : (
                        <>
                          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                            <p className="text-indigo-800 text-xs flex items-center gap-2">
                              <span className="text-lg">✨</span> {evaluation.disclaimer || 'AI feedback is informational and does not affect pass/fail.'}
                            </p>
                          </div>
                          
                          {evaluation.overall_quality_score != null && (
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-slate-800">Quality Score:</span>
                              <Badge className={cn(
                                "border-none px-3 py-1",
                                evaluation.overall_quality_score >= 80 ? "bg-green-100 text-green-800" :
                                evaluation.overall_quality_score >= 50 ? "bg-yellow-100 text-yellow-800" :
                                "bg-red-100 text-red-800"
                              )}>
                                {evaluation.overall_quality_score} / 100
                              </Badge>
                            </div>
                          )}

                          <div className="grid gap-4 md:grid-cols-2 mt-4">
                            {evaluation.strengths?.length > 0 && (
                              <div className="bg-green-50/50 border border-green-100 rounded-lg p-4">
                                <h4 className="font-medium text-green-900 mb-2">Strengths</h4>
                                <ul className="list-disc list-inside text-green-800 space-y-1">
                                  {evaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                              </div>
                            )}
                            {evaluation.weaknesses?.length > 0 && (
                              <div className="bg-red-50/50 border border-red-100 rounded-lg p-4">
                                <h4 className="font-medium text-red-900 mb-2">Areas for Improvement</h4>
                                <ul className="list-disc list-inside text-red-800 space-y-1">
                                  {evaluation.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>

                          {evaluation.suggestions?.length > 0 && (
                            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 mt-4">
                              <h4 className="font-medium text-blue-900 mb-2">Suggestions</h4>
                              <ul className="list-disc list-inside text-blue-800 space-y-1">
                                {evaluation.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
